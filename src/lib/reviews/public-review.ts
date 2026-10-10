import { randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { writeAuditLog } from "@/lib/db/audit";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REVIEW_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const PUBLIC_REVIEW_TOKEN = /^RBREV_[A-Z2-9]{16,32}$/;

export type PublicReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED" | "REPORTED";

export type ReviewGateCode =
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "ORG_MISMATCH"
  | "NOT_ELIGIBLE"
  | "DUPLICATE"
  | "RATING_INVALID"
  | "COMMENT_INVALID";

export function newPublicReviewToken() {
  const bytes = randomBytes(20);
  let body = "";
  for (let i = 0; i < 20; i++) body += ALPHABET[bytes[i]! % ALPHABET.length];
  return `RBREV_${body}`;
}

export function reviewTokenExpiry(from = new Date()) {
  return new Date(from.getTime() + REVIEW_TOKEN_TTL_MS);
}

export function publicReviewPath(slug: string, token: string) {
  return `/book/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(token)}/`;
}

export function normalizeReviewComment(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function evaluateReviewSubmission(input: {
  slugOrganizationId: string;
  request: {
    organizationId: string;
    customerId: string;
    status: string;
    tokenExpiresAt: Date;
    hasReview: boolean;
  } | null;
  appointment: { organizationId: string; customerId: string; status: string } | null;
  rating: number;
  comment: string;
  now?: Date;
}): { ok: true } | { ok: false; code: ReviewGateCode } {
  const now = input.now ?? new Date();
  if (!input.request) return { ok: false, code: "TOKEN_INVALID" };
  if (input.request.organizationId !== input.slugOrganizationId) {
    return { ok: false, code: "ORG_MISMATCH" };
  }
  if (
    !input.appointment ||
    input.appointment.organizationId !== input.slugOrganizationId ||
    input.appointment.customerId !== input.request.customerId
  ) {
    return { ok: false, code: "ORG_MISMATCH" };
  }
  if (input.request.tokenExpiresAt.getTime() <= now.getTime()) {
    return { ok: false, code: "TOKEN_EXPIRED" };
  }
  if (input.request.status === "CANCELLED" || input.request.status === "SKIPPED") {
    return { ok: false, code: "NOT_ELIGIBLE" };
  }
  if (input.appointment.status !== "COMPLETED") return { ok: false, code: "NOT_ELIGIBLE" };
  if (input.request.hasReview) return { ok: false, code: "DUPLICATE" };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, code: "RATING_INVALID" };
  }
  const comment = normalizeReviewComment(input.comment);
  if (comment.length < 8 || comment.length > 800) return { ok: false, code: "COMMENT_INVALID" };
  return { ok: true };
}

type LoadedRequest = {
  id: string;
  organizationId: string;
  customerId: string;
  appointmentId: string;
  status: string;
  tokenExpiresAt: Date;
  hasReview: boolean;
  appointmentStatus: string;
  appointmentOrgId: string;
  appointmentCustomerId: string;
  firstName: string;
  serviceName: string;
  organizationName: string;
};

async function loadByToken(slug: string, token: string): Promise<LoadedRequest | null> {
  const normalized = token.trim().toUpperCase();
  if (!PUBLIC_REVIEW_TOKEN.test(normalized)) return null;
  const { rows } = await pool.query<LoadedRequest>(
    `SELECT rr.id, rr."organizationId", rr."customerId", rr."appointmentId", rr.status::text AS status,
            rr."tokenExpiresAt",
            EXISTS(SELECT 1 FROM "Review" r WHERE r."appointmentId" = rr."appointmentId") AS "hasReview",
            a.status::text AS "appointmentStatus",
            a."organizationId" AS "appointmentOrgId",
            a."customerId" AS "appointmentCustomerId",
            c."firstName" AS "firstName",
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName",
            o.name AS "organizationName"
     FROM "ReviewRequest" rr
     JOIN "Organization" o ON o.id = rr."organizationId" AND o.slug = $2 AND o.status = 'ACTIVE'
     JOIN "Appointment" a ON a.id = rr."appointmentId"
     JOIN "Customer" c ON c.id = rr."customerId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE rr."publicToken" = $1`,
    [normalized, slug],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row, tokenExpiresAt: new Date(row.tokenExpiresAt), hasReview: Boolean(row.hasReview) };
}

export async function previewPublicReview(slug: string, token: string) {
  const row = await loadByToken(slug, token);
  if (!row) return { ok: false as const, code: "TOKEN_INVALID" as const };
  const gate = evaluateReviewSubmission({
    slugOrganizationId: row.organizationId,
    request: row,
    appointment: {
      organizationId: row.appointmentOrgId,
      customerId: row.appointmentCustomerId,
      status: row.appointmentStatus,
    },
    rating: 5,
    comment: "aperçu valide",
  });
  if (!gate.ok && gate.code !== "DUPLICATE") return gate;
  return {
    ok: true as const,
    organizationName: row.organizationName,
    firstName: row.firstName,
    serviceName: row.serviceName,
    alreadySubmitted: row.hasReview,
  };
}

