import { createHash } from "crypto";
import type { Pool, PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { getOrCreateLoyaltyProgram, levelFromLifetime } from "@/lib/db/loyalty";
import { pool } from "@/lib/db/pool";
import { newLoyaltyId } from "@/lib/loyalty/cards";
import { notifyGoogleWallet } from "@/lib/loyalty/google-wallet";
import {
  loyaltyPhoneLookupVariants,
  normalizeLoyaltyPhone,
  validLoyaltyPhone,
} from "@/lib/loyalty/profile-input";
import { grantPersonalLoyaltyPromo, isAnonymousLoyaltyPhone } from "@/lib/loyalty/validation";

/**
 * Fusion de fiches clientes confirmée par le personnel (fidélité).
 *
 * La fiche anonyme S (carte créée par le QR d'adhésion, téléphone « WL… ») est absorbée par la fiche
 * existante T du même institut. Décisions produit :
 *  - cas B (T a une carte) : la carte de T survit, la carte de S devient un ALIAS (status 'MERGED',
 *    mergedIntoCardId = carte de T, customerId = S inchangé, jamais supprimée : son jeton, son code court
 *    et ses passes Wallet continuent de fonctionner et résolvent vers la survivante) ;
 *  - cas A (T n'a pas de carte) : la carte de S est rattachée à T (customerId = T), jeton inchangé ;
 *  - passages additionnés ; une récompense est accordée UNE fois si la somme franchit un palier ;
 *  - consentements de T conservés, jamais élargis ; noms de T prioritaires ;
 *  - rien n'est supprimé : les lignes sont DÉPLACÉES, S est archivée (deletedAt) et le journal
 *    CustomerMerge garde chaque id déplacé avec son ancienne valeur (défusion possible, sans interface).
 */

export const MERGE_LOCK_TIMEOUT = "5s";

export function isLoyaltyMergeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.LOYALTY_MERGE_ENABLED?.trim().toLowerCase() === "on";
}

export type MergeErrorCode =
  | "MERGE_DISABLED"
  | "INVALID_INPUT"
  | "IDENTITY_NOT_CONFIRMED"
  | "NOT_FOUND"
  | "SAME_CUSTOMER"
  | "SOURCE_NOT_ANONYMOUS"
  | "ALREADY_MERGED"
  | "TARGET_MERGED"
  | "AMBIGUOUS_CARD"
  | "AMBIGUOUS_TARGET"
  | "STALE_PREVIEW"
  | "IDEMPOTENCY_CONFLICT"
  | "MERGE_IN_PROGRESS"
  | "CARD_INACTIVE"
  | "INVARIANT_VIOLATION";

const STATUS: Record<MergeErrorCode, number> = {
  MERGE_DISABLED: 404,
  INVALID_INPUT: 400,
  IDENTITY_NOT_CONFIRMED: 400,
  NOT_FOUND: 404,
  SAME_CUSTOMER: 409,
  SOURCE_NOT_ANONYMOUS: 409,
  ALREADY_MERGED: 409,
  TARGET_MERGED: 409,
  AMBIGUOUS_CARD: 409,
  AMBIGUOUS_TARGET: 409,
  STALE_PREVIEW: 409,
  IDEMPOTENCY_CONFLICT: 409,
  MERGE_IN_PROGRESS: 423,
  CARD_INACTIVE: 409,
  INVARIANT_VIOLATION: 500,
};

export class MergeError extends Error {
  readonly code: MergeErrorCode;
  readonly status: number;
  constructor(code: MergeErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = STATUS[code];
  }
}

export type MergeActor = { id: string | null; name: string | null };

type Db = Pick<Pool | PoolClient, "query">;

// ---------------------------------------------------------------------------------------------
// Tables déplacées
// ---------------------------------------------------------------------------------------------

type MoveSpec = {
  key: string;
  table: string;
  /** Colonne portant l'identifiant de la fiche. */
  column: string;
  /** La ligne référence aussi la carte : elle est repointée vers la carte survivante. */
  card?: boolean;
  /** La ligne référence aussi le compte de points : elle est repointée vers le compte de T. */
  account?: boolean;
};

/**
 * Tables portant un identifiant de fiche et simplement DÉPLACÉES (UPDATE, jamais copie ni suppression).
 * Liste établie à partir de prisma/schema.prisma et des migrations (colonnes avec ou sans clé étrangère).
 * Tables à unicité traitées à part : LoyaltyAccount, NotificationPreference, CampaignRecipient,
 * WebPushSubscription, PushAccessGrant, LoyaltyCard.
 */
export const MOVE_SPECS: readonly MoveSpec[] = [
  { key: "Appointment", table: "Appointment", column: "customerId" },
  { key: "Payment", table: "Payment", column: "customerId" },
  { key: "Invoice", table: "Invoice", column: "customerId" },
  { key: "PosSale", table: "PosSale", column: "customerId" },
  { key: "CustomerNote", table: "CustomerNote", column: "customerId" },
  { key: "Package", table: "Package", column: "customerId" },
  { key: "LoyaltyEvent", table: "LoyaltyEvent", column: "customerId", card: true },
  { key: "LoyaltyVisitReward", table: "LoyaltyVisitReward", column: "customerId", card: true },
  { key: "GoogleWalletMessage", table: "GoogleWalletMessage", column: "customerId", card: true },
  { key: "PromotionUsage", table: "PromotionUsage", column: "customerId" },
  { key: "WhatsAppTask", table: "WhatsAppTask", column: "customerId" },
  { key: "ReactivationSnooze", table: "ReactivationSnooze", column: "customerId" },
  { key: "WaitingListEntry", table: "WaitingListEntry", column: "customerId" },
  { key: "ReviewRequest", table: "ReviewRequest", column: "customerId" },
  { key: "Review", table: "Review", column: "customerId" },
  { key: "CustomerPushDelivery", table: "CustomerPushDelivery", column: "customerId" },
  { key: "AssistantCustomerSession", table: "AssistantCustomerSession", column: "customerId" },
  { key: "AssistantAction", table: "AssistantAction", column: "customerId" },
  { key: "GiftCard.buyer", table: "GiftCard", column: "buyerCustomerId" },
  { key: "GiftCard.beneficiary", table: "GiftCard", column: "beneficiaryCustomerId" },
  // Colonnes sans clé étrangère
  { key: "LoyaltyTransaction", table: "LoyaltyTransaction", column: "customerId", account: true },
  { key: "Promotion", table: "Promotion", column: "customerId" },
  { key: "LoyaltyRedemption", table: "LoyaltyRedemption", column: "customerId", account: true },
];

// ---------------------------------------------------------------------------------------------
// Règles métier pures (testables sans base)
// ---------------------------------------------------------------------------------------------

export type CumulativeRewardPlan = {
  totalVisits: number;
  cycle: number;
  remaining: number;
  /** floor((a+b)/N) - floor(a/N) - floor(b/N) : au plus 1. */
  crossings: number;
  create: boolean;
  reason: "NONE" | "CROSSING" | "STACK_BLOCKED" | "PROGRAM_INACTIVE";
};

export function planCumulativeReward(input: {
  sourceVisits: number;
  targetVisits: number;
  visitsPerReward: number;
  stackRewards: boolean;
  programActive: boolean;
  /** Récompenses AVAILABLE non expirées présentes sur les deux fiches avant fusion. */
  openRewards: number;
}): CumulativeRewardPlan {
  const n = Math.max(1, Math.floor(input.visitsPerReward));
  const a = Math.max(0, Math.floor(input.sourceVisits));
  const b = Math.max(0, Math.floor(input.targetVisits));
  const total = a + b;
  const crossings = Math.floor(total / n) - Math.floor(a / n) - Math.floor(b / n);
  const cycle = ((total % n) + n) % n;
  const remaining = cycle === 0 ? n : n - cycle;
  let create = false;
  let reason: CumulativeRewardPlan["reason"] = "NONE";
  if (crossings >= 1) {
    if (!input.programActive) reason = "PROGRAM_INACTIVE";
    else if (!input.stackRewards && input.openRewards > 0) reason = "STACK_BLOCKED";
    else {
      create = true;
      reason = "CROSSING";
    }
  }
  return { totalVisits: total, cycle, remaining, crossings, create, reason };
}

