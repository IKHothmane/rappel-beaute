import { randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { normalizeReviewComment } from "@/lib/reviews/public-review";
import { shortCardCode } from "@/lib/loyalty/card-code";
import { LOYALTY_NAME_MAX_LENGTH, LOYALTY_COMMENT_MAX_LENGTH, validLoyaltyPhone, normalizeLoyaltyPhone } from "@/lib/loyalty/profile-input";

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

type CardRow = { customerId: string; organizationId: string };

export async function getLoyaltyCardReviewStaff(cardToken: string): Promise<{ id: string; name: string }[]> {
  const token = cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) return [];
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT st.id, TRIM(CONCAT(st."firstName", ' ', st."lastName")) AS name
     FROM "Staff" st
     JOIN "LoyaltyCard" lc ON lc."organizationId" = st."organizationId"
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'
       AND st."deletedAt" IS NULL AND st.status IN ('ACTIVE', 'ON_LEAVE')
     ORDER BY st."firstName", st."lastName", st.id`,
    [token],
  );
  return rows;
}

/** Met à jour nom/prénom/téléphone. Un téléphone déjà pris n'empêche pas l'enregistrement. */
async function updateCardCustomer(row: CardRow, firstName: string, lastName: string, phoneDigits: string) {
  const run = (phone: string | null) =>
    pool.query(
      `UPDATE "Customer"
       SET "firstName" = COALESCE(NULLIF($2, ''), "firstName"),
           "lastName" = COALESCE(NULLIF($3, ''), "lastName"),
           phone = CASE WHEN $4::text IS NULL THEN phone ELSE $4 END,
           "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $5 AND "deletedAt" IS NULL`,
      [row.customerId, firstName, lastName, phone, row.organizationId],
    );
  try {
    await run(phoneDigits || null);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
    if (code !== "23505") throw error;
    await run(null);
  }
}

export async function saveLoyaltyCardProfile(input: {
  cardToken: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const token = input.cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) return { ok: false, error: "Carte introuvable." };
  const firstName = input.firstName.replace(/\s+/g, " ").trim();
  const lastName = input.lastName.replace(/\s+/g, " ").trim();
  if (firstName.length > LOYALTY_NAME_MAX_LENGTH || lastName.length > LOYALTY_NAME_MAX_LENGTH) {
    return { ok: false, error: "Indiquez le prénom et le nom." };
  }
  if (input.phone.trim() && !validLoyaltyPhone(input.phone)) return { ok: false, error: "Indiquez un numéro de téléphone valide." };
  const phoneDigits = normalizeLoyaltyPhone(input.phone);
  const card = await pool.query<CardRow>(
    `SELECT lc."customerId", lc."organizationId"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = lc."customerId" AND c."deletedAt" IS NULL
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'`,
    [token],
  );
  const row = card.rows[0];
  if (!row) return { ok: false, error: "Carte introuvable." };
  await updateCardCustomer(row, firstName, lastName, phoneDigits);
  return { ok: true, code: shortCardCode(token) };
}

export async function submitLoyaltyCardFeedback(input: {
  cardToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  rating?: number | null;
  comment: string;
  staffId?: string;
  staffRating?: number;
  staffRatings?: { staffId: string; rating?: number | null }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = input.cardToken.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(token)) {
    return { ok: false, error: "Carte introuvable." };
  }

  const firstName = input.firstName.replace(/\s+/g, " ").trim();
  const lastName = input.lastName.replace(/\s+/g, " ").trim();
  if (firstName.length > LOYALTY_NAME_MAX_LENGTH || lastName.length > LOYALTY_NAME_MAX_LENGTH) {
    return { ok: false, error: "Indiquez le prénom et le nom." };
  }

  const phoneDigits = normalizeLoyaltyPhone(input.phone);
  if (input.phone.trim() && !validLoyaltyPhone(input.phone)) {
    return { ok: false, error: "Indiquez un numéro de téléphone valide." };
  }

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

  for (const selected of staffFeedback) {
    const staff = await pool.query<{ id: string }>(
      `SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2
       AND "deletedAt" IS NULL AND status IN ('ACTIVE', 'ON_LEAVE')`,
      [selected.staffId, row.organizationId],
    );
    if (staff.rows[0]?.id !== selected.staffId) return { ok: false, error: "Cet employé n’est pas disponible dans cet institut." };
  }
  await updateCardCustomer(row, firstName, lastName, phoneDigits);

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
