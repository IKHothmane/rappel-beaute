import { randomBytes } from "crypto";
import { issueLoyaltyCard, newLoyaltyId, newPublicToken } from "@/lib/loyalty/cards";
import { pool } from "@/lib/db/pool";
import { aliasJoin } from "@/lib/loyalty/card-alias";
import { loyaltyPhoneLookupVariants, normalizeLoyaltyPhone, validLoyaltyPhone } from "@/lib/loyalty/profile-input";
import { recordPhoneAlreadyKnown } from "@/lib/loyalty/phone-conflict";

const MARKETING_WHATSAPP_CONSENT_ACTION = "MARKETING_WHATSAPP_CONSENT";
const MARKETING_WHATSAPP_CONSENT_AUDIT = JSON.stringify({ source: "loyalty-card", consent: "whatsapp" });

const JOIN_RATE_WINDOW_MS = 60 * 60 * 1000;
/** Scan du QR : une cliente par scan, souvent derrière le Wi-Fi partagé du salon (une seule IP pour tout l'institut). */
export const JOIN_SCAN_IP_LIMIT_PER_HOUR = 60;
/** Formulaire : saisie manuelle d'une personne, limite par IP inchangée. */
export const JOIN_FORM_IP_LIMIT_PER_HOUR = 20;
/** Borne globale de créations de carte par QR d'inscription (scan + formulaire partagent le même compteur). */
export const JOIN_QR_LIMIT_PER_HOUR = 400;

/**
 * Dimensions de limitation pour toute création de carte via un QR d'inscription. Le compteur par QR n'est
 * ajouté que pour un jeton bien formé : un jeton inventé ne doit pas créer de clés de compteur arbitraires.
 */
export function joinCreationRateLimits(ip: string, joinToken: unknown, ipLimitPerHour: number) {
  const dimensions: {
    key: string;
    limit: number;
    windowMs: number;
    sensitivity: "sensitive" | "standard";
  }[] = [
    { key: `loyalty:join:ip:${ip}`, limit: ipLimitPerHour, windowMs: JOIN_RATE_WINDOW_MS, sensitivity: "sensitive" },
  ];
  const normalized = typeof joinToken === "string" ? joinToken.trim().toUpperCase() : "";
  if (/^RBJOIN_[A-Z2-9]{8,32}$/.test(normalized)) {
    dimensions.push({
      key: `loyalty:join:qr:${normalized}`,
      limit: JOIN_QR_LIMIT_PER_HOUR,
      windowMs: JOIN_RATE_WINDOW_MS,
      sensitivity: "standard",
    });
  }
  return dimensions;
}

function joinToken() {
  return `RBJOIN_${newPublicToken().slice("RBLOY_".length)}`;
}

type JoinQrView = {
  token: string;
  organizationId: string;
  status: "ACTIVE";
  organizationName: string;
  programName: string;
  visitsPerReward: number;
  rewardLabel: string;
  active: boolean;
};