/** Prochain compte T : points additionnés, niveau recalculé par l'appelant. */
export function mergeAccountTotals(
  source: { balance: number; lifetimePoints: number } | null,
  target: { balance: number; lifetimePoints: number },
) {
  return {
    balance: target.balance + (source?.balance ?? 0),
    lifetimePoints: target.lifetimePoints + (source?.lifetimePoints ?? 0),
    transferred: source?.balance ?? 0,
  };
}

export function mergeFingerprint(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

// ---------------------------------------------------------------------------------------------
// Lectures (aperçu)
// ---------------------------------------------------------------------------------------------

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  mergedIntoCustomerId: string | null;
};

type CardRow = {
  id: string;
  customerId: string;
  publicToken: string;
  status: string;
  mergedIntoCardId: string | null;
  createdAt: Date;
};

const CUSTOMER_COLUMNS = `c.id, c."firstName", c."lastName", c.phone, c.email, c.status::text AS status, c.notes,
  c."createdAt", c."updatedAt", c."deletedAt", c."mergedIntoCustomerId"`;

async function loadCustomer(db: Db, organizationId: string, id: string): Promise<CustomerRow | null> {
  const { rows } = await db.query<CustomerRow>(
    `SELECT ${CUSTOMER_COLUMNS} FROM "Customer" c WHERE c.id = $1 AND c."organizationId" = $2`,
    [id, organizationId],
  );
  return rows[0] ?? null;
}

async function loadCardOf(db: Db, organizationId: string, customerId: string): Promise<CardRow | null> {
  const { rows } = await db.query<CardRow>(
    `SELECT id, "customerId", "publicToken", status, "mergedIntoCardId", "createdAt"
     FROM "LoyaltyCard" WHERE "organizationId" = $1 AND "customerId" = $2`,
    [organizationId, customerId],
  );
  return rows[0] ?? null;
}

export type SourceInput = { sourceCardToken?: string; sourceCustomerId?: string };

const FULL_TOKEN = /RBLOY_[A-Z2-9]{8,32}/;

async function findSource(
  db: Db,
  organizationId: string,
  input: SourceInput,
): Promise<{ customer: CustomerRow; card: CardRow | null }> {
  let customerId = input.sourceCustomerId?.trim() ?? "";
  if (!customerId) {
    const raw = (input.sourceCardToken ?? "").trim().toUpperCase();
    if (!raw) throw new MergeError("INVALID_INPUT", "Carte ou fiche source manquante.");
    const full = raw.match(FULL_TOKEN);
    let cards: { customerId: string }[];
    if (full) {
      cards = (
        await db.query<{ customerId: string }>(
          `SELECT "customerId" FROM "LoyaltyCard"
           WHERE "organizationId" = $1 AND "publicToken" = $2 AND status IN ('ACTIVE', 'MERGED')`,
          [organizationId, full[0]],
        )
      ).rows;
    } else {
      const suffix = raw.replace(/^CLIENTE\s+/, "").replace(/[^A-Z2-9]/g, "");
      if (suffix.length < 4 || suffix.length > 12) throw new MergeError("NOT_FOUND", "Carte introuvable.");
      cards = (
        await db.query<{ customerId: string }>(
          `SELECT DISTINCT "customerId" FROM "LoyaltyCard"
           WHERE "organizationId" = $1 AND status IN ('ACTIVE', 'MERGED') AND "publicToken" LIKE $2
           LIMIT 2`,
          [organizationId, `%${suffix}`],
        )
      ).rows;
    }
    if (cards.length > 1) throw new MergeError("AMBIGUOUS_CARD", "Plusieurs cartes correspondent.");
    if (!cards[0]) throw new MergeError("NOT_FOUND", "Carte introuvable pour cet institut.");
    customerId = cards[0].customerId;
  }
  const customer = await loadCustomer(db, organizationId, customerId);
  if (!customer) throw new MergeError("NOT_FOUND", "Fiche introuvable pour cet institut.");
  if (customer.mergedIntoCustomerId) throw new MergeError("ALREADY_MERGED", "Cette fiche a déjà été fusionnée.");
  if (customer.deletedAt) throw new MergeError("NOT_FOUND", "Fiche introuvable pour cet institut.");
  if (!isAnonymousLoyaltyPhone(customer.phone)) {
    throw new MergeError("SOURCE_NOT_ANONYMOUS", "Seule une fiche anonyme (créée par le QR d'adhésion) peut être fusionnée.");
  }
  return { customer, card: await loadCardOf(db, organizationId, customer.id) };
}

async function findTargetsByPhone(
  db: Db,
  organizationId: string,
  variants: string[],
  excludeId: string,
): Promise<CustomerRow[]> {
  if (variants.length === 0) return [];
  const { rows } = await db.query<CustomerRow>(
    `SELECT ${CUSTOMER_COLUMNS} FROM "Customer" c
     WHERE c."organizationId" = $1 AND c.phone = ANY($2::text[]) AND c.id <> $3
       AND c."mergedIntoCustomerId" IS NULL
     ORDER BY (c."deletedAt" IS NULL) DESC, c."createdAt" ASC, c.id ASC
     LIMIT 3`,
    [organizationId, variants, excludeId],
  );
  return rows;
}

type ProgramView = {
  visitsPerReward: number;
  stackRewards: boolean;
  active: boolean;
  rewardLabel: string;
  rewardKind: "FREE_SERVICE" | "DISCOUNT" | "PERCENTAGE";
  rewardValue: number | null;
  rewardValidityDays: number;
  levels: { bronzeMin: number; silverMin: number; goldMin: number; vipMin: number };
};

async function loadProgram(organizationId: string): Promise<ProgramView> {
  const p = await getOrCreateLoyaltyProgram(organizationId);
  return {
    visitsPerReward: p.visitsPerReward,
    stackRewards: p.stackRewards,
    active: p.active,
    rewardLabel: p.rewardLabel,
    rewardKind: p.rewardKind,
    rewardValue: p.rewardValue,
    rewardValidityDays: p.rewardValidityDays,
    levels: { bronzeMin: p.bronzeMin, silverMin: p.silverMin, goldMin: p.goldMin, vipMin: p.vipMin },
  };
}

type SideStats = {
  appointmentsCount: number;
  lastAppointmentAt: string | null;
  activeAppointments: number;
  salesCount: number;
  salesTotal: number;
  notesCount: number;
  activePackages: number;
  balance: number;
  lifetimePoints: number;
  level: string | null;
  cardsCount: number;
  visits: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  rewardsExpired: number;
  walletInstalled: boolean;
};

