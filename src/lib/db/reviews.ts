import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import {
  buildWaMeLink,
  ensureDefaultTemplates,
  renderTemplateBody,
} from "@/lib/db/whatsapp";
import type {
  ReviewAlertItem,
  ReviewKpis,
  ReviewRequestItem,
  ReviewRequestStatus,
  ReviewSatisfaction,
  ReviewSettings,
  UpdateReviewSettingsInput,
} from "@/types/review";
import { REVIEW_SATISFACTION_SCORE } from "@/types/review";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  });
}

function formatTimeFr(d: Date): string {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

function mapSettings(r: Record<string, unknown>): ReviewSettings {
  return {
    googleReviewUrl: (r.googleReviewUrl as string) ?? null,
    delayHours: Number(r.delayHours) || 3,
    maxWindowHours: Number(r.maxWindowHours) || 24,
    enabled: Boolean(r.enabled),
  };
}

export async function getOrCreateReviewSettings(organizationId: string): Promise<ReviewSettings> {
  const { rows } = await pool.query(
    `SELECT * FROM "ReviewSettings" WHERE "organizationId" = $1`,
    [organizationId],
  );
  if (rows[0]) return mapSettings(rows[0] as Record<string, unknown>);

  const id = newId("rset");
  await pool.query(
    `INSERT INTO "ReviewSettings" (id, "organizationId", "updatedAt") VALUES ($1,$2,NOW())`,
    [id, organizationId],
  );
  const created = await pool.query(`SELECT * FROM "ReviewSettings" WHERE "organizationId" = $1`, [
    organizationId,
  ]);
  return mapSettings(created.rows[0] as Record<string, unknown>);
}

export async function updateReviewSettings(
  organizationId: string,
  input: UpdateReviewSettingsInput,
  actor: { id: string; name?: string | null },
): Promise<ReviewSettings> {
  await getOrCreateReviewSettings(organizationId);
  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (input.googleReviewUrl !== undefined) {
    sets.push(`"googleReviewUrl" = $${pi}`);
    params.push(input.googleReviewUrl || null);
    pi++;
  }
  if (input.delayHours !== undefined) {
    sets.push(`"delayHours" = $${pi}`);
    params.push(Math.max(1, Math.min(72, input.delayHours)));
    pi++;
  }
  if (input.maxWindowHours !== undefined) {
    sets.push(`"maxWindowHours" = $${pi}`);
    params.push(Math.max(input.delayHours ?? 3, Math.min(168, input.maxWindowHours)));
    pi++;
  }
  if (input.enabled !== undefined) {
    sets.push(`enabled = $${pi}`);
    params.push(input.enabled);
    pi++;
  }

  await pool.query(
    `UPDATE "ReviewSettings" SET ${sets.join(", ")} WHERE "organizationId" = $1`,
    params,
  );

  await writeAuditLog({
    organizationId,
    entityType: "ReviewSettings",
    entityId: organizationId,
    action: "UPDATE",
    actorId: actor.id,
    actorName: actor.name,
    after: input,
  });

  return getOrCreateReviewSettings(organizationId);
}

async function getDefaultReviewTemplate(organizationId: string) {
  const { rows } = await pool.query<{ id: string; body: string }>(
    `SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = 'REVIEW_REQUEST'::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC LIMIT 1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

async function loadOrg(organizationId: string, googleReviewUrl: string | null) {
  const { rows } = await pool.query<{ name: string; phone: string | null; address: string | null }>(
    `SELECT name, phone, address FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  const org = rows[0] ?? { name: "", phone: "", address: "" };
  return {
    name: org.name,
    phone: org.phone ?? "",
    address: org.address ?? "",
    googleReviewUrl: googleReviewUrl ?? "",
  };
}

/** Génère ReviewRequest + WhatsAppTask pour RDV COMPLETED éligibles (idempotent) */
export async function syncReviewRequests(organizationId: string): Promise<void> {
  const settings = await getOrCreateReviewSettings(organizationId);
  if (!settings.enabled) return;

  await ensureDefaultTemplates(organizationId);
  const tpl = await getDefaultReviewTemplate(organizationId);
  if (!tpl) return;

  const orgCtx = await loadOrg(organizationId, settings.googleReviewUrl);

  const { rows: aptRows } = await pool.query<{
    id: string;
    customerId: string;
    phone: string;
    firstName: string;
    lastName: string;
    startAt: Date;
    endAt: Date;
    serviceName: string;
    staffFirstName: string;
  }>(
    `SELECT a.id, a."customerId", c.phone, c."firstName", c."lastName",
            a."startAt", a."endAt", s.name AS "serviceName", st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."organizationId" = $1
       AND a.status = 'COMPLETED'
       AND a."endAt" <= NOW() - ($2 || ' hours')::interval
       AND a."endAt" >= NOW() - ($3 || ' hours')::interval
       AND c."deletedAt" IS NULL
       AND c.phone IS NOT NULL AND c.phone <> ''
       AND NOT EXISTS (SELECT 1 FROM "ReviewRequest" rr WHERE rr."appointmentId" = a.id)`,
    [organizationId, String(settings.delayHours), String(settings.maxWindowHours)],
  );

  for (const apt of aptRows) {
    const startAt = new Date(apt.startAt);
    const message = renderTemplateBody(tpl.body, {
      customer: { firstName: apt.firstName, lastName: apt.lastName },
      appointment: { date: formatDateFr(startAt), time: formatTimeFr(startAt) },
      service: { name: apt.serviceName, price: "" },
      staff: { firstName: apt.staffFirstName },
      organization: orgCtx,
    });

    const reviewId = newId("rev");
    const taskId = newId("wtask");
    const idempotencyKey = `review:${apt.id}`;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const taskRes = await client.query(
        `INSERT INTO "WhatsAppTask" (
          id, "organizationId", "customerId", "appointmentId", "templateId", type, status,
          "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,'REVIEW_REQUEST'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
          $6,$7,NOW(),$8,NOW()
        )
        ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING
        RETURNING id`,
        [taskId, organizationId, apt.customerId, apt.id, tpl.id, message, apt.phone, idempotencyKey],
      );

      let waTaskId = taskRes.rows[0]?.id as string | undefined;
      if (!waTaskId) {
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM "WhatsAppTask" WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
          [organizationId, idempotencyKey],
        );
        waTaskId = existing.rows[0]?.id;
      }
      if (!waTaskId) {
        await client.query("ROLLBACK");
        continue;
      }

      await client.query(
        `INSERT INTO "ReviewRequest" (
          id, "organizationId", "customerId", "appointmentId", "whatsappTaskId",
          status, "scheduledFor", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,'PENDING'::"ReviewRequestStatus",NOW(),NOW()
        )
        ON CONFLICT ("appointmentId") DO NOTHING`,
        [reviewId, organizationId, apt.customerId, apt.id, waTaskId],
      );

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // Annuler demandes liées à RDV non terminés / annulés
  await pool.query(
    `UPDATE "ReviewRequest" rr
     SET status = 'CANCELLED'::"ReviewRequestStatus", "updatedAt" = NOW()
     FROM "Appointment" a
     WHERE rr."appointmentId" = a.id
       AND rr."organizationId" = $1
       AND rr.status = 'PENDING'::"ReviewRequestStatus"
       AND a.status IN ('CANCELLED','NO_SHOW')`,
    [organizationId],
  );
}

export async function getReviewKpis(organizationId: string): Promise<ReviewKpis> {
  const { rows } = await pool.query<{
    pendingToSend: number;
    sentThisMonth: number;
    recordedCount: number;
    avgScore: string | null;
    satisfiedPct: string | null;
  }>(
    `SELECT
      (SELECT COUNT(*)::int FROM "ReviewRequest"
       WHERE "organizationId" = $1 AND status = 'PENDING'::"ReviewRequestStatus") AS "pendingToSend",
      (SELECT COUNT(*)::int FROM "ReviewRequest"
       WHERE "organizationId" = $1 AND status = 'SENT'::"ReviewRequestStatus"
         AND "sentAt" >= date_trunc('month', NOW())) AS "sentThisMonth",
      (SELECT COUNT(*)::int FROM "ReviewRequest"
       WHERE "organizationId" = $1 AND satisfaction IS NOT NULL) AS "recordedCount",
      (SELECT AVG(
         CASE satisfaction
           WHEN 'VERY_SATISFIED' THEN 5
           WHEN 'SATISFIED' THEN 4
           WHEN 'DISSATISFIED' THEN 1
         END
       ) FROM "ReviewRequest"
       WHERE "organizationId" = $1 AND satisfaction IS NOT NULL)::text AS "avgScore",
      (SELECT
         CASE WHEN COUNT(*) FILTER (WHERE satisfaction IS NOT NULL) = 0 THEN NULL
         ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE satisfaction IN ('VERY_SATISFIED','SATISFIED'))
           / COUNT(*) FILTER (WHERE satisfaction IS NOT NULL), 0)
         END
       FROM "ReviewRequest" WHERE "organizationId" = $1)::text AS "satisfiedPct"`,
    [organizationId],
  );

  const r = rows[0];
  const avg = r?.avgScore != null ? parseFloat(r.avgScore) : null;
  return {
    pendingToSend: r?.pendingToSend ?? 0,
    sentThisMonth: r?.sentThisMonth ?? 0,
    recordedCount: r?.recordedCount ?? 0,
    averageScore: avg != null ? Math.round(avg * 10) / 10 : null,
    satisfiedPercent: r?.satisfiedPct != null ? Number(r.satisfiedPct) : null,
  };
}

function mapReviewItem(
  r: Record<string, unknown>,
  settings: ReviewSettings,
): ReviewRequestItem {
  const message = String(r.messageSnapshot);
  const phone = String(r.phoneSnapshot);
  return {
    id: String(r.id),
    status: r.status as ReviewRequestStatus,
    customerId: String(r.customerId),
    customerName: String(r.customerName),
    appointmentId: String(r.appointmentId),
    serviceName: String(r.serviceName),
    completedAt: new Date(r.completedAt as Date).toISOString(),
    hoursSinceCompleted: Math.max(0, Math.floor(Number(r.hoursSince) || 0)),
    messageSnapshot: message,
    phoneSnapshot: phone,
    waLink: buildWaMeLink(phone, message),
    whatsappTaskId: (r.whatsappTaskId as string) ?? null,
    sentAt: r.sentAt ? new Date(r.sentAt as Date).toISOString() : null,
    satisfaction: (r.satisfaction as ReviewSatisfaction) ?? null,
    satisfactionRecordedAt: r.satisfactionRecordedAt
      ? new Date(r.satisfactionRecordedAt as Date).toISOString()
      : null,
    googleReviewUrl: settings.googleReviewUrl,
  };
}

export async function listReviewRequests(
  organizationId: string,
  opts: { status?: ReviewRequestStatus | "ALL" } = {},
): Promise<{ items: ReviewRequestItem[]; kpis: ReviewKpis; settings: ReviewSettings }> {
  await syncReviewRequests(organizationId);
  const settings = await getOrCreateReviewSettings(organizationId);

  const conditions = [`rr."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  if (opts.status && opts.status !== "ALL") {
    conditions.push(`rr.status = $2::"ReviewRequestStatus"`);
    params.push(opts.status);
  } else if (!opts.status) {
    conditions.push(`rr.status = 'PENDING'::"ReviewRequestStatus"`);
  }

  const { rows } = await pool.query(
    `SELECT rr.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            s.name AS "serviceName",
            a."endAt" AS "completedAt",
            EXTRACT(EPOCH FROM (NOW() - a."endAt")) / 3600 AS "hoursSince",
            wt."messageSnapshot",
            wt."phoneSnapshot",
            wt."sentAt"
     FROM "ReviewRequest" rr
     JOIN "Customer" c ON c.id = rr."customerId"
     JOIN "Appointment" a ON a.id = rr."appointmentId"
     JOIN "Service" s ON s.id = a."serviceId"
     LEFT JOIN "WhatsAppTask" wt ON wt.id = rr."whatsappTaskId"
     WHERE ${conditions.join(" AND ")}
     ORDER BY rr."scheduledFor" ASC
     LIMIT 100`,
    params,
  );

  const kpis = await getReviewKpis(organizationId);
  return {
    items: rows.map((r) => mapReviewItem(r as Record<string, unknown>, settings)),
    kpis,
    settings,
  };
}

export async function skipReviewRequest(
  organizationId: string,
  reviewId: string,
  actor: { id: string; name?: string | null },
): Promise<boolean> {
  const { rows } = await pool.query<{ whatsappTaskId: string | null }>(
    `UPDATE "ReviewRequest"
     SET status = 'SKIPPED'::"ReviewRequestStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'PENDING'::"ReviewRequestStatus"
     RETURNING "whatsappTaskId"`,
    [organizationId, reviewId],
  );
  if (!rows[0]) return false;

  if (rows[0].whatsappTaskId) {
    await pool.query(
      `UPDATE "WhatsAppTask"
       SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
       WHERE id = $1 AND status = 'PENDING'::"WhatsAppTaskStatus"`,
      [rows[0].whatsappTaskId],
    );
  }

  await writeAuditLog({
    organizationId,
    entityType: "ReviewRequest",
    entityId: reviewId,
    action: "SKIPPED",
    actorId: actor.id,
    actorName: actor.name,
  });
  return true;
}

export async function recordReviewSatisfaction(
  organizationId: string,
  reviewId: string,
  satisfaction: ReviewSatisfaction,
  actor: { id: string; name?: string | null },
): Promise<{ ok: true; alert?: ReviewAlertItem } | { ok: false }> {
  const { rows, rowCount } = await pool.query<{
    customerId: string;
    customerName: string;
    serviceName: string;
  }>(
    `UPDATE "ReviewRequest" rr
     SET satisfaction = $3::"ReviewSatisfaction",
         status = 'RECORDED'::"ReviewRequestStatus",
         "satisfactionRecordedAt" = NOW(),
         "satisfactionRecordedById" = $4,
         "updatedAt" = NOW()
     FROM "Customer" c, "Appointment" a, "Service" s
     WHERE rr.id = $2 AND rr."organizationId" = $1
       AND rr.status IN ('SENT'::"ReviewRequestStatus", 'RECORDED'::"ReviewRequestStatus")
       AND c.id = rr."customerId"
       AND a.id = rr."appointmentId"
       AND s.id = a."serviceId"
     RETURNING rr."customerId", c."firstName" || ' ' || c."lastName" AS "customerName", s.name AS "serviceName"`,
    [organizationId, reviewId, satisfaction, actor.id],
  );
  if (!rowCount) return { ok: false };

  await writeAuditLog({
    organizationId,
    entityType: "ReviewRequest",
    entityId: reviewId,
    action: "SATISFACTION",
    actorId: actor.id,
    actorName: actor.name,
    after: { satisfaction, score: REVIEW_SATISFACTION_SCORE[satisfaction] },
  });

  if (satisfaction === "DISSATISFIED") {
    await writeAuditLog({
      organizationId,
      entityType: "ReviewRequest",
      entityId: reviewId,
      action: "ALERT_OWNER",
      actorId: actor.id,
      actorName: actor.name,
      after: {
        customerId: rows[0].customerId,
        customerName: rows[0].customerName,
        serviceName: rows[0].serviceName,
        satisfaction,
      },
    });
    return {
      ok: true,
      alert: {
        reviewRequestId: reviewId,
        customerId: rows[0].customerId,
        customerName: rows[0].customerName,
        serviceName: rows[0].serviceName,
        satisfaction,
        recordedAt: new Date().toISOString(),
      },
    };
  }
  return { ok: true };
}

/** Sync depuis WhatsAppTask marquée envoyée */
export async function syncReviewRequestOnWhatsAppSent(
  taskId: string,
  sentById: string,
  client?: PoolClient,
): Promise<void> {
  const c = client ?? pool;
  await c.query(
    `UPDATE "ReviewRequest"
     SET status = 'SENT'::"ReviewRequestStatus",
         "sentAt" = NOW(),
         "sentById" = $2,
         "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"ReviewRequestStatus"`,
    [taskId, sentById],
  );
}

export async function listRecentDissatisfiedAlerts(
  organizationId: string,
  limit = 5,
): Promise<ReviewAlertItem[]> {
  const { rows } = await pool.query(
    `SELECT rr.id AS "reviewRequestId", rr."customerId",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            s.name AS "serviceName", rr.satisfaction,
            rr."satisfactionRecordedAt" AS "recordedAt"
     FROM "ReviewRequest" rr
     JOIN "Customer" c ON c.id = rr."customerId"
     JOIN "Appointment" a ON a.id = rr."appointmentId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE rr."organizationId" = $1
       AND rr.satisfaction = 'DISSATISFIED'::"ReviewSatisfaction"
     ORDER BY rr."satisfactionRecordedAt" DESC NULLS LAST
     LIMIT $2`,
    [organizationId, limit],
  );
  return rows.map((r) => ({
    reviewRequestId: String(r.reviewRequestId),
    customerId: String(r.customerId),
    customerName: String(r.customerName),
    serviceName: String(r.serviceName),
    satisfaction: "DISSATISFIED" as const,
    recordedAt: new Date(r.recordedAt as Date).toISOString(),
  }));
}
