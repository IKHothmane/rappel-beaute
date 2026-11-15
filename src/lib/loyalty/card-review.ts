import { randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { aliasJoin } from "@/lib/loyalty/card-alias";
import { normalizeReviewComment } from "@/lib/reviews/public-review";
import { shortCardCode } from "@/lib/loyalty/card-code";
import {
  LOYALTY_NAME_MAX_LENGTH,
  LOYALTY_COMMENT_MAX_LENGTH,
  LOYALTY_PHONE_ALREADY_KNOWN_CODE,
  LOYALTY_PHONE_ALREADY_KNOWN_MESSAGE,
  validLoyaltyPhone,
  normalizeLoyaltyPhone,
  loyaltyPhoneLookupVariants,
} from "@/lib/loyalty/profile-input";
import { recordPhoneAlreadyKnown } from "@/lib/loyalty/phone-conflict";

type LoyaltyCardReviewInvite = {
  slug: string;
  token: string;
  organizationName: string;
  firstName: string;
  serviceName: string;
  alreadySubmitted: boolean;
};

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

type CardRow = { cardId?: string; customerId: string; organizationId: string };

export type LoyaltyProfileFailure = { ok: false; error: string; code?: typeof LOYALTY_PHONE_ALREADY_KNOWN_CODE };

export async function getLoyaltyCardReviewStaff(cardToken: string): Promise<{ id: string; name: string }[]> {
  const token = cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) return [];
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT st.id, TRIM(CONCAT(st."firstName", ' ', st."lastName")) AS name
     FROM "Staff" st
     JOIN "LoyaltyCard" lc ON lc."organizationId" = st."organizationId"
     ${aliasJoin("al", "lc")}
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     WHERE al."publicToken" = $1 AND lc.status = 'ACTIVE'
       AND st."deletedAt" IS NULL AND st.status IN ('ACTIVE', 'ON_LEAVE')
     ORDER BY st."firstName", st."lastName", st.id`,
    [token],
  );
  return rows;
}

/**
 * Consentement WhatsApp marketing envoyé par la carte publique. Strict : seul un booléen est accepté
 * (absent/null = non fourni). Toute autre valeur (chaîne "true", 1, objet...) est refusée plutôt que
 * interprétée, pour ne jamais enregistrer un consentement sans action explicite et sans ambiguïté.
 */
export const MARKETING_WHATSAPP_CONSENT_INVALID_MESSAGE = "Consentement WhatsApp invalide.";
export const MARKETING_WHATSAPP_CONSENT_ACTION = "MARKETING_WHATSAPP_CONSENT";

export function parseMarketingWhatsappConsent(value: unknown): { ok: true; value: boolean } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: false };
  if (typeof value === "boolean") return { ok: true, value };
  return { ok: false };
}

/** Preuve de consentement : aucune donnée personnelle (ni numéro, ni nom), l'identifiant interne de la fiche seulement. */
export const MARKETING_WHATSAPP_CONSENT_AUDIT = JSON.stringify({ source: "loyalty-card", consent: "whatsapp" });

const phoneAlreadyKnown = (): LoyaltyProfileFailure => ({
  ok: false,
  code: LOYALTY_PHONE_ALREADY_KNOWN_CODE,
  error: LOYALTY_PHONE_ALREADY_KNOWN_MESSAGE,
});

/**
 * Met à jour nom/prénom/téléphone en une seule requête : si le numéro appartient déjà à une AUTRE fiche
 * du même institut (quel que soit son ancien format), rien n'est modifié, ni le nom ni le téléphone, et la
 * fiche n'est jamais fusionnée (l'identité n'est pas vérifiée). Le garde NOT EXISTS couvre le cas courant ;
 * l'index unique (organizationId, phone) tranche les envois simultanés (23505, aussi pour une fiche archivée).
 */
async function updateCardCustomer(
  row: CardRow,
  source: "card_profile" | "card_feedback",
  firstName: string,
  lastName: string,
  phone: string,
  marketingWhatsappConsent = false,
): Promise<{ ok: true } | LoyaltyProfileFailure> {
  // Le consentement ne vaut que pour un numéro réellement enregistré dans cette même requête.
  const grantConsent = marketingWhatsappConsent === true && phone !== "";
  const guard = `c.id = $1 AND c."organizationId" = $5 AND c."deletedAt" IS NULL
         AND ($4::text IS NULL OR NOT EXISTS (
           SELECT 1 FROM "Customer" other
           WHERE other."organizationId" = $5 AND other.id <> $1 AND other."deletedAt" IS NULL
             AND other.phone = ANY($6::text[])
         ))`;
  const parameters: unknown[] = [
    row.customerId,
    firstName,
    lastName,
    phone || null,
    row.organizationId,
    loyaltyPhoneLookupVariants(phone),
  ];
  // Sans consentement : l'UPDATE historique, inchangé. Avec consentement : une seule instruction qui
  // met à jour la fiche ET écrit la preuve d'audit (atomique), une seule fois (uniquement si la case
  // n'était pas déjà cochée ; le verrou FOR UPDATE sérialise deux envois simultanés). Jamais de retrait ici.
  let sql: string;
  if (grantConsent) {
    parameters.push(`aud_${randomBytes(8).toString("hex")}`, MARKETING_WHATSAPP_CONSENT_AUDIT);
    sql = `WITH prev AS (
         SELECT id, "marketingWhatsapp" AS was FROM "Customer"
         WHERE id = $1 AND "organizationId" = $5 AND "deletedAt" IS NULL
         FOR UPDATE
       ), upd AS (
         UPDATE "Customer" c
         SET "firstName" = COALESCE(NULLIF($2, ''), c."firstName"),
             "lastName" = COALESCE(NULLIF($3, ''), c."lastName"),
             phone = $4,
             "marketingWhatsapp" = TRUE,
             "updatedAt" = NOW()
         WHERE ${guard}
         RETURNING c.id
       ), consent_audit AS (
         INSERT INTO "AuditLog" (id, "organizationId", "actorId", "actorName", "entityType", "entityId", action, after)
         SELECT $7, $5, NULL, 'Fidélité (public)', 'Customer', upd.id, '${MARKETING_WHATSAPP_CONSENT_ACTION}', $8::jsonb
         FROM upd JOIN prev ON prev.id = upd.id
         WHERE prev.was = FALSE
         RETURNING 1
       )
       SELECT id FROM upd`;
  } else {
    sql = `UPDATE "Customer" c
       SET "firstName" = COALESCE(NULLIF($2, ''), c."firstName"),
           "lastName" = COALESCE(NULLIF($3, ''), c."lastName"),
           phone = CASE WHEN $4::text IS NULL THEN c.phone ELSE $4 END,
           "updatedAt" = NOW()
       WHERE ${guard}
       RETURNING c.id`;
  }
  let updated: number;
  try {
    const result = await pool.query(sql, parameters);
    updated = result.rows.length;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
    if (code !== "23505") throw error;
    updated = 0;
  }
  if (updated > 0) return { ok: true };
  if (phone) {
    const still = await pool.query(
      `SELECT 1 FROM "Customer" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [row.customerId, row.organizationId],
    );
    if (still.rows.length > 0) {
      await recordPhoneAlreadyKnown({
        organizationId: row.organizationId,
        entityType: "LoyaltyCard",
        entityId: row.cardId ?? row.customerId,
        source,
      });
      return phoneAlreadyKnown();
    }
  }
  return { ok: false, error: "Carte introuvable." };
}