async function loadSideStats(db: Db, organizationId: string, customerId: string, cardId: string | null): Promise<SideStats> {
  const { rows } = await db.query<{
    appointmentsCount: number;
    lastAppointmentAt: Date | null;
    activeAppointments: number;
    salesCount: number;
    salesTotal: string;
    notesCount: number;
    activePackages: number;
    balance: number | null;
    lifetimePoints: number | null;
    level: string | null;
    cardsCount: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM "Appointment" a WHERE a."organizationId" = $1 AND a."customerId" = $2) AS "appointmentsCount",
       (SELECT MAX(a."startAt") FROM "Appointment" a WHERE a."organizationId" = $1 AND a."customerId" = $2) AS "lastAppointmentAt",
       (SELECT COUNT(*)::int FROM "Appointment" a WHERE a."organizationId" = $1 AND a."customerId" = $2
          AND a.status::text IN ('IN_PROGRESS', 'ARRIVED')) AS "activeAppointments",
       (SELECT COUNT(*)::int FROM "PosSale" s WHERE s."organizationId" = $1 AND s."customerId" = $2) AS "salesCount",
       (SELECT COALESCE(SUM(s.total), 0)::text FROM "PosSale" s
          WHERE s."organizationId" = $1 AND s."customerId" = $2 AND s.status::text = 'COMPLETED') AS "salesTotal",
       (SELECT COUNT(*)::int FROM "CustomerNote" n
          WHERE n."organizationId" = $1 AND n."customerId" = $2 AND n."deletedAt" IS NULL) AS "notesCount",
       (SELECT COUNT(*)::int FROM "Package" p
          WHERE p."organizationId" = $1 AND p."customerId" = $2 AND p.status::text = 'ACTIVE') AS "activePackages",
       (SELECT la.balance FROM "LoyaltyAccount" la WHERE la."organizationId" = $1 AND la."customerId" = $2) AS balance,
       (SELECT la."lifetimePoints" FROM "LoyaltyAccount" la WHERE la."organizationId" = $1 AND la."customerId" = $2) AS "lifetimePoints",
       (SELECT la.level::text FROM "LoyaltyAccount" la WHERE la."organizationId" = $1 AND la."customerId" = $2) AS level,
       (SELECT COUNT(*)::int FROM "LoyaltyCard" lc WHERE lc."organizationId" = $1 AND lc."customerId" = $2) AS "cardsCount"`,
    [organizationId, customerId],
  );
  const row = rows[0];
  let visits = 0;
  let available = 0;
  let redeemed = 0;
  let expired = 0;
  let wallet = false;
  if (cardId) {
    const events = await db.query<{ visits: string }>(
      `SELECT COALESCE(SUM(points) FILTER (WHERE type = 'VISIT'), 0)::text AS visits
       FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1`,
      [cardId],
    );
    visits = Number(events.rows[0]?.visits ?? 0);
    const rewards = await db.query<{ available: number; redeemed: number; expired: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'AVAILABLE' AND ("expiresAt" IS NULL OR "expiresAt" > NOW()))::int AS available,
              COUNT(*) FILTER (WHERE status = 'REDEEMED')::int AS redeemed,
              COUNT(*) FILTER (WHERE status = 'EXPIRED' OR (status = 'AVAILABLE' AND "expiresAt" <= NOW()))::int AS expired
       FROM "LoyaltyVisitReward" WHERE "loyaltyCardId" = $1`,
      [cardId],
    );
    available = rewards.rows[0]?.available ?? 0;
    redeemed = rewards.rows[0]?.redeemed ?? 0;
    expired = rewards.rows[0]?.expired ?? 0;
    const installed = await db.query<{ installed: boolean }>(
      `SELECT (
         EXISTS (SELECT 1 FROM "AppleWalletPass" p JOIN "AppleWalletRegistration" r ON r."passId" = p.id
                 WHERE p."loyaltyCardId" = $1)
         OR EXISTS (SELECT 1 FROM "GoogleWalletMessage" m WHERE m."loyaltyCardId" = $1 AND m.status = 'SENT')
       ) AS installed`,
      [cardId],
    );
    wallet = Boolean(installed.rows[0]?.installed);
  }
  return {
    appointmentsCount: row?.appointmentsCount ?? 0,
    lastAppointmentAt: row?.lastAppointmentAt ? row.lastAppointmentAt.toISOString() : null,
    activeAppointments: row?.activeAppointments ?? 0,
    salesCount: row?.salesCount ?? 0,
    salesTotal: Number(row?.salesTotal ?? 0),
    notesCount: row?.notesCount ?? 0,
    activePackages: row?.activePackages ?? 0,
    balance: row?.balance ?? 0,
    lifetimePoints: row?.lifetimePoints ?? 0,
    level: row?.level ?? null,
    cardsCount: row?.cardsCount ?? 0,
    visits,
    rewardsAvailable: available,
    rewardsRedeemed: redeemed,
    rewardsExpired: expired,
    walletInstalled: wallet,
  };
}

async function movedCounts(db: Db, organizationId: string, sourceId: string): Promise<Record<string, number>> {
  const parts = MOVE_SPECS.map(
    (spec) =>
      `SELECT '${spec.key}' AS key, COUNT(*)::int AS n FROM "${spec.table}"
       WHERE "organizationId" = $1 AND "${spec.column}" = $2${
         spec.table === "LoyaltyTransaction" ? ` AND "idempotencyKey" NOT LIKE 'merge:%'` : ""
       }`,
  );
  const { rows } = await db.query<{ key: string; n: number }>(parts.join("\nUNION ALL\n"), [organizationId, sourceId]);
  return Object.fromEntries(rows.map((row) => [row.key, row.n]));
}

/**
 * Empreinte de l'état des deux fiches : si quoi que ce soit change entre l'aperçu et la confirmation
 * (modification de fiche, passage, rendez-vous, récompense, points), la fusion est refusée (STALE_PREVIEW).
 */
export async function computePreviewVersion(
  db: Db,
  organizationId: string,
  sourceId: string,
  targetId: string,
): Promise<string> {
  const ids = [sourceId, targetId];
  const { rows } = await db.query<Record<string, string>>(
    `SELECT
       (SELECT COALESCE(string_agg(c.id || '|' || c."updatedAt"::text || '|' || c.status::text || '|' || c.phone || '|' ||
                 COALESCE(c."deletedAt"::text, '') || '|' || COALESCE(c."mergedIntoCustomerId", ''), ';' ORDER BY c.id), '')
          FROM "Customer" c WHERE c."organizationId" = $1 AND c.id = ANY($2::text[])) AS customers,
       (SELECT COALESCE(string_agg(lc.id || '|' || lc."customerId" || '|' || lc.status || '|' ||
                 COALESCE(lc."mergedIntoCardId", ''), ';' ORDER BY lc.id), '')
          FROM "LoyaltyCard" lc WHERE lc."organizationId" = $1 AND lc."customerId" = ANY($2::text[])) AS cards,
       (SELECT COALESCE(string_agg(e."customerId" || '|' || e.n || '|' || e.pts || '|' || e.last, ';' ORDER BY e."customerId"), '')
          FROM (SELECT "customerId", COUNT(*) AS n, COALESCE(SUM(points), 0) AS pts, COALESCE(MAX("validatedAt")::text, '') AS last
                  FROM "LoyaltyEvent" WHERE "organizationId" = $1 AND "customerId" = ANY($2::text[])
                  GROUP BY "customerId") e) AS events,
       (SELECT COALESCE(string_agg(a."customerId" || '|' || a.n || '|' || a.last, ';' ORDER BY a."customerId"), '')
          FROM (SELECT "customerId", COUNT(*) AS n, COALESCE(MAX("updatedAt")::text, '') AS last
                  FROM "Appointment" WHERE "organizationId" = $1 AND "customerId" = ANY($2::text[])
                  GROUP BY "customerId") a) AS appointments,
       (SELECT COALESCE(string_agg(r."customerId" || '|' || r.status || '|' || r.n, ';' ORDER BY r."customerId", r.status), '')
          FROM (SELECT "customerId", status, COUNT(*) AS n FROM "LoyaltyVisitReward"
                  WHERE "organizationId" = $1 AND "customerId" = ANY($2::text[])
                  GROUP BY "customerId", status) r) AS rewards,
       (SELECT COALESCE(string_agg(la."customerId" || '|' || la.balance || '|' || la."lifetimePoints", ';' ORDER BY la."customerId"), '')
          FROM "LoyaltyAccount" la WHERE la."organizationId" = $1 AND la."customerId" = ANY($2::text[])
            AND (la.balance <> 0 OR la."lifetimePoints" <> 0)) AS accounts`,
    [organizationId, ids],
  );
  return mergeFingerprint({ s: sourceId, t: targetId, ...rows[0] });
}

// ---------------------------------------------------------------------------------------------
// Aperçu
// ---------------------------------------------------------------------------------------------

export type MergeAlert = { code: string; message: string };

function publicCustomer(row: CustomerRow) {
  return {
    customerId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    archived: row.deletedAt != null || row.status === "ARCHIVED",
  };
}

export type MergePreview =
  | {
      mode: "assign";
      canonicalPhone: string;
      source: ReturnType<typeof publicCustomer> & { cardCode: string | null; visits: number };
    }
  | {
      mode: "merge";
      canonicalPhone: string;
      previewVersion: string;
      source: ReturnType<typeof publicCustomer> &
        SideStats & { cardId: string | null; cardCode: string | null; cardCreatedAt: string | null };
      target: ReturnType<typeof publicCustomer> &
        SideStats & { cardId: string | null; cardCode: string | null };
      result: {
        totalVisits: number;
        cycle: number;
        visitsPerReward: number;
        remaining: number;
        cumulativeReward: boolean;
        cumulativeRewardReason: CumulativeRewardPlan["reason"];
        pointsTransferred: number;
        cardMode: "ALIAS" | "ATTACHED" | "NONE";
        moved: Record<string, number>;
        staying: { item: string; count: number; reason: string }[];
      };
      alerts: MergeAlert[];
    };

function shortCode(token: string | null | undefined): string | null {
  return token ? token.slice(-4) : null;
}

export function normalizeMergePhone(phone: unknown): { canonical: string; variants: string[] } {
  if (typeof phone !== "string" || !phone.trim() || !validLoyaltyPhone(phone)) {
    throw new MergeError("INVALID_INPUT", "Indiquez un numéro de téléphone valide.");
  }
  const canonical = normalizeLoyaltyPhone(phone);
  return { canonical, variants: loyaltyPhoneLookupVariants(canonical) };
}

