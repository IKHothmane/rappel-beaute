import { randomBytes } from "crypto";
import { type Pool, type PoolClient } from "pg";
import { getOrCreateLoyaltyProgram } from "@/lib/db/loyalty";
import { aliasJoin } from "@/lib/loyalty/card-alias";
import { shortCardCode, visitCycle } from "@/lib/loyalty/card-code";
import { pool } from "@/lib/db/pool";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newLoyaltyId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function newPublicToken() {
  const bytes = randomBytes(12);
  let token = "RBLOY_";
  for (const byte of bytes) token += ALPHABET[byte % ALPHABET.length];
  return token;
}

type VisitRewardKind = "FREE_SERVICE" | "DISCOUNT" | "PERCENTAGE";

export type VisitProgram = {
  visitsPerReward: number;
  rewardLabel: string;
  active: boolean;
  rewardValidityDays: number;
  stackRewards: boolean;
  eligibleServiceIds: string[];
  rewardKind: VisitRewardKind;
  rewardValue: number | null;
  cardBackgroundUrl: string | null;
  cardBackgroundColor: string | null;
};

function normalizeRewardKind(raw: string | null | undefined): VisitRewardKind {
  if (raw === "DISCOUNT") return "DISCOUNT";
  if (raw === "PERCENTAGE") return "PERCENTAGE";
  return "FREE_SERVICE";
}

export async function getVisitProgram(organizationId: string): Promise<VisitProgram> {
  await getOrCreateLoyaltyProgram(organizationId);
  const { rows } = await pool.query<{
    visitsPerReward: number;
    rewardLabel: string;
    active: boolean;
    rewardValidityDays: number;
    stackRewards: boolean;
    eligibleServiceIds: string[] | null;
    rewardKind: string | null;
    rewardValue: string | null;
    cardBackgroundUrl: string | null;
    cardBackgroundColor: string | null;
  }>(
    `SELECT "visitsPerReward", "rewardLabel", active, "rewardValidityDays", "stackRewards", "eligibleServiceIds",
            "rewardKind", "rewardValue"::text AS "rewardValue", "cardBackgroundUrl", "cardBackgroundColor"
     FROM "LoyaltyProgram" WHERE "organizationId" = $1`,
    [organizationId],
  );
  const row = rows[0];
  return {
    visitsPerReward: row?.visitsPerReward && row.visitsPerReward > 0 ? row.visitsPerReward : 5,
    rewardLabel: row?.rewardLabel?.trim() || "Récompense",
    active: row?.active ?? true,
    rewardValidityDays: row?.rewardValidityDays && row.rewardValidityDays > 0 ? row.rewardValidityDays : 30,
    stackRewards: row?.stackRewards ?? true,
    eligibleServiceIds: row?.eligibleServiceIds ?? [],
    rewardKind: normalizeRewardKind(row?.rewardKind),
    rewardValue: row?.rewardValue != null ? parseFloat(row.rewardValue) : null,
    cardBackgroundUrl: row?.cardBackgroundUrl ?? null,
    cardBackgroundColor: row?.cardBackgroundColor ?? null,
  };
}

type IssuedCard = {
  id: string;
  publicToken: string;
  customerId: string;
  firstName: string;
  lastName: string;
};