export async function saveLoyaltyCardProfile(input: {
  cardToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingWhatsappConsent?: boolean;
}): Promise<{ ok: true; code: string } | LoyaltyProfileFailure> {
  const token = input.cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) return { ok: false, error: "Carte introuvable." };
  const firstName = input.firstName.replace(/\s+/g, " ").trim();
  const lastName = input.lastName.replace(/\s+/g, " ").trim();
  if (firstName.length > LOYALTY_NAME_MAX_LENGTH || lastName.length > LOYALTY_NAME_MAX_LENGTH) {
    return { ok: false, error: "Indiquez le prénom et le nom." };
  }
  if (input.phone.trim() && !validLoyaltyPhone(input.phone)) return { ok: false, error: "Indiquez un numéro de téléphone valide." };
  const phone = normalizeLoyaltyPhone(input.phone);
  const card = await pool.query<CardRow>(
    `SELECT lc.id AS "cardId", lc."customerId", lc."organizationId"
     FROM "LoyaltyCard" lc
     ${aliasJoin("al", "lc")}
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = lc."customerId" AND c."deletedAt" IS NULL
     WHERE al."publicToken" = $1 AND lc.status = 'ACTIVE'`,
    [token],
  );
  const row = card.rows[0];
  if (!row) return { ok: false, error: "Carte introuvable." };
  const saved = await updateCardCustomer(row, "card_profile", firstName, lastName, phone, input.marketingWhatsappConsent === true);
  if (!saved.ok) return saved;
  return { ok: true, code: shortCardCode(token) };
}