export async function previewMerge(
  organizationId: string,
  input: SourceInput & { phone: string },
  db: Db = pool,
): Promise<MergePreview> {
  const { canonical, variants } = normalizeMergePhone(input.phone);
  const source = await findSource(db, organizationId, input);
  const targets = await findTargetsByPhone(db, organizationId, variants, source.customer.id);

  const sourceCard = source.card?.status === "ACTIVE" ? source.card : null;
  if (targets.length === 0) {
    const stats = await loadSideStats(db, organizationId, source.customer.id, sourceCard?.id ?? null);
    return {
      mode: "assign",
      canonicalPhone: canonical,
      source: { ...publicCustomer(source.customer), cardCode: shortCode(sourceCard?.publicToken), visits: stats.visits },
    };
  }
  // Plusieurs fiches pour le même numéro (formats différents) : le personnel doit d'abord les nettoyer.
  const active = targets.filter((row) => row.deletedAt == null);
  if (targets.length > 1 && active.length !== 1) {
    throw new MergeError("AMBIGUOUS_TARGET", "Plusieurs fiches correspondent à ce numéro. Corrigez les doublons avant de fusionner.");
  }
  const target = active.length === 1 ? active[0] : targets[0];

  const [program, targetCardRow] = await Promise.all([loadProgram(organizationId), loadCardOf(db, organizationId, target.id)]);
  const targetCard = targetCardRow?.status === "ACTIVE" ? targetCardRow : null;
  const [sStats, tStats, moved, previewVersion] = await Promise.all([
    loadSideStats(db, organizationId, source.customer.id, sourceCard?.id ?? null),
    loadSideStats(db, organizationId, target.id, targetCard?.id ?? null),
    movedCounts(db, organizationId, source.customer.id),
    computePreviewVersion(db, organizationId, source.customer.id, target.id),
  ]);

  const plan = planCumulativeReward({
    sourceVisits: sStats.visits,
    targetVisits: tStats.visits,
    visitsPerReward: program.visitsPerReward,
    stackRewards: program.stackRewards,
    programActive: program.active,
    openRewards: sStats.rewardsAvailable + tStats.rewardsAvailable,
  });

  const staying: { item: string; count: number; reason: string }[] = [];
  const prefs = await db.query<{ ofSource: number; ofTarget: number; conflicts: number; subs: number; grants: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM "NotificationPreference" WHERE "organizationId" = $1 AND "customerId" = $2) AS "ofSource",
       (SELECT COUNT(*)::int FROM "NotificationPreference" WHERE "organizationId" = $1 AND "customerId" = $3) AS "ofTarget",
       (SELECT COUNT(*)::int FROM "CampaignRecipient" r JOIN "Campaign" k ON k.id = r."campaignId"
          WHERE k."organizationId" = $1 AND r."customerId" = $2
            AND EXISTS (SELECT 1 FROM "CampaignRecipient" x WHERE x."campaignId" = r."campaignId" AND x."customerId" = $3)) AS conflicts,
       (SELECT COUNT(*)::int FROM "WebPushSubscription" WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL) AS subs,
       (SELECT COUNT(*)::int FROM "PushAccessGrant" WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL) AS grants`,
    [organizationId, source.customer.id, target.id],
  );
  const counts = prefs.rows[0];
  if (counts && counts.ofSource > 0 && counts.ofTarget > 0) {
    staying.push({ item: "NotificationPreference", count: counts.ofSource, reason: "Les préférences de la fiche existante sont conservées." });
  }
  if (counts && counts.conflicts > 0) {
    staying.push({ item: "CampaignRecipient", count: counts.conflicts, reason: "La fiche existante figure déjà dans la campagne." });
  }
  if (counts && counts.grants > 0) {
    staying.push({ item: "PushAccessGrant", count: counts.grants, reason: "Autorisations de notification révoquées (jamais transférées)." });
  }
  staying.push({ item: "LoyaltyAccount", count: 1, reason: "Compte de points de la fiche absorbée remis à zéro (non supprimé)." });
  if (sourceCard && targetCard) {
    staying.push({ item: "LoyaltyCard", count: 1, reason: "La carte absorbée devient un alias : son jeton et son code continuent de fonctionner." });
  }

  const alerts: MergeAlert[] = [];
  if (target.phone !== canonical) {
    alerts.push({ code: "PHONE_FORMAT_VARIANT", message: "Le numéro de la fiche existante est enregistré dans un autre format." });
  }
  if (target.deletedAt != null || target.status === "ARCHIVED") {
    alerts.push({ code: "TARGET_ARCHIVED", message: "La fiche existante est archivée." });
  }
  if (sStats.activeAppointments + tStats.activeAppointments > 0) {
    alerts.push({ code: "APPOINTMENT_IN_PROGRESS", message: "Un rendez-vous est arrivé ou en cours : vérifiez avant de fusionner." });
  }
  if (!program.stackRewards && sStats.rewardsAvailable > 0 && tStats.rewardsAvailable > 0) {
    alerts.push({
      code: "TWO_REWARDS_NO_STACK",
      message: "Les deux fiches ont une récompense disponible alors que le cumul des récompenses est désactivé.",
    });
  }
  if (plan.reason === "STACK_BLOCKED") {
    alerts.push({ code: "CUMULATIVE_REWARD_BLOCKED", message: "Le cumul franchit un palier mais une récompense est déjà disponible (cumul désactivé)." });
  }
  if (!targetCard && sourceCard) {
    alerts.push({ code: "TARGET_HAS_NO_CARD", message: "La fiche existante n'a pas de carte : la carte de la fiche anonyme lui sera rattachée." });
  }

  return {
    mode: "merge",
    canonicalPhone: canonical,
    previewVersion,
    source: {
      ...publicCustomer(source.customer),
      ...sStats,
      cardId: sourceCard?.id ?? null,
      cardCode: shortCode(sourceCard?.publicToken),
      cardCreatedAt: sourceCard ? sourceCard.createdAt.toISOString() : null,
    },
    target: {
      ...publicCustomer(target),
      ...tStats,
      cardId: targetCard?.id ?? null,
      cardCode: shortCode(targetCard?.publicToken),
    },
    result: {
      totalVisits: plan.totalVisits,
      cycle: plan.cycle,
      visitsPerReward: program.visitsPerReward,
      remaining: plan.remaining,
      cumulativeReward: plan.create,
      cumulativeRewardReason: plan.reason,
      pointsTransferred: sStats.balance,
      cardMode: sourceCard ? (targetCard ? "ALIAS" : "ATTACHED") : "NONE",
      moved: Object.fromEntries(Object.entries(moved).filter(([, n]) => n > 0)),
      staying,
    },
    alerts,
  };
}

// ---------------------------------------------------------------------------------------------
// Transaction commune
// ---------------------------------------------------------------------------------------------

function pgCode(error: unknown): string {
  return typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
}

function pgConstraint(error: unknown): string {
  return typeof error === "object" && error && "constraint" in error ? String((error as { constraint: unknown }).constraint) : "";
}

/** Verrou non obtenu / interblocage : « une fusion est en cours, réessayez ». */
function translateLockError(error: unknown): unknown {
  const code = pgCode(error);
  if (code === "55P03" || code === "40P01" || code === "40001") {
    return new MergeError("MERGE_IN_PROGRESS", "Une fusion est en cours, réessayez dans un instant.");
  }
  return error;
}

async function begin(client: PoolClient, organizationId: string) {
  await client.query("BEGIN");
  await client.query(`SET LOCAL lock_timeout = '${MERGE_LOCK_TIMEOUT}'`);
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('loyalty-merge:' || $1::text))`, [organizationId]);
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    /* la connexion est peut-être déjà fermée : l'erreur d'origine prime */
  }
}

// ---------------------------------------------------------------------------------------------
// Attribution d'un numéro à une fiche anonyme (numéro libre)
// ---------------------------------------------------------------------------------------------

export type AssignResult =
  | { mode: "assigned"; customerId: string; phone: string; cardCode: string | null }
  | { mode: "merge"; preview: MergePreview };

const NAME_MAX = 80;