export async function issueLoyaltyCard(
  organizationId: string,
  customerId: string,
  client?: PoolClient,
): Promise<IssuedCard> {
  const db = client ?? pool;
  const customer = await db.query<{ id: string; firstName: string; lastName: string }>(
    `SELECT id, "firstName", "lastName"
     FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [customerId, organizationId],
  );
  if (!customer.rows[0]) throw new Error("CUSTOMER_NOT_FOUND");
  await ensureLoyaltyAccount(organizationId, customerId, db);

  const existing = await db.query<{ id: string; publicToken: string }>(
    `SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2`,
    [organizationId, customerId],
  );
  if (existing.rows[0]) {
    await db.query(`UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1`, [existing.rows[0].id]);
    return {
      id: existing.rows[0].id,
      publicToken: existing.rows[0].publicToken,
      customerId,
      firstName: customer.rows[0].firstName,
      lastName: customer.rows[0].lastName,
    };
  }

  const id = newLoyaltyId("lcard");
  const publicToken = newPublicToken();
  const inserted = await db.query(
      `INSERT INTO "LoyaltyCard" (id, "organizationId", "customerId", "publicToken", status, "updatedAt")
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())
       ON CONFLICT ("organizationId", "customerId") DO NOTHING`,
      [id, organizationId, customerId, publicToken],
  );
  if (inserted.rowCount === 0) {
    const again = await db.query<{ id: string; publicToken: string }>(
      `SELECT id, "publicToken" FROM "LoyaltyCard"
       WHERE "organizationId" = $1 AND "customerId" = $2`,
      [organizationId, customerId],
    );
    if (!again.rows[0]) throw new Error("CARD_NOT_FOUND");
    return {
      id: again.rows[0].id,
      publicToken: again.rows[0].publicToken,
      customerId,
      firstName: customer.rows[0].firstName,
      lastName: customer.rows[0].lastName,
    };
  }
  return {
    id,
    publicToken,
    customerId,
    firstName: customer.rows[0].firstName,
    lastName: customer.rows[0].lastName,
  };
}

async function ensureLoyaltyAccount(organizationId: string, customerId: string, db: Pool | PoolClient = pool) {
  await db.query(
    `INSERT INTO "LoyaltyAccount" (
      id, "organizationId", "customerId", balance, "lifetimePoints", level, "updatedAt"
    ) VALUES ($1, $2, $3, 0, 0, 'BRONZE', NOW())
     ON CONFLICT ("organizationId", "customerId") DO NOTHING`,
    [newLoyaltyId("lacc"), organizationId, customerId],
  );
}

type VisitCardListItem = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string | null;
  visits: number;
  visitsPerReward: number;
  createdAt: string;
  /** Dernier scan / passage / création — pour tri « Clientes fidèles ». */
  lastActivityAt: string;
  lastVisitAt: string | null;
  publicToken: string;
  cardCode: string;
  promoCode: string | null;
};

const VISIT_CARDS_DEFAULT_LIMIT = 200;
const VISIT_CARDS_MAX_LIMIT = 1000;
const VISIT_CARDS_MAX_PINS = 20;

export type ListVisitCardsOptions = {
  /** Nombre maximal de cartes renvoyées (défaut 200, borné à [1, 1000]). */
  limit?: number;
  /** customerId à remonter en priorité (max 20). Sans effet sur l'isolation par institut. */
  pinIds?: string[];
};

export type ListVisitCardsResult = {
  cards: VisitCardListItem[];
  /** Nombre total de cartes actives de l'institut (hors limite). */
  total: number;
};

function normalizeVisitCardsLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return VISIT_CARDS_DEFAULT_LIMIT;
  return Math.min(VISIT_CARDS_MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function normalizeVisitCardsPins(pinIds: string[] | undefined): string[] {
  if (!Array.isArray(pinIds)) return [];
  const unique = new Set<string>();
  for (const value of pinIds) {
    if (typeof value !== "string") continue;
    const id = value.trim();
    if (id) unique.add(id);
    if (unique.size >= VISIT_CARDS_MAX_PINS) break;
  }
  return [...unique];
}

export async function listVisitCards(
  organizationId: string,
  opts: ListVisitCardsOptions = {},
): Promise<ListVisitCardsResult> {
  const limit = normalizeVisitCardsLimit(opts.limit);
  const pinIds = normalizeVisitCardsPins(opts.pinIds);
  const program = await getVisitProgram(organizationId);
  const holders = await pool.query<{ customerId: string }>(
    `SELECT "customerId" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND status = 'ACTIVE' AND "mergedIntoCardId" IS NULL`,
    [organizationId],
  );
  for (const holder of holders.rows) {
    await ensureLoyaltyAccount(organizationId, holder.customerId);
  }
  const { rows } = await pool.query<{
    id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    publicToken: string;
    visits: number;
    rewardsReady: number;
    createdAt: Date;
    lastActivityAt: Date;
    lastVisitAt: Date | null;
  }>(
    `SELECT lc.id, c.id AS "customerId", c."firstName", c."lastName", c.phone, lc."publicToken",
            COALESCE(events.visits, 0)::int AS visits,
            COALESCE((
              SELECT COUNT(*) FROM "LoyaltyVisitReward" r
              WHERE r."loyaltyCardId" = lc.id AND r.status = 'AVAILABLE'
                AND (r."expiresAt" IS NULL OR r."expiresAt" > NOW())
            ), 0)::int AS "rewardsReady",
            lc."createdAt",
            GREATEST(
              lc."createdAt",
              lc."updatedAt",
              COALESCE(events."lastEventAt", lc."createdAt")
            ) AS "lastActivityAt",
            events."lastVisitAt"
     FROM "LoyaltyCard" lc
     JOIN "Customer" c ON c.id = lc."customerId"
     LEFT JOIN LATERAL (
       SELECT SUM(e.points) FILTER (WHERE e.type = 'VISIT') AS visits,
              MAX(e."validatedAt") AS "lastEventAt",
              MAX(e."validatedAt") FILTER (WHERE e.type = 'VISIT' AND e.points > 0) AS "lastVisitAt"
       FROM "LoyaltyEvent" e
       WHERE e."loyaltyCardId" = lc.id
     ) events ON TRUE
     WHERE lc."organizationId" = $1 AND lc.status = 'ACTIVE' AND lc."mergedIntoCardId" IS NULL
       AND c."deletedAt" IS NULL
     ORDER BY (c.id = ANY($3::text[])) DESC, "lastActivityAt" DESC, lc."createdAt" DESC
     LIMIT $2`,
    [organizationId, limit, pinIds],
  );
  const totalResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM "LoyaltyCard" lc
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc."organizationId" = $1 AND lc.status = 'ACTIVE' AND lc."mergedIntoCardId" IS NULL
       AND c."deletedAt" IS NULL`,
    [organizationId],
  );
  const total = totalResult.rows[0]?.total ?? rows.length;
  const cards = rows.map((row) => ({
    id: row.id,
    customerId: row.customerId,
    customerName: `${row.firstName} ${row.lastName}`.trim(),
    phone: row.phone,
    visits: row.visits,
    visitsPerReward: program.visitsPerReward,
    createdAt: row.createdAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
    lastVisitAt: row.lastVisitAt?.toISOString() ?? null,
    publicToken: row.publicToken,
    cardCode: shortCardCode(row.publicToken),
    promoCode: row.rewardsReady > 0 ? shortCardCode(row.publicToken) : null,
  }));
  return { cards, total };
}