async function getActiveJoinQr(organizationId: string): Promise<JoinQrView | null> {
  const { rows } = await pool.query<{
    token: string;
    organizationName: string;
    programName: string;
    visitsPerReward: number;
    rewardLabel: string;
    active: boolean;
  }>(
    `SELECT q.token, o.name AS "organizationName",
            COALESCE(NULLIF(p.name, ''), o.name) AS "programName",
            COALESCE(p."visitsPerReward", 10) AS "visitsPerReward",
            COALESCE(NULLIF(p."rewardLabel", ''), 'Récompense') AS "rewardLabel",
            COALESCE(p.active, true) AS active
     FROM "LoyaltyJoinQr" q
     JOIN "Organization" o ON o.id = q."organizationId"
     LEFT JOIN "LoyaltyProgram" p ON p."organizationId" = o.id
     WHERE q."organizationId" = $1 AND q.status = 'ACTIVE'
     ORDER BY q."createdAt" DESC
     LIMIT 1`,
    [organizationId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    token: row.token,
    organizationId,
    status: "ACTIVE",
    organizationName: row.organizationName,
    programName: row.programName,
    visitsPerReward: row.visitsPerReward > 0 ? row.visitsPerReward : 10,
    rewardLabel: row.rewardLabel,
    active: row.active,
  };
}

/** Un seul QR actif par institut. Ne remplace jamais un QR déjà en place. */
export async function ensureJoinQr(organizationId: string): Promise<JoinQrView> {
  const existing = await getActiveJoinQr(organizationId);
  if (existing) return existing;
  await pool.query(
    `INSERT INTO "LoyaltyJoinQr" (id, "organizationId", token, status)
     SELECT $1, $2, $3, 'ACTIVE'
     WHERE NOT EXISTS (
       SELECT 1 FROM "LoyaltyJoinQr" WHERE "organizationId" = $2 AND status = 'ACTIVE'
     )`,
    [newLoyaltyId("ljqr"), organizationId, joinToken()],
  );
  const created = await getActiveJoinQr(organizationId);
  if (!created) throw new Error("JOIN_QR_FAILED");
  return created;
}

/**
 * QR d'institut stable : un seul code par organisation, jamais remplacé.
 * Si un QR actif existe déjà, on le renvoie tel quel.
 */
export async function regenerateJoinQr(organizationId: string): Promise<JoinQrView> {
  return ensureJoinQr(organizationId);
}

export async function revokeJoinQr(organizationId: string): Promise<void> {
  await pool.query(
    `UPDATE "LoyaltyJoinQr" SET status = 'REVOKED', "revokedAt" = NOW()
     WHERE "organizationId" = $1 AND status = 'ACTIVE'`,
    [organizationId],
  );
}

export async function previewJoinQr(token: string): Promise<JoinQrView | null> {
  const normalized = token.trim().toUpperCase();
  if (!/^RBJOIN_[A-Z2-9]{8,32}$/.test(normalized)) return null;
  const { rows } = await pool.query<{ organizationId: string }>(
    `SELECT "organizationId" FROM app_public_loyalty_join_institute($1)`,
    [normalized],
  );
  if (!rows[0]) return null;
  const { bindPublicInstitute } = await import("@/lib/db/tenant-context");
  bindPublicInstitute(rows[0].organizationId);
  return getActiveJoinQr(rows[0].organizationId);
}

/**
 * Inscription par formulaire. Le numéro est normalisé dans le format canonique de Customer.phone
 * (cf. normalizeLoyaltyPhone). Si une fiche de l'institut porte déjà ce numéro (même dans un ancien
 * format), on lève PHONE_ALREADY_KNOWN : sans vérification d'identité, on n'émet ni ne rattache jamais
 * une carte à une fiche existante, car issueLoyaltyCard renverrait le jeton de SA carte (donc son
 * historique et ses rendez-vous) à quiconque saisit son numéro.
 */
export async function enrollFromJoinQr(input: {
  token: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  /** Case WhatsApp cochée explicitement (booléen strict) ; absent/false n'écrit jamais de consentement. */
  marketingWhatsappConsent?: boolean;
}): Promise<{ cardToken: string; customerId: string; organizationId: string; phone: string }> {
  const preview = await previewJoinQr(input.token);
  if (!preview) throw new Error("JOIN_QR_INVALID");
  if (!preview.active) throw new Error("PROGRAM_DISABLED");

  if (!validLoyaltyPhone(input.phone)) throw new Error("INVALID_PHONE");
  const phone = normalizeLoyaltyPhone(input.phone);
  // Ce formulaire n'accepte que des numéros locaux de 8 à 10 chiffres (pas de numéro étranger).
  if (!/^\d{8,10}$/.test(phone)) throw new Error("INVALID_PHONE");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (firstName.length < 1 || lastName.length < 1) throw new Error("INVALID_NAME");

  const qr = await pool.query<{ id: string; organizationId: string }>(
    `SELECT id, "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = 'ACTIVE'`,
    [input.token.trim().toUpperCase()],
  );
  const organizationId = qr.rows[0]?.organizationId;
  if (!organizationId) throw new Error("JOIN_QR_INVALID");

  const refuse = async (): Promise<never> => {
    await recordPhoneAlreadyKnown({
      organizationId,
      entityType: "LoyaltyJoinQr",
      entityId: qr.rows[0].id,
      source: "join_form",
    });
    throw new Error("PHONE_ALREADY_KNOWN");
  };

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM "Customer"
     WHERE "organizationId" = $1 AND phone = ANY($2::text[]) AND "deletedAt" IS NULL
     LIMIT 1`,
    [organizationId, loyaltyPhoneLookupVariants(phone)],
  );
  if (existing.rows[0]) return refuse();

  const customerId = `cust_${randomBytes(6).toString("hex")}`;
  const consent = input.marketingWhatsappConsent === true;
  try {
    // Une seule instruction : la fiche et, si la case est cochée, sa preuve de consentement (AuditLog) sont atomiques.
    await pool.query(
      `WITH created AS (
         INSERT INTO "Customer" (
           id, "organizationId", "firstName", "lastName", phone, email, status,
           "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
         ) VALUES ($1, $2, $3, $4, $5, $6, 'NEW', $7::boolean, false, false, NOW())
         RETURNING id
       )
       INSERT INTO "AuditLog" (id, "organizationId", "actorId", "actorName", "entityType", "entityId", action, after)
       SELECT $8, $2, NULL, 'Fidélité (public)', 'Customer', created.id, '${MARKETING_WHATSAPP_CONSENT_ACTION}', $9::jsonb
       FROM created
       WHERE $7::boolean`,
      [
        customerId,
        organizationId,
        firstName,
        lastName,
        phone,
        input.email?.trim() || null,
        consent,
        `aud_${randomBytes(8).toString("hex")}`,
        MARKETING_WHATSAPP_CONSENT_AUDIT,
      ],
    );
  } catch (error) {
    // Envoi simultané du même numéro (ou fiche archivée) : l'index unique tranche, aucune fiche n'est réutilisée.
    if ((error as { code?: string }).code === "23505") return refuse();
    throw error;
  }

  try {
    const card = await issueLoyaltyCard(organizationId, customerId);
    return { cardToken: card.publicToken, customerId, organizationId, phone };
  } catch (error) {
    // Évite une fiche orpheline qui bloquerait le numéro (PHONE_ALREADY_KNOWN) au nouvel essai de la cliente.
    await pool
      .query(`DELETE FROM "LoyaltyAccount" WHERE "organizationId" = $1 AND "customerId" = $2`, [organizationId, customerId])
      .then(() =>
        consent
          ? pool.query(
              `DELETE FROM "AuditLog" WHERE "organizationId" = $1 AND "entityType" = 'Customer' AND "entityId" = $2 AND action = $3`,
              [organizationId, customerId, MARKETING_WHATSAPP_CONSENT_ACTION],
            )
          : undefined,
      )
      .then(() =>
        pool.query(
          `DELETE FROM "Customer" c WHERE c.id = $1 AND c."organizationId" = $2
             AND NOT EXISTS (SELECT 1 FROM "LoyaltyCard" lc WHERE lc."customerId" = c.id)`,
          [customerId, organizationId],
        ),
      )
      .catch(() => undefined);
    throw error;
  }
}

/** Fiche sans numéro réel : carte créée anonymement (numéro provisoire « WL… ») ou sans téléphone. */
export function isPlaceholderPhone(phone: string | null | undefined): boolean {
  return !phone || phone.startsWith("WL");
}

const CARD_RECOVERED_BY_PHONE_ACTION = "LOYALTY_CARD_RECOVERED_BY_PHONE";

/**
 * Numéro déjà connu de l'institut : la cliente retrouve directement sa carte (choix produit : pas de validation par
 * l'équipe) et son prénom/nom saisis remplacent ceux de la fiche. Le téléphone et le consentement WhatsApp ne sont
 * jamais modifiés ; une carte est émise si la fiche n'en avait pas. Chaque récupération laisse une trace d'audit
 * (avec l'ancien nom en cas de changement) que l'institut peut relire.
 */
export async function recoverCardByPhoneFromJoinQr(input: {
  token: string;
  phone: string;
  /** Nom saisi par la cliente : il remplace le prénom et le nom de la fiche existante. */
  firstName: string;
  lastName: string;
}): Promise<{ cardToken: string; customerId: string; organizationId: string; phone: string } | null> {
  const preview = await previewJoinQr(input.token);
  if (!preview || !preview.active) return null;
  const qr = await pool.query<{ id: string; organizationId: string }>(
    `SELECT id, "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = 'ACTIVE'`,
    [input.token.trim().toUpperCase()],
  );
  const organizationId = qr.rows[0]?.organizationId;
  if (!organizationId) return null;

  const found = await pool.query<{
    id: string; phone: string; cardToken: string | null; firstName: string; lastName: string;
  }>(
    `SELECT c.id, c.phone, c."firstName", c."lastName", lc."publicToken" AS "cardToken"
     FROM "Customer" c
     LEFT JOIN "LoyaltyCard" lc ON lc."customerId" = c.id AND lc."organizationId" = c."organizationId"
       AND lc.status = 'ACTIVE' AND lc."mergedIntoCardId" IS NULL
     WHERE c."organizationId" = $1 AND c.phone = ANY($2::text[]) AND c."deletedAt" IS NULL
     ORDER BY (lc.id IS NOT NULL) DESC, c."createdAt" ASC
     LIMIT 1`,
    [organizationId, loyaltyPhoneLookupVariants(normalizeLoyaltyPhone(input.phone))],
  );
  const customer = found.rows[0];
  if (!customer) return null;
  const cardToken = customer.cardToken ?? (await issueLoyaltyCard(organizationId, customer.id)).publicToken;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const renamed = firstName !== customer.firstName || lastName !== customer.lastName;
  if (renamed) {
    await pool.query(
      `UPDATE "Customer" SET "firstName" = $3, "lastName" = $4, "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [customer.id, organizationId, firstName, lastName],
    );
  }
  await pool.query(
    `INSERT INTO "AuditLog" (id, "organizationId", "actorId", "actorName", "entityType", "entityId", action, after)
     VALUES ($1, $2, NULL, 'Fidélité (public)', 'Customer', $3, $4, $5::jsonb)`,
    [`aud_${randomBytes(8).toString("hex")}`, organizationId, customer.id, CARD_RECOVERED_BY_PHONE_ACTION,
      JSON.stringify({
        source: "join_form",
        ...(renamed ? { renamedFrom: { firstName: customer.firstName, lastName: customer.lastName }, renamedTo: { firstName, lastName } } : {}),
      })],
  );
  return { cardToken, customerId: customer.id, organizationId, phone: customer.phone };
}

/**
 * Carte déjà créée par ce même appareil mais sans informations (numéro provisoire) : le formulaire complète la
 * fiche au lieu d'en créer une seconde. Refusé (null) si le numéro appartient déjà à une autre fiche.
 */
export async function completePlaceholderProfile(input: {
  organizationId: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingWhatsappConsent?: boolean;
}): Promise<boolean> {
  const phone = normalizeLoyaltyPhone(input.phone);
  if (!validLoyaltyPhone(input.phone) || !/^\d{8,10}$/.test(phone)) throw new Error("INVALID_PHONE");
  const consent = input.marketingWhatsappConsent === true;
  try {
    const result = await pool.query(
      `WITH upd AS (
         UPDATE "Customer" c
         SET "firstName" = $3, "lastName" = $4, phone = $5, "marketingWhatsapp" = $6::boolean, "updatedAt" = NOW()
         WHERE c.id = $1 AND c."organizationId" = $2 AND c."deletedAt" IS NULL
           AND (c.phone IS NULL OR c.phone LIKE 'WL%')
           AND NOT EXISTS (
             SELECT 1 FROM "Customer" other
             WHERE other."organizationId" = $2 AND other.id <> $1 AND other."deletedAt" IS NULL
               AND other.phone = ANY($7::text[])
           )
         RETURNING c.id
       ), consent_audit AS (
         INSERT INTO "AuditLog" (id, "organizationId", "actorId", "actorName", "entityType", "entityId", action, after)
         SELECT $8, $2, NULL, 'Fidélité (public)', 'Customer', upd.id, '${MARKETING_WHATSAPP_CONSENT_ACTION}', $9::jsonb
         FROM upd WHERE $6::boolean
         RETURNING 1
       )
       SELECT id FROM upd`,
      [
        input.customerId, input.organizationId, input.firstName, input.lastName, phone, consent,
        loyaltyPhoneLookupVariants(phone), `aud_${randomBytes(8).toString("hex")}`, MARKETING_WHATSAPP_CONSENT_AUDIT,
      ],
    );
    if (!result.rows[0]) return false;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return false;
    throw error;
  }
  // Les sessions d'appareil sont liées au numéro (phoneSnapshot, non modifiable par le rôle public) : l'appelant
  // émet une nouvelle session pour ce numéro et révoque l'ancienne.
  return true;
}

/** Carte anonyme à 0 passage, sans nom ni téléphone saisis par la cliente. */
export async function enrollAnonymousFromJoinQr(
  token: string,
): Promise<{ cardToken: string; customerId: string; organizationId: string; phone: string }> {
  const preview = await previewJoinQr(token);
  if (!preview) throw new Error("JOIN_QR_INVALID");
  if (!preview.active) throw new Error("PROGRAM_DISABLED");

  const qr = await pool.query<{ organizationId: string }>(
    `SELECT "organizationId" FROM "LoyaltyJoinQr" WHERE token = $1 AND status = 'ACTIVE'`,
    [token.trim().toUpperCase()],
  );
  const organizationId = qr.rows[0]?.organizationId;
  if (!organizationId) throw new Error("JOIN_QR_INVALID");

  let customerId = "";
  let phone = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    customerId = `cust_${randomBytes(6).toString("hex")}`;
    phone = `WL${randomBytes(4).toString("hex")}`;
    try {
      await pool.query(
        `INSERT INTO "Customer" (
          id, "organizationId", "firstName", "lastName", phone, status,
          "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
        ) VALUES ($1, $2, 'Cliente', $3, $4, 'NEW', false, false, false, NOW())`,
        [customerId, organizationId, phone.slice(-4).toUpperCase(), phone],
      );
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "23505" || attempt === 2) throw error;
      customerId = "";
    }
  }
  if (!customerId) throw new Error("JOIN_QR_FAILED");

  const card = await issueLoyaltyCard(organizationId, customerId);
  await pool.query(`UPDATE "Customer" SET "lastName" = $1, "updatedAt" = NOW() WHERE id = $2`, [
    card.publicToken.slice(-4),
    customerId,
  ]);
  return { cardToken: card.publicToken, customerId, organizationId, phone };
}

export async function cardTokenForJoinQr(joinToken: string, cardToken: string): Promise<string | null> {
  const normalizedJoin = joinToken.trim().toUpperCase();
  const normalizedCard = cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(normalizedCard)) return null;
  // Suit l'alias : le jeton d'une carte fusionnée renvoie celui de la carte survivante (le cookie est réécrit).
  const { rows } = await pool.query<{ id: string; publicToken: string }>(
    `SELECT lc.id, lc."publicToken"
     FROM "LoyaltyCard" lc
     ${aliasJoin("al", "lc")}
     JOIN "LoyaltyJoinQr" q ON q."organizationId" = lc."organizationId"
     WHERE al."publicToken" = $1 AND q.token = $2 AND q.status = 'ACTIVE' AND lc.status = 'ACTIVE'`,
    [normalizedCard, normalizedJoin],
  );
  if (!rows[0]) return null;
  await pool.query(`UPDATE "LoyaltyCard" SET "updatedAt" = NOW() WHERE id = $1`, [rows[0].id]);
  return rows[0].publicToken;
}