export async function submitLoyaltyCardFeedback(input: {
  cardToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingWhatsappConsent?: boolean;
  rating?: number | null;
  comment: string;
  staffId?: string;
  staffRating?: number;
  staffRatings?: { staffId: string; rating?: number | null }[];
}): Promise<{ ok: true } | LoyaltyProfileFailure> {
  const token = input.cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) {
    return { ok: false, error: "Carte introuvable." };
  }

  const firstName = input.firstName.replace(/\s+/g, " ").trim();
  const lastName = input.lastName.replace(/\s+/g, " ").trim();
  if (firstName.length > LOYALTY_NAME_MAX_LENGTH || lastName.length > LOYALTY_NAME_MAX_LENGTH) {
    return { ok: false, error: "Indiquez le prénom et le nom." };
  }

  if (input.phone.trim() && !validLoyaltyPhone(input.phone)) {
    return { ok: false, error: "Indiquez un numéro de téléphone valide." };
  }
  const phone = normalizeLoyaltyPhone(input.phone);

  const rating = input.rating ?? null;
  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { ok: false, error: "Choisissez une note de 1 à 5." };
  }
  const comment = normalizeReviewComment(input.comment);
  if (comment.length > LOYALTY_COMMENT_MAX_LENGTH) {
    return { ok: false, error: "Le commentaire ne doit pas dépasser 800 caractères." };
  }
  if (!input.staffId?.trim() && input.staffRating != null && input.staffRatings == null) {
    return { ok: false, error: "Sélectionnez l’employé à noter." };
  }
  const entries = input.staffRatings ?? (input.staffId?.trim() ? [{ staffId: input.staffId, rating: input.staffRating }] : []);
  if (!Array.isArray(entries) || entries.length > 200) return { ok: false, error: "La sélection des employés n’est pas valide." };
  const staffFeedback: { staffId: string; rating: number | null }[] = [];
  const selectedIds = new Set<string>();
  for (const entry of entries) {
    if (!entry || typeof entry.staffId !== "string" || !entry.staffId.trim() || entry.staffId.trim().length > 160) {
      return { ok: false, error: "La sélection des employés n’est pas valide." };
    }
    const id = entry.staffId.trim();
    const score = entry.rating ?? null;
    if (selectedIds.has(id) || (score != null && (!Number.isInteger(score) || score < 1 || score > 5))) {
      return { ok: false, error: "Vérifiez les employés sélectionnés et leurs notes de 1 à 5." };
    }
    selectedIds.add(id);
    staffFeedback.push({ staffId: id, rating: score });
  }
  const staffId = staffFeedback.length === 1 ? staffFeedback[0].staffId : null;
  const staffRating = staffFeedback.length === 1 ? staffFeedback[0].rating : null;
  const staffJson = JSON.stringify(staffFeedback);

  // A single SQL statement saves the review and every employee score atomically.
  const withStaffRatings = (sql: string, parameter: number) => `WITH saved_review AS (
    ${sql} RETURNING id
  ) INSERT INTO "ReviewStaffRating" ("reviewId", "staffId", rating)
    SELECT saved_review.id, item."staffId", item.rating
    FROM saved_review CROSS JOIN jsonb_to_recordset($${parameter}::jsonb) AS item("staffId" text, rating integer)
    ON CONFLICT ("reviewId", "staffId") DO UPDATE
    SET rating = COALESCE(EXCLUDED.rating, "ReviewStaffRating".rating)`;

  const card = await pool.query<CardRow>(
    `SELECT lc.id AS "cardId", lc."customerId", lc."organizationId"
     FROM "LoyaltyCard" lc
     ${aliasJoin("al", "lc")}
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = lc."customerId" AND c."deletedAt" IS NULL
     WHERE al."publicToken" = $1 AND lc.status = 'ACTIVE'`,
    [token],
  );
  const row = card.rows[0];
  if (!row) return { ok: false, error: "Carte introuvable." };

  for (const selected of staffFeedback) {
    const staff = await pool.query<{ id: string }>(
      `SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2
       AND "deletedAt" IS NULL AND status IN ('ACTIVE', 'ON_LEAVE')`,
      [selected.staffId, row.organizationId],
    );
    if (staff.rows[0]?.id !== selected.staffId) return { ok: false, error: "Cet employé n’est pas disponible dans cet institut." };
  }
  // Numéro déjà connu : on s'arrête avant tout enregistrement (ni profil partiel, ni avis) pour que la cliente corrige et renvoie.
  const saved = await updateCardCustomer(row, "card_feedback", firstName, lastName, phone, input.marketingWhatsappConsent === true);
  if (!saved.ok) return saved;

  // An empty form can save the card details without creating an empty review.
  if (rating == null && !comment && staffFeedback.length === 0) return { ok: true };

  const appointment = await pool.query<{ id: string }>(
    `SELECT a.id
     FROM "Appointment" a
     WHERE a."organizationId" = $1
       AND a."customerId" = $2
       AND a.status = 'COMPLETED'
       AND NOT EXISTS (SELECT 1 FROM "Review" r WHERE r."appointmentId" = a.id)
     ORDER BY a."endAt" DESC
     LIMIT 1`,
    [row.organizationId, row.customerId],
  );

  if (appointment.rows[0]) {
    try {
      await pool.query(
        withStaffRatings(`INSERT INTO "Review" (
           id, "organizationId", "customerId", "appointmentId", "reviewRequestId",
           rating, comment, "staffId", "staffRating", status, "updatedAt"
         ) VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,'PENDING',NOW())`, 9),
        [
          `prev_${randomBytes(8).toString("hex")}`,
          row.organizationId,
          row.customerId,
          appointment.rows[0].id,
          rating,
          comment,
          staffId,
          staffRating,
          staffJson,
        ],
      );
      return { ok: true };
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
      // Another submission may have claimed the appointment; retain this as a card review.
      if (code !== "23505") throw error;
    }
  }

  await pool.query(
    withStaffRatings(`INSERT INTO "Review" (
       id, "organizationId", "customerId", "appointmentId", "reviewRequestId",
       rating, comment, "staffId", "staffRating", status, "updatedAt"
     ) VALUES ($1,$2,$3,NULL,NULL,$4,$5,$6,$7,'PENDING',NOW())`, 8),
    [
      `prev_${randomBytes(8).toString("hex")}`,
      row.organizationId,
      row.customerId,
      rating,
      comment,
      staffId,
      staffRating,
      staffJson,
    ],
  );
  return { ok: true };
}