export async function submitPublicReview(input: { slug: string; token: string; rating: number; comment: string }) {
  const row = await loadByToken(input.slug, input.token);
  const slugOrg = row?.organizationId ?? "";
  const gate = evaluateReviewSubmission({
    slugOrganizationId: slugOrg,
    request: row,
    appointment: row
      ? {
          organizationId: row.appointmentOrgId,
          customerId: row.appointmentCustomerId,
          status: row.appointmentStatus,
        }
      : null,
    rating: input.rating,
    comment: input.comment,
  });
  if (!gate.ok) return gate;
  if (!row) return { ok: false as const, code: "TOKEN_INVALID" as const };
  const comment = normalizeReviewComment(input.comment);
  try {
    await pool.query(
      `INSERT INTO "Review" (
         id, "organizationId", "customerId", "appointmentId", "reviewRequestId",
         rating, comment, status, "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',NOW())`,
      [`prev_${randomBytes(8).toString("hex")}`, row.organizationId, row.customerId, row.appointmentId, row.id, input.rating, comment],
    );
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
    if (code === "23505") return { ok: false as const, code: "DUPLICATE" as const };
    throw error;
  }
  return { ok: true as const };
}

export async function listPublishedReviews(slug: string) {
  const { rows } = await pool.query<{
    id: string;
    rating: number;
    comment: string;
    createdAt: Date;
    firstName: string;
    serviceName: string;
    organizationName: string;
  }>(
    `SELECT r.id, r.rating, r.comment, r."createdAt", c."firstName" AS "firstName",
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName",
            o.name AS "organizationName"
     FROM "Review" r
     JOIN "Organization" o ON o.id = r."organizationId" AND o.slug = $1 AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = r."customerId"
     JOIN "Appointment" a ON a.id = r."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE r.status = 'PUBLISHED'
     ORDER BY r."createdAt" DESC
     LIMIT 40`,
    [slug],
  );
  return {
    organizationName: rows[0]?.organizationName ?? null,
    reviews: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      firstName: row.firstName,
      serviceName: row.serviceName,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
  };
}

export async function reportPublishedReview(slug: string, reviewId: string, reason: string) {
  const text = normalizeReviewComment(reason);
  if (text.length < 3 || text.length > 300) return false;
  const { rowCount } = await pool.query(
    `UPDATE "Review" r
     SET status = 'REPORTED', "reportReason" = $3, "reportedAt" = NOW(), "updatedAt" = NOW()
     FROM "Organization" o
     WHERE r.id = $2 AND r."organizationId" = o.id AND o.slug = $1 AND o.status = 'ACTIVE'
       AND r.status = 'PUBLISHED'`,
    [slug, reviewId, text],
  );
  return (rowCount ?? 0) > 0;
}

export async function listInstituteReviews(organizationId: string) {
  const { rows } = await pool.query<{
    id: string;
    rating: number;
    comment: string;
    status: PublicReviewStatus;
    createdAt: Date;
    firstName: string;
    lastName: string;
    serviceName: string;
    reportReason: string | null;
  }>(
    `SELECT r.id, r.rating, r.comment, r.status::text AS status, r."createdAt",
            c."firstName", c."lastName",
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName",
            r."reportReason"
     FROM "Review" r
     JOIN "Customer" c ON c.id = r."customerId"
     JOIN "Appointment" a ON a.id = r."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE r."organizationId" = $1
     ORDER BY r."createdAt" DESC
     LIMIT 80`,
    [organizationId],
  );
  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString(),
    customerName: `${row.firstName} ${row.lastName}`.trim(),
    serviceName: row.serviceName,
    reportReason: row.reportReason,
  }));
}

export async function moderateInstituteReview(opts: {
  organizationId: string;
  reviewId: string;
  action: "publish" | "reject" | "report";
  reason?: string;
  actorId: string;
  actorName?: string | null;
}) {
  const next =
    opts.action === "publish" ? "PUBLISHED" : opts.action === "reject" ? "REJECTED" : "REPORTED";
  const reason = opts.reason ? normalizeReviewComment(opts.reason) : null;
  if (opts.action === "report" && (!reason || reason.length < 3)) return false;
  const { rowCount } = await pool.query(
    `UPDATE "Review"
     SET status = $3::"PublicReviewStatus",
         "publishedAt" = CASE WHEN $3 = 'PUBLISHED' THEN NOW() ELSE "publishedAt" END,
         "moderatedAt" = NOW(),
         "moderatedById" = $4,
         "reportReason" = CASE WHEN $3 = 'REPORTED' THEN $5 ELSE "reportReason" END,
         "reportedAt" = CASE WHEN $3 = 'REPORTED' THEN NOW() ELSE "reportedAt" END,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1`,
    [opts.organizationId, opts.reviewId, next, opts.actorId, reason],
  );
  if (!rowCount) return false;
  await writeAuditLog({
    organizationId: opts.organizationId,
    actorId: opts.actorId,
    actorName: opts.actorName,
    entityType: "Review",
    entityId: opts.reviewId,
    action: `REVIEW_${next}`,
    after: { status: next },
  });
  return true;
}
