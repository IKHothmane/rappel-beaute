import { randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { getOrCreateReviewSettings } from "@/lib/db/reviews";
import {
  newPublicReviewToken,
  normalizeReviewComment,
  reviewTokenExpiry,
} from "@/lib/reviews/public-review";
import { limitPhoneDigits } from "@/lib/validation/customer";

export type LoyaltyCardReviewInvite = {
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

/**
 * Invite d’avis pour une cliente qui ouvre / scanne sa carte fidélité.
 * Réutilise ReviewRequest existante, sinon en crée une (sans WhatsApp) pour le dernier RDV terminé.
 */
export async function getLoyaltyCardReviewInvite(
  cardToken: string,
): Promise<LoyaltyCardReviewInvite | null> {
  const normalized = cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(normalized)) return null;

  const card = await pool.query<{
    customerId: string;
    organizationId: string;
    slug: string;
    organizationName: string;
    firstName: string;
  }>(
    `SELECT lc."customerId", lc."organizationId", o.slug, o.name AS "organizationName", c."firstName"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = lc."customerId" AND c."deletedAt" IS NULL
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'`,
    [normalized],
  );
  const row = card.rows[0];
  if (!row) return null;

  const settings = await getOrCreateReviewSettings(row.organizationId);
  if (!settings.enabled) return null;

  const existing = await pool.query<{
    publicToken: string;
    serviceName: string;
    hasReview: boolean;
  }>(
    `SELECT rr."publicToken",
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName",
            EXISTS(SELECT 1 FROM "Review" r WHERE r."appointmentId" = rr."appointmentId") AS "hasReview"
     FROM "ReviewRequest" rr
     JOIN "Appointment" a ON a.id = rr."appointmentId" AND a.status = 'COMPLETED'
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE rr."organizationId" = $1
       AND rr."customerId" = $2
       AND rr.status IN ('PENDING', 'SENT')
       AND rr."tokenExpiresAt" > NOW()
     ORDER BY rr."scheduledFor" DESC
     LIMIT 1`,
    [row.organizationId, row.customerId],
  );

  if (existing.rows[0]) {
    const invite = existing.rows[0];
    if (invite.hasReview) return null;
    return {
      slug: row.slug,
      token: invite.publicToken,
      organizationName: row.organizationName,
      firstName: row.firstName,
      serviceName: invite.serviceName,
      alreadySubmitted: false,
    };
  }

  const apt = await pool.query<{
    id: string;
    serviceName: string;
  }>(
    `SELECT a.id,
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName"
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a."customerId" = $2
       AND a.status = 'COMPLETED'
       AND a."endAt" <= NOW()
       AND a."endAt" >= NOW() - INTERVAL '45 days'
       AND NOT EXISTS (SELECT 1 FROM "Review" r WHERE r."appointmentId" = a.id)
       AND NOT EXISTS (SELECT 1 FROM "ReviewRequest" rr WHERE rr."appointmentId" = a.id)
     ORDER BY a."endAt" DESC
     LIMIT 1`,
    [row.organizationId, row.customerId],
  );
  const appointment = apt.rows[0];
  if (!appointment) return null;

  const publicToken = newPublicReviewToken();
  const tokenExpiresAt = reviewTokenExpiry();
  const requestId = newId("rev");

  const inserted = await pool.query<{ publicToken: string }>(
    `INSERT INTO "ReviewRequest" (
       id, "organizationId", "customerId", "appointmentId", "whatsappTaskId",
       status, "scheduledFor", "publicToken", "tokenExpiresAt", "updatedAt"
     ) VALUES (
       $1,$2,$3,$4,NULL,'PENDING'::"ReviewRequestStatus",NOW(),$5,$6,NOW()
     )
     ON CONFLICT ("appointmentId") DO NOTHING
     RETURNING "publicToken"`,
    [
      requestId,
      row.organizationId,
      row.customerId,
      appointment.id,
      publicToken,
      tokenExpiresAt,
    ],
  );

  let token = inserted.rows[0]?.publicToken ?? null;
  if (!token) {
    const fallback = await pool.query<{ publicToken: string; hasReview: boolean }>(
      `SELECT rr."publicToken",
              EXISTS(SELECT 1 FROM "Review" r WHERE r."appointmentId" = rr."appointmentId") AS "hasReview"
       FROM "ReviewRequest" rr
       WHERE rr."appointmentId" = $1
         AND rr.status IN ('PENDING', 'SENT')
         AND rr."tokenExpiresAt" > NOW()`,
      [appointment.id],
    );
    if (!fallback.rows[0] || fallback.rows[0].hasReview) return null;
    token = fallback.rows[0].publicToken;
  }

  return {
    slug: row.slug,
    token,
    organizationName: row.organizationName,
    firstName: row.firstName,
    serviceName: appointment.serviceName,
    alreadySubmitted: false,
  };
}

export async function submitLoyaltyCardFeedback(input: {
  cardToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  rating: number;
  comment: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = input.cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) {
    return { ok: false, error: "Carte introuvable." };
  }

  const firstName = input.firstName.replace(/\s+/g, " ").trim();
  const lastName = input.lastName.replace(/\s+/g, " ").trim();
  if (firstName.length < 1 || firstName.length > 80 || lastName.length < 1 || lastName.length > 80) {
    return { ok: false, error: "Indiquez le prénom et le nom." };
  }

  const phoneDigits = limitPhoneDigits(input.phone);
  if (input.phone.trim() && phoneDigits.length < 8) {
    return { ok: false, error: "Le téléphone doit contenir au moins 8 chiffres." };
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Choisissez une note de 1 à 5." };
  }
  const comment = normalizeReviewComment(input.comment);
  if (comment.length < 8 || comment.length > 800) {
    return { ok: false, error: "Le commentaire doit contenir entre 8 et 800 caractères." };
  }

  const card = await pool.query<{ customerId: string; organizationId: string }>(
    `SELECT lc."customerId", lc."organizationId"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = lc."customerId" AND c."deletedAt" IS NULL
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'`,
    [token],
  );
  const row = card.rows[0];
  if (!row) return { ok: false, error: "Carte introuvable." };

  try {
    await pool.query(
      `UPDATE "Customer"
       SET "firstName" = $2,
           "lastName" = $3,
           phone = CASE WHEN $4::text IS NULL THEN phone ELSE $4 END,
           "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $5 AND "deletedAt" IS NULL`,
      [row.customerId, firstName, lastName, phoneDigits || null, row.organizationId],
    );
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
    if (code === "23505") {
      return { ok: false, error: "Ce téléphone est déjà utilisé par une autre cliente." };
    }
    throw error;
  }

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
        `INSERT INTO "Review" (
           id, "organizationId", "customerId", "appointmentId", "reviewRequestId",
           rating, comment, status, "updatedAt"
         ) VALUES ($1,$2,$3,$4,NULL,$5,$6,'PENDING',NOW())`,
        [
          `prev_${randomBytes(8).toString("hex")}`,
          row.organizationId,
          row.customerId,
          appointment.rows[0].id,
          input.rating,
          comment,
        ],
      );
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
      if (code === "23505") {
        return { ok: false, error: "Un avis existe déjà pour ce rendez-vous." };
      }
      throw error;
    }
    return { ok: true };
  }

  const existing = await pool.query<{ id: string; status: string }>(
    `SELECT id, status::text AS status
     FROM "Review"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "appointmentId" IS NULL
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    [row.organizationId, row.customerId],
  );
  if (existing.rows[0]?.status === "PENDING") {
    await pool.query(
      `UPDATE "Review" SET rating = $2, comment = $3, "updatedAt" = NOW() WHERE id = $1`,
      [existing.rows[0].id, input.rating, comment],
    );
    return { ok: true };
  }
  if (existing.rows[0]) {
    return { ok: false, error: "Un avis a déjà été enregistré pour cette carte." };
  }

  await pool.query(
    `INSERT INTO "Review" (
       id, "organizationId", "customerId", "appointmentId", "reviewRequestId",
       rating, comment, status, "updatedAt"
     ) VALUES ($1,$2,$3,NULL,NULL,$4,$5,'PENDING',NOW())`,
    [
      `prev_${randomBytes(8).toString("hex")}`,
      row.organizationId,
      row.customerId,
      input.rating,
      comment,
    ],
  );
  return { ok: true };
}