function cleanName(value: unknown, label: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new MergeError("INVALID_INPUT", `${label} invalide.`);
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length > NAME_MAX) throw new MergeError("INVALID_INPUT", `${label} trop long.`);
  return cleaned || null;
}

/**
 * Numéro libre : renseigne le téléphone (et le nom) de la fiche anonyme au lieu de fusionner.
 * Atomique avec son audit. Si une autre fiche porte déjà ce numéro, y compris par une course (23505),
 * bascule vers l'aperçu de fusion.
 */
export async function assignPhoneToCard(
  organizationId: string,
  actor: MergeActor,
  input: SourceInput & { phone: string; firstName?: unknown; lastName?: unknown },
): Promise<AssignResult> {
  const { canonical, variants } = normalizeMergePhone(input.phone);
  const firstName = cleanName(input.firstName, "Prénom");
  const lastName = cleanName(input.lastName, "Nom");
  const source = await findSource(pool, organizationId, input);
  const client = await pool.connect();
  let committed = false;
  let fallbackToPreview = false;
  let assigned: AssignResult | null = null;
  try {
    await begin(client, organizationId);
    const locked = await client.query<{ id: string; phone: string; firstName: string; lastName: string }>(
      `SELECT id, phone, "firstName", "lastName" FROM "Customer"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL AND "mergedIntoCustomerId" IS NULL
       FOR UPDATE`,
      [source.customer.id, organizationId],
    );
    const current = locked.rows[0];
    if (!current) throw new MergeError("NOT_FOUND", "Fiche introuvable pour cet institut.");
    if (!isAnonymousLoyaltyPhone(current.phone)) {
      throw new MergeError("SOURCE_NOT_ANONYMOUS", "Cette fiche a déjà un numéro.");
    }
    const taken = await client.query(
      `SELECT 1 FROM "Customer" WHERE "organizationId" = $1 AND id <> $2 AND phone = ANY($3::text[]) LIMIT 1`,
      [organizationId, current.id, variants],
    );
    if (taken.rows.length > 0) {
      fallbackToPreview = true;
    } else {
      await client.query(
        `UPDATE "Customer"
         SET phone = $3, "firstName" = COALESCE($4, "firstName"), "lastName" = COALESCE($5, "lastName"), "updatedAt" = NOW()
         WHERE id = $1 AND "organizationId" = $2`,
        [current.id, organizationId, canonical, firstName, lastName],
      );
      await writeAuditLog({
        organizationId,
        actorId: actor.id,
        actorName: actor.name,
        entityType: "Customer",
        entityId: current.id,
        action: "LOYALTY_PHONE_ASSIGNED",
        before: { anonymous: true },
        after: { anonymous: false, nameUpdated: Boolean(firstName || lastName) },
        client,
      });
      await client.query("COMMIT");
      committed = true;
      assigned = { mode: "assigned", customerId: current.id, phone: canonical, cardCode: shortCode(source.card?.publicToken) };
    }
  } catch (error) {
    if (!committed) await rollbackQuietly(client);
    // Même numéro enregistré en parallèle : l'index unique (organizationId, phone) tranche, on propose la fusion.
    if (pgCode(error) === "23505") fallbackToPreview = true;
    else throw translateLockError(error);
  } finally {
    client.release();
  }
  if (assigned) return assigned;
  void fallbackToPreview;
  return { mode: "merge", preview: await previewMerge(organizationId, { sourceCustomerId: source.customer.id, phone: canonical }) };
}

// ---------------------------------------------------------------------------------------------
// Fusion
// ---------------------------------------------------------------------------------------------

export type MergeInput = {
  sourceCustomerId: string;
  targetCustomerId: string;
  idempotencyKey: string;
  previewVersion: string;
  identityConfirmed: boolean;
};

export type MergeResult = {
  mergeId: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  sourceCardId: string | null;
  targetCardId: string | null;
  survivingCardId: string | null;
  cardMode: "ALIAS" | "ATTACHED" | "NONE";
  totalVisits: number;
  cycle: number;
  visitsPerReward: number;
  cumulativeRewardId: string | null;
  pointsTransferred: number;
  moved: Record<string, number>;
  createdAt: string;
  /** Vrai si la réponse est celle d'une fusion déjà enregistrée (même clé ou fiche déjà fusionnée). */
  replayed: boolean;
};

type MovedLog = Record<string, unknown>;

function ensureId(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{1,80}$/.test(value)) {
    throw new MergeError("INVALID_INPUT", `${label} invalide.`);
  }
  return value;
}