type CardAppointment = {
  at: string;
  service: string;
  staff: string;
};

type CardSession = {
  name: string;
  used: number;
  total: number;
  remaining: number;
};

export type CardProgress = {
  organizationName: string;
  organizationLogoUrl: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  visits: number;
  visitsPerReward: number;
  cycle: number;
  remaining: number;
  rewardLabel: string;
  rewardsAvailable: number;
  history: { at: string; service: string; amount: number; points: number }[];
  rewards: {
    id: string;
    name: string;
    status: string;
    earnedAt: string;
    expiresAt: string | null;
    value: number | null;
  }[];
  appointments: CardAppointment[];
  sessions: CardSession[];
  cardBackgroundUrl: string | null;
  cardBackgroundColor: string | null;
};

/**
 * Progression d'une carte. Un id de carte alias (status MERGED) est résolu vers la carte survivante :
 * les compteurs, récompenses et rendez-vous affichés sont toujours ceux de la fiche survivante.
 */
export async function loadCardProgress(
  cardId: string,
  organizationId: string,
  client?: PoolClient,
  visitProgram?: VisitProgram,
  expectedCustomerId?: string,
): Promise<CardProgress | null> {
  const db = client ?? pool;
  const card = await db.query<{
    effectiveCardId: string | null;
    organizationName: string;
    organizationLogoUrl: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
  }>(
    `SELECT lc.id AS "effectiveCardId", o.name AS "organizationName", o."logoUrl" AS "organizationLogoUrl",
            c."firstName", c."lastName", c.phone
     FROM "LoyaltyCard" lc
     ${aliasJoin("src", "lc")}
     JOIN "Organization" o ON o.id = lc."organizationId"
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE src.id = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       AND ($3::text IS NULL OR (lc."customerId" = $3 AND c."deletedAt" IS NULL))`,
    [cardId, organizationId, expectedCustomerId ?? null],
  );
  if (!card.rows[0]) return null;
  // Toutes les lectures suivantes portent sur la carte survivante.
  const effectiveId = card.rows[0].effectiveCardId ?? cardId;

  const program = visitProgram ?? await getVisitProgram(organizationId);
  const visitsRow = await db.query<{ count: string }>(
    `SELECT COALESCE(SUM(points), 0)::text AS count FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,
    [effectiveId],
  );
  const visits = Number(visitsRow.rows[0]?.count ?? 0);
  const threshold = program.visitsPerReward;
  const cycle = visitCycle(visits, threshold);
  const remaining = cycle === 0 ? threshold : threshold - cycle;

  const history = await db.query<{ at: Date; service: string; amount: string; points: number }>(
    `SELECT e."validatedAt" AS at,
            COALESCE(a."serviceNameSnapshot", s.name, e.note, 'Ajustement') AS service,
            e.amount::text AS amount,
            e.points
     FROM "LoyaltyEvent" e
     LEFT JOIN "Appointment" a ON a.id = e."appointmentId"
     LEFT JOIN "Service" s ON s.id = e."serviceId"
     WHERE e."loyaltyCardId" = $1
     ORDER BY e."validatedAt" DESC
     LIMIT 30`,
    [effectiveId],
  );
  await db.query(
    `UPDATE "LoyaltyVisitReward"
     SET status = 'EXPIRED'
     WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'
       AND "expiresAt" IS NOT NULL AND "expiresAt" < NOW()`,
    [effectiveId],
  );
  const rewards = await db.query<{
    id: string;
    name: string;
    status: string;
    earnedAt: Date;
    expiresAt: Date | null;
    value: string | null;
  }>(
    `SELECT id, name, status, "earnedAt", "expiresAt", value::text AS value
     FROM "LoyaltyVisitReward"
     WHERE "loyaltyCardId" = $1
     ORDER BY "earnedAt" DESC
     LIMIT 20`,
    [effectiveId],
  );
  const available = rewards.rows.filter((row) => row.status === "AVAILABLE").length;

  const owner = await db.query<{ customerId: string }>(
    `SELECT "customerId" FROM "LoyaltyCard" WHERE id = $1 AND "organizationId" = $2`,
    [effectiveId, organizationId],
  );
  const customerId = owner.rows[0]?.customerId;
  const appointments = customerId
    ? await db.query<{ at: Date; service: string; staff: string }>(
        `SELECT a."startAt" AS at,
                COALESCE(a."serviceNameSnapshot", s.name, 'Rendez-vous') AS service,
                COALESCE(st."firstName", '') AS staff
         FROM "Appointment" a
         LEFT JOIN "Service" s ON s.id = a."serviceId"
         LEFT JOIN "Staff" st ON st.id = a."staffId"
         WHERE a."organizationId" = $1 AND a."customerId" = $2
           AND a.status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
           AND a."startAt" >= NOW() - INTERVAL '2 hours'
         ORDER BY a."startAt" ASC
         LIMIT 8`,
        [organizationId, customerId],
      )
    : { rows: [] as { at: Date; service: string; staff: string }[] };
  const sessions = customerId
    ? await db.query<{ name: string; used: number; total: number }>(
        `SELECT name, "sessionUsed" AS used, "sessionTotal" AS total
         FROM "Package"
         WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
         ORDER BY "purchasedAt" DESC
         LIMIT 12`,
        [organizationId, customerId],
      )
    : { rows: [] as { name: string; used: number; total: number }[] };

  return {
    organizationName: card.rows[0].organizationName,
    organizationLogoUrl: card.rows[0].organizationLogoUrl,
    firstName: card.rows[0].firstName,
    lastName: card.rows[0].lastName,
    phone: card.rows[0].phone,
    visits,
    visitsPerReward: threshold,
    cycle,
    remaining,
    rewardLabel: program.rewardLabel,
    rewardsAvailable: available,
    history: history.rows.map((row) => ({
      at: row.at.toISOString(),
      service: row.service,
      amount: Number(row.amount),
      points: row.points,
    })),
    rewards: rewards.rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      earnedAt: row.earnedAt.toISOString(),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      value: row.value != null ? Number(row.value) : null,
    })),
    appointments: appointments.rows.map((row) => ({
      at: row.at.toISOString(),
      service: row.service,
      staff: row.staff,
    })),
    sessions: sessions.rows.map((row) => ({
      name: row.name,
      used: Number(row.used),
      total: Number(row.total),
      remaining: Math.max(0, Number(row.total) - Number(row.used)),
    })),
    cardBackgroundUrl: program.cardBackgroundUrl,
    cardBackgroundColor: program.cardBackgroundColor,
  };
}

type Queryable = Pick<Pool | PoolClient, "query">;

export type SurvivingCard = {
  id: string;
  organizationId: string;
  customerId: string;
  /** Jeton de la carte survivante (peut différer du jeton demandé si celui-ci est un alias). */
  publicToken: string;
  /** Vrai si le jeton demandé est celui d'un alias (carte fusionnée). */
  viaAlias: boolean;
};

/**
 * Résout un jeton public vers sa carte effective : la carte elle-même si elle est ACTIVE, sinon la carte
 * survivante d'un alias MERGED (profondeur 1, même institut, survivante ACTIVE). `organizationId` null =
 * lecture publique par jeton seul (le jeton est un secret de 12 caractères).
 * Avec `lock`, verrouille la carte survivante (FOR UPDATE) ; si une fusion concurrente vient de la
 * transformer en alias entre la lecture et le verrou, la résolution est rejouée une fois.
 */
export async function resolveSurvivingCard(
  db: Queryable,
  organizationId: string | null,
  publicToken: string,
  options: { lock?: boolean } = {},
): Promise<SurvivingCard | null> {
  const token = publicToken.trim().toUpperCase();
  for (let attempt = 0; attempt < (options.lock ? 2 : 1); attempt += 1) {
    const { rows } = await db.query<{
      id: string;
      organizationId: string;
      customerId: string;
      publicToken: string;
      viaAlias: boolean;
    }>(
      `SELECT lc.id, lc."organizationId", lc."customerId", lc."publicToken", (lc.id <> al.id) AS "viaAlias"
       FROM "LoyaltyCard" lc
       ${aliasJoin("al", "lc")}
       WHERE al."publicToken" = $1 AND ($2::text IS NULL OR al."organizationId" = $2)
         AND lc.status = 'ACTIVE'
       ${options.lock ? 'FOR UPDATE OF lc' : ""}`,
      [token, organizationId],
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

/**
 * Jetons de toutes les cartes d'une même famille (survivante + alias) : à notifier après un passage pour
 * que chaque passe Wallet déjà installé (y compris celui d'un alias) soit rafraîchi.
 */
export async function walletTokensForCard(db: Queryable, cardId: string): Promise<string[]> {
  const { rows } = await db.query<{ publicToken: string }>(
    `WITH root AS (
       SELECT COALESCE(c."mergedIntoCardId", c.id) AS id FROM "LoyaltyCard" c WHERE c.id = $1
     )
     SELECT c."publicToken"
     FROM "LoyaltyCard" c, root
     WHERE c.id = root.id OR (c."mergedIntoCardId" = root.id AND c.status = 'MERGED')
     ORDER BY (c.id = root.id) DESC, c."createdAt" ASC`,
    [cardId],
  );
  return rows.map((row) => row.publicToken);
}

/** Même chose à partir d'un jeton (survivant ou alias). */
export async function walletTokensForToken(db: Queryable, token: string): Promise<string[]> {
  const { rows } = await db.query<{ publicToken: string }>(
    `WITH root AS (
       SELECT COALESCE(c."mergedIntoCardId", c.id) AS id FROM "LoyaltyCard" c WHERE c."publicToken" = $1
     )
     SELECT c."publicToken"
     FROM "LoyaltyCard" c, root
     WHERE c.id = root.id OR (c."mergedIntoCardId" = root.id AND c.status = 'MERGED')
     ORDER BY (c.id = root.id) DESC, c."createdAt" ASC`,
    [token.trim().toUpperCase()],
  );
  return rows.map((row) => row.publicToken);
}

/**
 * Jeton complet, lien, ou code affiché sous le QR (Cliente E4FB). Renvoie le jeton de la carte
 * SURVIVANTE : un jeton ou un code court d'alias (carte fusionnée) crédite la fiche qui a absorbé la carte.
 */
export async function resolveLoyaltyCardToken(organizationId: string, raw: string): Promise<string> {
  const upper = raw.trim().toUpperCase();
  const embedded = upper.match(/RBLOY_[A-Z2-9]{8,32}/);
  if (embedded) {
    const exact = await pool.query<{ publicToken: string }>(
      `SELECT lc."publicToken" FROM "LoyaltyCard" lc
       ${aliasJoin("al", "lc")}
       WHERE al."publicToken" = $1 AND al."organizationId" = $2 AND lc.status = 'ACTIVE'`,
      [embedded[0], organizationId],
    );
    if (!exact.rows[0]) throw new Error("CARD_NOT_FOUND");
    return exact.rows[0].publicToken;
  }

  const suffix = upper.replace(/^CLIENTE\s+/, "").replace(/[^A-Z2-9]/g, "");
  if (suffix.length < 4 || suffix.length > 12) throw new Error("CARD_NOT_FOUND");
  // Les alias comptent dans la recherche par suffixe, mais l'ambiguïté se mesure sur les cartes
  // survivantes DISTINCTES : un alias et sa survivante qui partagent le même code ne sont pas ambigus.
  const matches = await pool.query<{ publicToken: string }>(
    `SELECT DISTINCT lc."publicToken" FROM "LoyaltyCard" lc
     ${aliasJoin("al", "lc")}
     WHERE al."organizationId" = $1 AND lc.status = 'ACTIVE' AND al."publicToken" LIKE $2
     LIMIT 2`,
    [organizationId, `%${suffix}`],
  );
  if (matches.rows.length === 1) return matches.rows[0].publicToken;
  if (matches.rows.length > 1) throw new Error("CARD_AMBIGUOUS");
  throw new Error("CARD_NOT_FOUND");
}

/** `app_public_card_by_token` (SQL) suit déjà l'alias : la carte renvoyée est la survivante. */
export async function getPublicCardByToken(token: string, expectedCustomerId?: string): Promise<CardProgress | null> {
  const normalized = token.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(normalized)) return null;
  const located = await pool.query<{ id: string; organizationId: string }>(
    `SELECT id, "organizationId" FROM app_public_card_by_token($1)`,
    [normalized],
  );
  const { bindPublicInstitute } = await import("@/lib/db/tenant-context");
  if (located.rows[0]) bindPublicInstitute(located.rows[0].organizationId);
  const { rows } = located;
  if (!rows[0]) return null;
  return loadCardProgress(rows[0].id, rows[0].organizationId, undefined, undefined, expectedCustomerId);
}