async function storedResult(
  client: Db,
  organizationId: string,
  where: { idempotencyKey?: string; sourceCustomerId?: string },
): Promise<{ id: string; sourceCustomerId: string; targetCustomerId: string; response: MergeResult | null } | null> {
  const { rows } = await client.query<{
    id: string;
    sourceCustomerId: string;
    targetCustomerId: string;
    stats: { response?: MergeResult } | null;
  }>(
    where.idempotencyKey
      ? `SELECT id, "sourceCustomerId", "targetCustomerId", stats FROM "CustomerMerge"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`
      : `SELECT id, "sourceCustomerId", "targetCustomerId", stats FROM "CustomerMerge"
         WHERE "organizationId" = $1 AND "sourceCustomerId" = $2 AND status = 'COMPLETED'`,
    [organizationId, where.idempotencyKey ?? where.sourceCustomerId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    sourceCustomerId: row.sourceCustomerId,
    targetCustomerId: row.targetCustomerId,
    response: row.stats?.response ?? null,
  };
}

export async function mergeCustomers(
  organizationId: string,
  actor: MergeActor,
  input: MergeInput,
): Promise<MergeResult> {
  const sourceId = ensureId(input.sourceCustomerId, "Fiche source");
  const targetId = ensureId(input.targetCustomerId, "Fiche existante");
  const idempotencyKey = ensureId(input.idempotencyKey, "Clé d'idempotence");
  if (typeof input.previewVersion !== "string" || !/^[0-9a-f]{64}$/.test(input.previewVersion)) {
    throw new MergeError("INVALID_INPUT", "Version d'aperçu invalide.");
  }
  if (input.identityConfirmed !== true) {
    throw new MergeError("IDENTITY_NOT_CONFIRMED", "Confirmez l'identité de la cliente avant de fusionner.");
  }
  if (sourceId === targetId) throw new MergeError("SAME_CUSTOMER", "Les deux fiches sont identiques.");

  const program = await loadProgram(organizationId);
  const client = await pool.connect();
  let committed = false;
  try {
    await begin(client, organizationId);
    const outcome = await runMerge(client, organizationId, actor, { sourceId, targetId, idempotencyKey, previewVersion: input.previewVersion }, program);
    await client.query("COMMIT");
    committed = true;
    if (outcome.notifyCardId) {
      // Après COMMIT seulement, sans appel réseau dans la transaction : rafraîchit tous les passes Wallet
      // de la famille (survivante + alias) ; notifyGoogleWallet résout la famille et ne bloque pas.
      try {
        const token = await pool.query<{ publicToken: string }>(`SELECT "publicToken" FROM "LoyaltyCard" WHERE id = $1`, [
          outcome.notifyCardId,
        ]);
        if (token.rows[0]) notifyGoogleWallet(token.rows[0].publicToken);
      } catch {
        /* la fusion est enregistrée ; la notification Wallet n'est qu'un rafraîchissement */
      }
    }
    return outcome.result;
  } catch (error) {
    if (!committed) await rollbackQuietly(client);
    const code = pgCode(error);
    if (code === "23505") {
      const constraint = pgConstraint(error);
      if (constraint.includes("idempotencyKey")) {
        // Deux requêtes avec la même clé : la seconde rejoue la réponse enregistrée.
        const replay = await storedResult(pool, organizationId, { idempotencyKey });
        if (replay?.response && replay.sourceCustomerId === sourceId && replay.targetCustomerId === targetId) {
          return { ...replay.response, replayed: true };
        }
        throw new MergeError("IDEMPOTENCY_CONFLICT", "Cette clé d'idempotence a déjà servi pour une autre fusion.");
      }
      if (constraint.includes("sourceCustomerId")) throw new MergeError("ALREADY_MERGED", "Cette fiche a déjà été fusionnée.");
    }
    throw translateLockError(error);
  } finally {
    client.release();
  }
}

type RunInput = { sourceId: string; targetId: string; idempotencyKey: string; previewVersion: string };

async function runMerge(
  client: PoolClient,
  organizationId: string,
  actor: MergeActor,
  input: RunInput,
  program: ProgramView,
): Promise<{ result: MergeResult; notifyCardId: string | null }> {
  const { sourceId, targetId, idempotencyKey } = input;

  // Idempotence : même clé => réponse enregistrée. Fiche déjà fusionnée => résultat existant (même T) ou 409.
  const sameKey = await storedResult(client, organizationId, { idempotencyKey });
  if (sameKey) {
    if (sameKey.sourceCustomerId !== sourceId || sameKey.targetCustomerId !== targetId || !sameKey.response) {
      throw new MergeError("IDEMPOTENCY_CONFLICT", "Cette clé d'idempotence a déjà servi pour une autre fusion.");
    }
    return { result: { ...sameKey.response, replayed: true }, notifyCardId: null };
  }
  const already = await storedResult(client, organizationId, { sourceCustomerId: sourceId });
  if (already) {
    if (already.targetCustomerId === targetId && already.response) {
      return { result: { ...already.response, replayed: true }, notifyCardId: null };
    }
    throw new MergeError("ALREADY_MERGED", "Cette fiche a déjà été fusionnée dans une autre fiche.");
  }

  // Verrous dans un ordre fixe (id) : fiches, puis cartes, puis comptes. FOR NO KEY UPDATE : même exclusion
  // mutuelle que FOR UPDATE pour les écritures, mais ne bloque pas le FOR KEY SHARE des clés étrangères
  // (un passage validé en parallèle insère un LoyaltyEvent qui référence ces lignes : pas d'interblocage).
  const customers = await client.query<CustomerRow>(
    `SELECT ${CUSTOMER_COLUMNS} FROM "Customer" c
     WHERE c."organizationId" = $1 AND c.id = ANY($2::text[]) ORDER BY c.id FOR NO KEY UPDATE`,
    [organizationId, [sourceId, targetId]],
  );
  const source = customers.rows.find((row) => row.id === sourceId);
  const target = customers.rows.find((row) => row.id === targetId);
  if (!source || !target) throw new MergeError("NOT_FOUND", "Fiche introuvable pour cet institut.");
  if (source.mergedIntoCustomerId) throw new MergeError("ALREADY_MERGED", "Cette fiche a déjà été fusionnée.");
  if (target.mergedIntoCustomerId) throw new MergeError("TARGET_MERGED", "La fiche existante a elle-même été fusionnée dans une autre.");
  if (source.deletedAt) throw new MergeError("NOT_FOUND", "Fiche introuvable pour cet institut.");
  if (!isAnonymousLoyaltyPhone(source.phone)) {
    throw new MergeError("SOURCE_NOT_ANONYMOUS", "Seule une fiche anonyme (créée par le QR d'adhésion) peut être fusionnée.");
  }

  const cards = await client.query<CardRow>(
    `SELECT id, "customerId", "publicToken", status, "mergedIntoCardId", "createdAt"
     FROM "LoyaltyCard" WHERE "organizationId" = $1 AND "customerId" = ANY($2::text[])
     ORDER BY id FOR NO KEY UPDATE`,
    [organizationId, [sourceId, targetId]],
  );
  const sourceCard = cards.rows.find((row) => row.customerId === sourceId) ?? null;
  const targetCard = cards.rows.find((row) => row.customerId === targetId) ?? null;
  if (sourceCard && sourceCard.status !== "ACTIVE") throw new MergeError("CARD_INACTIVE", "La carte de la fiche anonyme n'est plus active.");
  if (targetCard && targetCard.status !== "ACTIVE") throw new MergeError("CARD_INACTIVE", "La carte de la fiche existante n'est pas active.");

  const accountSql = `SELECT id, "customerId", balance, "lifetimePoints", level::text AS level FROM "LoyaltyAccount"
     WHERE "organizationId" = $1 AND "customerId" = ANY($2::text[]) ORDER BY id FOR NO KEY UPDATE`;
  type AccountRow = { id: string; customerId: string; balance: number; lifetimePoints: number; level: string };
  let accounts = await client.query<AccountRow>(accountSql, [organizationId, [sourceId, targetId]]);

  const version = await computePreviewVersion(client, organizationId, sourceId, targetId);
  if (version !== input.previewVersion) {
    throw new MergeError("STALE_PREVIEW", "Les fiches ont changé depuis l'aperçu. Relancez l'aperçu avant de fusionner.");
  }

  // Compte de T créé après la vérification de l'aperçu (un compte vide ne fait pas partie de l'empreinte).
  if (!accounts.rows.some((row) => row.customerId === targetId)) {
    await client.query(
      `INSERT INTO "LoyaltyAccount" (id, "organizationId", "customerId", balance, "lifetimePoints", level, "updatedAt")
       VALUES ($1, $2, $3, 0, 0, 'BRONZE'::"LoyaltyLevel", NOW())
       ON CONFLICT ("organizationId", "customerId") DO NOTHING`,
      [newLoyaltyId("lacc"), organizationId, targetId],
    );
    accounts = await client.query<AccountRow>(accountSql, [organizationId, [sourceId, targetId]]);
  }
  const sourceAccount = accounts.rows.find((row) => row.customerId === sourceId) ?? null;
  const targetAccount = accounts.rows.find((row) => row.customerId === targetId);
  if (!targetAccount) throw new MergeError("INVARIANT_VIOLATION", "Compte de points introuvable.");

  // --- Mesures avant ---
  const cardIds = [sourceCard?.id, targetCard?.id].filter((id): id is string => Boolean(id));
  const before = await client.query<{ visits: string; allPoints: string; open: number }>(
    `SELECT
       COALESCE((SELECT SUM(points) FILTER (WHERE type = 'VISIT') FROM "LoyaltyEvent" WHERE "loyaltyCardId" = ANY($1::text[])), 0)::text AS visits,
       COALESCE((SELECT SUM(points) FROM "LoyaltyEvent" WHERE "loyaltyCardId" = ANY($1::text[])), 0)::text AS "allPoints",
       (SELECT COUNT(*)::int FROM "LoyaltyVisitReward" WHERE "loyaltyCardId" = ANY($1::text[]) AND status = 'AVAILABLE'
          AND ("expiresAt" IS NULL OR "expiresAt" > NOW())) AS open`,
    [cardIds],
  );
  const visitsOf = async (cardId: string | null) => {
    if (!cardId) return 0;
    const r = await client.query<{ v: string }>(
      `SELECT COALESCE(SUM(points) FILTER (WHERE type = 'VISIT'), 0)::text AS v FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1`,
      [cardId],
    );
    return Number(r.rows[0]?.v ?? 0);
  };
  const sourceVisits = await visitsOf(sourceCard?.id ?? null);
  const targetVisits = await visitsOf(targetCard?.id ?? null);
  const pointsBefore = Number(before.rows[0]?.allPoints ?? 0);
  const plan = planCumulativeReward({
    sourceVisits,
    targetVisits,
    visitsPerReward: program.visitsPerReward,
    stackRewards: program.stackRewards,
    programActive: program.active,
    openRewards: before.rows[0]?.open ?? 0,
  });
  const balanceBefore = (sourceAccount?.balance ?? 0) + targetAccount.balance;
  const lifetimeBefore = (sourceAccount?.lifetimePoints ?? 0) + targetAccount.lifetimePoints;

  const mergeId = newLoyaltyId("cmrg");
  const survivingCardId = targetCard?.id ?? sourceCard?.id ?? null;
  const cardMode: MergeResult["cardMode"] = sourceCard ? (targetCard ? "ALIAS" : "ATTACHED") : "NONE";
  const snapshotBefore = {
    source: { customer: source, card: sourceCard, account: sourceAccount, visits: sourceVisits },
    target: { customer: target, card: targetCard, account: targetAccount, visits: targetVisits },
    program: { visitsPerReward: program.visitsPerReward, stackRewards: program.stackRewards, active: program.active },
    counts: await movedCounts(client, organizationId, sourceId),
  };

  // --- Cartes ---
  const moved: MovedLog = {};
  if (sourceCard && targetCard) {
    // Alias : profondeur 1 seulement. Les alias de la carte absorbée sont repointés vers la survivante.
    const repointed = await client.query<{ id: string; previous: string }>(
      `WITH old AS (SELECT id, "mergedIntoCardId" AS previous FROM "LoyaltyCard"
                    WHERE "organizationId" = $1 AND "mergedIntoCardId" = $2 ORDER BY id FOR UPDATE)
       UPDATE "LoyaltyCard" c SET "mergedIntoCardId" = $3, "updatedAt" = NOW()
       FROM old WHERE c.id = old.id RETURNING c.id, old.previous`,
      [organizationId, sourceCard.id, targetCard.id],
    );
    await client.query(
      `UPDATE "LoyaltyCard" SET status = 'MERGED', "mergedIntoCardId" = $3, "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,
      [sourceCard.id, organizationId, targetCard.id],
    );
    moved.card = {
      mode: "ALIAS",
      id: sourceCard.id,
      previous: { status: sourceCard.status, customerId: sourceCard.customerId, mergedIntoCardId: sourceCard.mergedIntoCardId },
      mergedIntoCardId: targetCard.id,
      repointedAliases: repointed.rows.map((row) => ({ id: row.id, previousMergedIntoCardId: row.previous })),
    };
  } else if (sourceCard) {
    await client.query(`UPDATE "LoyaltyCard" SET "customerId" = $3, "updatedAt" = NOW() WHERE id = $1 AND "organizationId" = $2`, [
      sourceCard.id,
      organizationId,
      targetId,
    ]);
    moved.card = { mode: "ATTACHED", id: sourceCard.id, previous: { customerId: sourceId } };
  }

  // --- Lignes simples déplacées ---
  for (const spec of MOVE_SPECS) {
    const params: unknown[] = [organizationId, sourceId, targetId];
    const sets = [`"${spec.column}" = $3`];
    const olds: string[] = [];
    if (spec.card && survivingCardId) {
      params.push(survivingCardId);
      sets.push(`"loyaltyCardId" = $${params.length}`);
      olds.push(`"loyaltyCardId" AS "oldCardId"`);
    }
    if (spec.account) {
      params.push(targetAccount.id);
      sets.push(`"accountId" = $${params.length}`);
      olds.push(`"accountId" AS "oldAccountId"`);
    }
    const guard = spec.table === "LoyaltyTransaction" ? ` AND "idempotencyKey" NOT LIKE 'merge:%'` : "";
    const { rows } = await client.query<{ id: string; oldCardId?: string; oldAccountId?: string }>(
      `WITH old AS (
         SELECT id${olds.length ? ", " + olds.join(", ") : ""} FROM "${spec.table}"
         WHERE "organizationId" = $1 AND "${spec.column}" = $2${guard} ORDER BY id FOR UPDATE
       )
       UPDATE "${spec.table}" t SET ${sets.join(", ")}
       FROM old WHERE t.id = old.id
       RETURNING t.id${spec.card ? ', old."oldCardId"' : ""}${spec.account ? ', old."oldAccountId"' : ""}`,
      params,
    );
    if (rows.length === 0) continue;
    const entry: Record<string, unknown> = {
      table: spec.table,
      column: spec.column,
      from: sourceId,
      to: targetId,
      ids: rows.map((row) => row.id),
    };
    if (spec.card) entry.previousCardId = Object.fromEntries(rows.map((row) => [row.id, row.oldCardId]));
    if (spec.account) entry.previousAccountId = Object.fromEntries(rows.map((row) => [row.id, row.oldAccountId]));
    moved[spec.key] = entry;
  }

  // --- Tables à unicité ---
  const prefs = await client.query<{ id: string; customerId: string; consentedAt: Date | null; revokedAt: Date | null }>(
    `SELECT id, "customerId", "consentedAt", "revokedAt" FROM "NotificationPreference"
     WHERE "organizationId" = $1 AND "customerId" = ANY($2::text[]) FOR UPDATE`,
    [organizationId, [sourceId, targetId]],
  );
  const sourcePref = prefs.rows.find((row) => row.customerId === sourceId) ?? null;
  let targetPref = prefs.rows.find((row) => row.customerId === targetId) ?? null;
  if (sourcePref && !targetPref) {
    await client.query(`UPDATE "NotificationPreference" SET "customerId" = $3, "updatedAt" = NOW() WHERE id = $1 AND "organizationId" = $2`, [
      sourcePref.id,
      organizationId,
      targetId,
    ]);
    targetPref = { ...sourcePref, customerId: targetId };
    moved.NotificationPreference = { table: "NotificationPreference", column: "customerId", from: sourceId, to: targetId, ids: [sourcePref.id] };
  } else if (sourcePref) {
    moved.NotificationPreferenceKept = { keptOn: sourceId, id: sourcePref.id, reason: "Les préférences de la fiche existante sont conservées." };
  }
  const targetConsents = Boolean(targetPref?.consentedAt && !targetPref.revokedAt);
  if (targetConsents) {
    const subs = await client.query<{ id: string }>(
      `UPDATE "WebPushSubscription" SET "customerId" = $3, "updatedAt" = NOW()
       WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL RETURNING id`,
      [organizationId, sourceId, targetId],
    );
    if (subs.rows.length) {
      moved.WebPushSubscription = { table: "WebPushSubscription", column: "customerId", from: sourceId, to: targetId, ids: subs.rows.map((r) => r.id) };
    }
  } else {
    const subs = await client.query<{ id: string }>(
      `UPDATE "WebPushSubscription" SET "revokedAt" = NOW(), "updatedAt" = NOW()
       WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL RETURNING id`,
      [organizationId, sourceId],
    );
    if (subs.rows.length) moved.WebPushSubscriptionRevoked = { ids: subs.rows.map((r) => r.id), previousRevokedAt: null };
  }
  const grants = await client.query<{ id: string }>(
    `UPDATE "PushAccessGrant" SET "revokedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL RETURNING id`,
    [organizationId, sourceId],
  );
  if (grants.rows.length) moved.PushAccessGrantRevoked = { ids: grants.rows.map((r) => r.id), previousRevokedAt: null };
  const recipients = await client.query<{ id: string }>(
    `UPDATE "CampaignRecipient" r SET "customerId" = $3, "updatedAt" = NOW()
     FROM "Campaign" k
     WHERE k.id = r."campaignId" AND k."organizationId" = $1 AND r."customerId" = $2
       AND NOT EXISTS (SELECT 1 FROM "CampaignRecipient" x WHERE x."campaignId" = r."campaignId" AND x."customerId" = $3)
     RETURNING r.id`,
    [organizationId, sourceId, targetId],
  );
  if (recipients.rows.length) {
    moved.CampaignRecipient = { table: "CampaignRecipient", column: "customerId", from: sourceId, to: targetId, ids: recipients.rows.map((r) => r.id) };
  }

  // --- Points ---
  const totals = mergeAccountTotals(sourceAccount, targetAccount);
  const level = levelFromLifetime(totals.lifetimePoints, program.levels);
  await client.query(
    `UPDATE "LoyaltyAccount" SET balance = $2, "lifetimePoints" = $3, level = $4::"LoyaltyLevel", "updatedAt" = NOW() WHERE id = $1`,
    [targetAccount.id, totals.balance, totals.lifetimePoints, level],
  );
  if (sourceAccount) {
    await client.query(
      `UPDATE "LoyaltyAccount" SET balance = 0, "lifetimePoints" = 0, level = 'BRONZE'::"LoyaltyLevel", "updatedAt" = NOW() WHERE id = $1`,
      [sourceAccount.id],
    );
    moved.LoyaltyAccount = {
      sourceAccountId: sourceAccount.id,
      targetAccountId: targetAccount.id,
      previousSource: { balance: sourceAccount.balance, lifetimePoints: sourceAccount.lifetimePoints, level: sourceAccount.level },
      previousTarget: { balance: targetAccount.balance, lifetimePoints: targetAccount.lifetimePoints, level: targetAccount.level },
    };
    if (sourceAccount.balance !== 0) {
      await client.query(
        `INSERT INTO "LoyaltyTransaction" (
           id, "organizationId", "accountId", "customerId", type, points, "balanceAfter", reason, "createdById", "idempotencyKey"
         ) VALUES
           ($1, $2, $3, $4, 'ADJUSTMENT'::"LoyaltyTxnType", $5, 0, 'Fusion de fiches : points transférés', $6, $7),
           ($8, $2, $9, $10, 'ADJUSTMENT'::"LoyaltyTxnType", $11, $12, 'Fusion de fiches : points reçus', $6, $13)`,
        [
          newLoyaltyId("ltxn"),
          organizationId,
          sourceAccount.id,
          sourceId,
          -sourceAccount.balance,
          actor.id,
          `merge:${mergeId}:out`,
          newLoyaltyId("ltxn"),
          targetAccount.id,
          targetId,
          sourceAccount.balance,
          totals.balance,
          `merge:${mergeId}:in`,
        ],
      );
    }
  }

  // --- Récompense par cumul ---
  let cumulativeRewardId: string | null = null;
  if (plan.create && survivingCardId) {
    const eventId = newLoyaltyId("levt");
    cumulativeRewardId = newLoyaltyId("lrew");
    await client.query(
      `INSERT INTO "LoyaltyEvent" (
         id, "organizationId", "customerId", "loyaltyCardId", type, "appointmentId", "serviceId",
         amount, points, note, "validatedBy", "validatedAt"
       ) VALUES ($1, $2, $3, $4, 'VISIT', NULL, NULL, 0, 0, 'Fusion de fiches', $5, NOW())`,
      [eventId, organizationId, targetId, survivingCardId, actor.id],
    );
    await client.query(
      `INSERT INTO "LoyaltyVisitReward" (
         id, "organizationId", "customerId", "loyaltyCardId", "loyaltyEventId",
         name, status, value, "earnedAt", "expiresAt"
       ) VALUES ($1, $2, $3, $4, $5, $6, 'AVAILABLE', $7, NOW(), NOW() + $8::interval)`,
      [
        cumulativeRewardId,
        organizationId,
        targetId,
        survivingCardId,
        eventId,
        program.rewardLabel,
        program.rewardValue,
        `${program.rewardValidityDays} days`,
      ],
    );
    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "LoyaltyVisitReward",
      entityId: cumulativeRewardId,
      action: "LOYALTY_REWARD_EARNED",
      before: { status: null, visits: plan.totalVisits - plan.crossings * program.visitsPerReward },
      after: { status: "AVAILABLE", name: program.rewardLabel, customerId: targetId, loyaltyEventId: eventId, mergeId },
      client,
    });
    const survivor = await client.query<{ publicToken: string }>(`SELECT "publicToken" FROM "LoyaltyCard" WHERE id = $1`, [survivingCardId]);
    if (survivor.rows[0]) {
      const days = program.rewardValidityDays > 0 ? program.rewardValidityDays : 365;
      await grantPersonalLoyaltyPromo(client, {
        organizationId,
        customerId: targetId,
        publicToken: survivor.rows[0].publicToken,
        rewardId: cumulativeRewardId,
        rewardLabel: program.rewardLabel,
        rewardKind: program.rewardKind,
        rewardValue: program.rewardValue,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      });
    }
  }
  if (survivingCardId) {
    await client.query(`UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1`, [survivingCardId]);
  }

  // --- Fiches ---
  const notes = source.notes?.trim();
  const repointedCustomers = await client.query<{ id: string }>(
    `UPDATE "Customer" SET "mergedIntoCustomerId" = $3, "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "mergedIntoCustomerId" = $2 AND id <> $2 RETURNING id`,
    [organizationId, sourceId, targetId],
  );
  await client.query(
    `UPDATE "Customer" SET status = 'ARCHIVED'::"CustomerStatus", "deletedAt" = NOW(), "mergedIntoCustomerId" = $3, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [sourceId, organizationId, targetId],
  );
  const completed = await client.query<{ id: string }>(
    `UPDATE "Customer" SET
       email = COALESCE(email, (SELECT email FROM "Customer" WHERE id = $3)),
       "birthDate" = COALESCE("birthDate", (SELECT "birthDate" FROM "Customer" WHERE id = $3)),
       address = COALESCE(address, (SELECT address FROM "Customer" WHERE id = $3)),
       instagram = COALESCE(instagram, (SELECT instagram FROM "Customer" WHERE id = $3)),
       notes = CASE WHEN $4::text IS NULL THEN notes
                    WHEN notes IS NULL OR notes = '' THEN $4
                    ELSE notes || E'\\n' || $4 END,
       "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 RETURNING id`,
    [targetId, organizationId, sourceId, notes ? `Fiche fusionnée : ${notes}` : null],
  );
  moved.Customer = {
    sourceId,
    targetId,
    sourceBefore: { status: source.status, deletedAt: source.deletedAt, mergedIntoCustomerId: source.mergedIntoCustomerId },
    targetBefore: { email: target.email, notes: target.notes },
    repointedMergedIntoCustomerId: repointedCustomers.rows.map((row) => row.id),
    targetUpdated: completed.rows.length > 0,
  };

  // --- Invariants (sinon ROLLBACK) ---
  const after = await client.query<{ points: string; left: number }>(
    `SELECT COALESCE((SELECT SUM(points) FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1), 0)::text AS points,
            (SELECT COUNT(*)::int FROM "LoyaltyEvent" WHERE "organizationId" = $2 AND "customerId" = $3) AS "left"`,
    [survivingCardId, organizationId, sourceId],
  );
  if (survivingCardId && Number(after.rows[0]?.points ?? 0) !== pointsBefore) {
    throw new MergeError("INVARIANT_VIOLATION", "Somme des passages incohérente après fusion.");
  }
  const accountsAfter = await client.query<{ total: string; lifetime: string }>(
    `SELECT COALESCE(SUM(balance), 0)::text AS total, COALESCE(SUM("lifetimePoints"), 0)::text AS lifetime
     FROM "LoyaltyAccount" WHERE "organizationId" = $1 AND "customerId" = ANY($2::text[])`,
    [organizationId, [sourceId, targetId]],
  );
  if (Number(accountsAfter.rows[0]?.total) !== balanceBefore || Number(accountsAfter.rows[0]?.lifetime) !== lifetimeBefore) {
    throw new MergeError("INVARIANT_VIOLATION", "Solde de points incohérent après fusion.");
  }
  const leftovers = await movedCounts(client, organizationId, sourceId);
  const remaining = Object.entries(leftovers).filter(([, n]) => n > 0);
  if (remaining.length > 0) {
    throw new MergeError("INVARIANT_VIOLATION", `Des lignes sont restées sur la fiche absorbée : ${remaining.map(([k]) => k).join(", ")}.`);
  }

  // --- Journal + audit (même transaction) ---
  const movedCountsOut = Object.fromEntries(
    Object.entries(moved)
      .filter(([, value]) => Array.isArray((value as { ids?: unknown[] }).ids))
      .map(([key, value]) => [key, (value as { ids: unknown[] }).ids.length]),
  );
  const createdAt = new Date();
  const result: MergeResult = {
    mergeId,
    sourceCustomerId: sourceId,
    targetCustomerId: targetId,
    sourceCardId: sourceCard?.id ?? null,
    targetCardId: targetCard?.id ?? null,
    survivingCardId,
    cardMode,
    totalVisits: plan.totalVisits,
    cycle: plan.cycle,
    visitsPerReward: program.visitsPerReward,
    cumulativeRewardId,
    pointsTransferred: totals.transferred,
    moved: movedCountsOut,
    createdAt: createdAt.toISOString(),
    replayed: false,
  };
  await client.query(
    `INSERT INTO "CustomerMerge" (
       id, "organizationId", "sourceCustomerId", "targetCustomerId", "sourceCardId", "targetCardId", "survivingCardId",
       "actorId", "actorName", "idempotencyKey", status, "snapshotBefore", moved, stats, "createdAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'COMPLETED',$11::jsonb,$12::jsonb,$13::jsonb,$14)`,
    [
      mergeId,
      organizationId,
      sourceId,
      targetId,
      sourceCard?.id ?? null,
      targetCard?.id ?? null,
      survivingCardId,
      actor.id,
      actor.name,
      idempotencyKey,
      JSON.stringify(snapshotBefore),
      JSON.stringify(moved),
      JSON.stringify({
        response: result,
        plan,
        pointsTransferred: totals.transferred,
        sourceVisits,
        targetVisits,
        cumulativeRewardId,
      }),
      createdAt,
    ],
  );
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "Customer",
    entityId: targetId,
    action: "CUSTOMER_MERGE",
    before: { sourceCustomerId: sourceId, sourceVisits, targetVisits },
    after: {
      mergeId,
      sourceCustomerId: sourceId,
      targetCustomerId: targetId,
      survivingCardId,
      cardMode,
      totalVisits: plan.totalVisits,
      cumulativeRewardId,
      pointsTransferred: totals.transferred,
      moved: movedCountsOut,
    },
    client,
  });

  return { result, notifyCardId: survivingCardId };
}
