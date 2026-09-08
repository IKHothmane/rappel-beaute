import { randomBytes } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { buildPublicBookingUrl, slugifyLabel } from "@/lib/booking-qr";
import {
  buildWaMeLink,
  ensureDefaultTemplates,
  renderTemplateBody,
} from "@/lib/db/whatsapp";
import { MARKETING_WA_TYPES } from "@/lib/db/reactivation";
import type {
  PostVisitAnalytics,
  PostVisitKpis,
  PostVisitListItem,
  PostVisitSettings,
  PostVisitTaskStatus,
  UpdatePostVisitSettingsInput,
} from "@/types/post-visit";
import { POST_VISIT_STATUS_LABEL } from "@/types/post-visit";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

const POST_VISIT_MARKETING_TYPES = [...MARKETING_WA_TYPES, "POST_VISIT"] as const;

export function resolveReturnDays(
  serviceRecommendedReturnDays: number | null | undefined,
  orgDefaultReturnDays: number,
): number | null {
  const fromService =
    serviceRecommendedReturnDays != null && serviceRecommendedReturnDays > 0
      ? serviceRecommendedReturnDays
      : null;
  if (fromService != null) return fromService;
  if (orgDefaultReturnDays > 0) return orgDefaultReturnDays;
  return null;
}

export function postVisitIdempotencyKey(appointmentId: string): string {
  return `postvisit:${appointmentId}`;
}

function mapSettings(r: Record<string, unknown>): PostVisitSettings {
  return {
    enabled: r.enabled !== false,
    defaultReturnDays: Number(r.defaultReturnDays) || 30,
    maxOverdueDays: Number(r.maxOverdueDays) || 14,
    minimumDaysBetweenMarketingMessages:
      Number(r.minimumDaysBetweenMarketingMessages) || 30,
    respectFutureAppointments: r.respectFutureAppointments !== false,
    respectOptIn: r.respectOptIn !== false,
    autoCreateWhatsAppTasks: r.autoCreateWhatsAppTasks !== false,
  };
}

export async function getOrCreatePostVisitSettings(
  organizationId: string,
): Promise<PostVisitSettings> {
  const existing = await pool.query(`SELECT * FROM "PostVisitSettings" WHERE "organizationId" = $1`, [
    organizationId,
  ]);
  if (existing.rows[0]) return mapSettings(existing.rows[0]);

  await pool.query(
    `INSERT INTO "PostVisitSettings" (id, "organizationId", "updatedAt")
     VALUES ($1,$2,NOW())
     ON CONFLICT ("organizationId") DO NOTHING`,
    [newId("pvs"), organizationId],
  );
  const created = await pool.query(`SELECT * FROM "PostVisitSettings" WHERE "organizationId" = $1`, [
    organizationId,
  ]);
  return mapSettings(created.rows[0]);
}

export async function updatePostVisitSettings(
  organizationId: string,
  input: UpdatePostVisitSettingsInput,
  actor: { id: string; name?: string | null },
): Promise<PostVisitSettings> {
  await getOrCreatePostVisitSettings(organizationId);
  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  const set = (col: string, val: unknown) => {
    sets.push(`"${col}" = $${pi}`);
    params.push(val);
    pi++;
  };

  if (input.enabled !== undefined) set("enabled", input.enabled);
  if (input.defaultReturnDays !== undefined) set("defaultReturnDays", input.defaultReturnDays);
  if (input.maxOverdueDays !== undefined) set("maxOverdueDays", input.maxOverdueDays);
  if (input.minimumDaysBetweenMarketingMessages !== undefined) {
    set("minimumDaysBetweenMarketingMessages", input.minimumDaysBetweenMarketingMessages);
  }
  if (input.respectFutureAppointments !== undefined) {
    set("respectFutureAppointments", input.respectFutureAppointments);
  }
  if (input.respectOptIn !== undefined) set("respectOptIn", input.respectOptIn);
  if (input.autoCreateWhatsAppTasks !== undefined) {
    set("autoCreateWhatsAppTasks", input.autoCreateWhatsAppTasks);
  }

  await pool.query(
    `UPDATE "PostVisitSettings" SET ${sets.join(", ")} WHERE "organizationId" = $1`,
    params,
  );

  await writeAuditLog({
    organizationId,
    entityType: "PostVisitSettings",
    entityId: organizationId,
    action: "UPDATE",
    actorId: actor.id,
    actorName: actor.name,
    after: input,
  });

  return getOrCreatePostVisitSettings(organizationId);
}

async function loadOrg(organizationId: string) {
  const { rows } = await pool.query<{
    name: string;
    phone: string | null;
    address: string | null;
    slug: string;
  }>(`SELECT name, phone, address, slug FROM "Organization" WHERE id = $1`, [organizationId]);
  return rows[0] ?? { name: "", phone: "", address: "", slug: "" };
}

async function getDefaultPostVisitTemplate(organizationId: string) {
  const { rows } = await pool.query<{ id: string; body: string }>(
    `SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = 'POST_VISIT'::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC, "updatedAt" DESC
     LIMIT 1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  });
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

async function lastMarketingSentAt(
  organizationId: string,
  customerId: string,
): Promise<Date | null> {
  const types = POST_VISIT_MARKETING_TYPES.map((t) => `'${t}'`).join(",");
  const { rows } = await pool.query<{ sentAt: Date }>(
    `SELECT "sentAt" FROM "WhatsAppTask"
     WHERE "organizationId" = $1 AND "customerId" = $2
       AND status = 'SENT'::"WhatsAppTaskStatus"
       AND type::text IN (${types})
       AND "sentAt" IS NOT NULL
     ORDER BY "sentAt" DESC
     LIMIT 1`,
    [organizationId, customerId],
  );
  return rows[0]?.sentAt ?? null;
}

async function hasFutureAppointment(
  organizationId: string,
  customerId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Appointment"
     WHERE "organizationId" = $1 AND "customerId" = $2
       AND status IN ('PENDING','CONFIRMED')
       AND "startAt" > NOW()`,
    [organizationId, customerId],
  );
  return parseInt(rows[0]?.c ?? "0", 10) > 0;
}

type CandidateRow = {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  marketingWhatsapp: boolean;
  serviceId: string;
  serviceName: string;
  recommendedReturnDays: number | null;
  endAt: Date;
};

function buildBookingUrl(slug: string, serviceName: string): string {
  return buildPublicBookingUrl({
    slug,
    service: slugifyLabel(serviceName),
    source: "post_visit",
  });
}

function buildMessage(opts: {
  templateBody: string;
  org: { name: string; phone: string; address: string; slug: string };
  firstName: string;
  lastName: string;
  serviceName: string;
  endAt: Date;
  recommendedAt: Date;
  bookingUrl: string;
}): string {
  return renderTemplateBody(opts.templateBody, {
    customer: { firstName: opts.firstName, lastName: opts.lastName },
    service: { name: opts.serviceName, price: "" },
    lastService: { name: opts.serviceName },
    lastVisit: { date: formatDateFr(opts.endAt), days: "" },
    recommendedDate: formatDateFr(opts.recommendedAt),
    organization: {
      name: opts.org.name,
      phone: opts.org.phone ?? "",
      address: opts.org.address ?? "",
    },
    bookingUrl: opts.bookingUrl,
  });
}

export async function evaluatePostVisitEligibility(input: {
  organizationId: string;
  appointmentStatus: string;
  phone: string | null | undefined;
  marketingWhatsapp: boolean;
  returnDays: number | null;
  settings: PostVisitSettings;
  hasFutureAppointment: boolean;
  lastMarketingSentAt: Date | null;
  alreadyHasTask: boolean;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (input.appointmentStatus !== "COMPLETED") {
    return { ok: false, reason: "RDV non terminé" };
  }
  if (input.returnDays == null || input.returnDays <= 0) {
    return { ok: false, reason: "Aucun délai de retour" };
  }
  if (!input.phone?.trim()) {
    return { ok: false, reason: "Téléphone absent" };
  }
  if (input.settings.respectOptIn && !input.marketingWhatsapp) {
    return { ok: false, reason: "Opt-in WhatsApp requis" };
  }
  if (input.settings.respectFutureAppointments && input.hasFutureAppointment) {
    return { ok: false, reason: "RDV futur existant" };
  }
  if (input.alreadyHasTask) {
    return { ok: false, reason: "Relance déjà créée" };
  }
  if (input.lastMarketingSentAt) {
    const minMs = input.settings.minimumDaysBetweenMarketingMessages * 86_400_000;
    if (Date.now() - input.lastMarketingSentAt.getTime() < minMs) {
      return { ok: false, reason: "Anti-spam marketing" };
    }
  }
  return { ok: true };
}

/**
 * Sync idempotent — crée WhatsAppTask POST_VISIT (clé postvisit:{appointmentId}).
 * Appelé depuis syncWhatsAppTasks, pas à chaque navigation UI hors WhatsApp/post-visit.
 */
export async function syncPostVisitTasks(organizationId: string): Promise<{ created: number }> {
  const settings = await getOrCreatePostVisitSettings(organizationId);
  if (!settings.enabled || !settings.autoCreateWhatsAppTasks) {
    await cancelStalePostVisitTasks(organizationId, settings);
    return { created: 0 };
  }

  await ensureDefaultTemplates(organizationId);
  const tpl = await getDefaultPostVisitTemplate(organizationId);
  if (!tpl) return { created: 0 };

  const org = await loadOrg(organizationId);
  const { rows } = await pool.query<CandidateRow>(
    `SELECT a.id, a."customerId", c."firstName", c."lastName", c.phone,
            c."marketingWhatsapp", s.id AS "serviceId", s.name AS "serviceName",
            s."recommendedReturnDays", a."endAt"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a.status = 'COMPLETED'
       AND c."deletedAt" IS NULL
       AND c.phone IS NOT NULL AND TRIM(c.phone) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM "WhatsAppTask" t
         WHERE t."organizationId" = $1
           AND t."idempotencyKey" = 'postvisit:' || a.id
       )`,
    [organizationId],
  );

  let created = 0;
  const now = Date.now();

  for (const apt of rows) {
    const returnDays = resolveReturnDays(apt.recommendedReturnDays, settings.defaultReturnDays);
    if (returnDays == null) continue;

    const recommendedAt = addDays(new Date(apt.endAt), returnDays);
    const windowStart = addDays(recommendedAt, -0);
    const windowEnd = addDays(recommendedAt, settings.maxOverdueDays);
    if (now < windowStart.getTime() || now > windowEnd.getTime()) continue;

    const future = settings.respectFutureAppointments
      ? await hasFutureAppointment(organizationId, apt.customerId)
      : false;
    const lastSent = await lastMarketingSentAt(organizationId, apt.customerId);

    const eligibility = await evaluatePostVisitEligibility({
      organizationId,
      appointmentStatus: "COMPLETED",
      phone: apt.phone,
      marketingWhatsapp: apt.marketingWhatsapp,
      returnDays,
      settings,
      hasFutureAppointment: future,
      lastMarketingSentAt: lastSent,
      alreadyHasTask: false,
    });
    if (!eligibility.ok) continue;

    const bookingUrl = buildBookingUrl(org.slug, apt.serviceName);
    const message = buildMessage({
      templateBody: tpl.body,
      org: {
        name: org.name,
        phone: org.phone ?? "",
        address: org.address ?? "",
        slug: org.slug,
      },
      firstName: apt.firstName,
      lastName: apt.lastName,
      serviceName: apt.serviceName,
      endAt: new Date(apt.endAt),
      recommendedAt,
      bookingUrl,
    });

    const taskId = newId("wtask");
    const key = postVisitIdempotencyKey(apt.id);
    const res = await pool.query(
      `INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "appointmentId", "templateId", type, status,
        "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,'POST_VISIT'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $6,$7,$8,$9,NOW()
      )
      ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING
      RETURNING id`,
      [
        taskId,
        organizationId,
        apt.customerId,
        apt.id,
        tpl.id,
        message,
        apt.phone,
        recommendedAt,
        key,
      ],
    );
    if (res.rows[0]) created++;
  }

  await cancelStalePostVisitTasks(organizationId, settings);
  return { created };
}

/** Annule les PENDING si opt-out, RDV futur, ou RDV source non COMPLETED */
async function cancelStalePostVisitTasks(
  organizationId: string,
  settings: PostVisitSettings,
): Promise<void> {
  if (settings.respectOptIn) {
    await pool.query(
      `UPDATE "WhatsAppTask" t
       SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
       FROM "Customer" c
       WHERE t."customerId" = c.id
         AND t."organizationId" = $1
         AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
         AND t.status = 'PENDING'::"WhatsAppTaskStatus"
         AND c."marketingWhatsapp" = false`,
      [organizationId],
    );
  }

  if (settings.respectFutureAppointments) {
    await pool.query(
      `UPDATE "WhatsAppTask" t
       SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
       WHERE t."organizationId" = $1
         AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
         AND t.status = 'PENDING'::"WhatsAppTaskStatus"
         AND EXISTS (
           SELECT 1 FROM "Appointment" a
           WHERE a."organizationId" = $1
             AND a."customerId" = t."customerId"
             AND a.status IN ('PENDING','CONFIRMED')
             AND a."startAt" > NOW()
         )`,
      [organizationId],
    );
  }

  await pool.query(
    `UPDATE "WhatsAppTask" t
     SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     FROM "Appointment" a
     WHERE t."appointmentId" = a.id
       AND t."organizationId" = $1
       AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
       AND t.status = 'PENDING'::"WhatsAppTaskStatus"
       AND a.status <> 'COMPLETED'`,
    [organizationId],
  );
}

export async function listPostVisitItems(
  organizationId: string,
  opts?: { sync?: boolean },
): Promise<{ items: PostVisitListItem[]; kpis: PostVisitKpis; settings: PostVisitSettings }> {
  const settings = await getOrCreatePostVisitSettings(organizationId);
  if (opts?.sync !== false && settings.enabled && settings.autoCreateWhatsAppTasks) {
    await syncPostVisitTasks(organizationId);
  }

  const org = await loadOrg(organizationId);
  const tpl = await getDefaultPostVisitTemplate(organizationId);

  const { rows: taskRows } = await pool.query<{
    taskId: string;
    appointmentId: string;
    customerId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    serviceId: string;
    serviceName: string;
    endAt: Date;
    scheduledFor: Date;
    status: string;
    messageSnapshot: string;
    recommendedReturnDays: number | null;
  }>(
    `SELECT t.id AS "taskId", t."appointmentId", t."customerId",
            c."firstName", c."lastName", c.phone,
            s.id AS "serviceId", s.name AS "serviceName",
            a."endAt", t."scheduledFor", t.status::text, t."messageSnapshot",
            s."recommendedReturnDays"
     FROM "WhatsAppTask" t
     JOIN "Appointment" a ON a.id = t."appointmentId"
     JOIN "Customer" c ON c.id = t."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE t."organizationId" = $1
       AND t.type = 'POST_VISIT'::"WhatsAppTaskType"
     ORDER BY t."scheduledFor" DESC
     LIMIT 100`,
    [organizationId],
  );

  const items: PostVisitListItem[] = taskRows.map((r) => {
    const status = r.status as PostVisitTaskStatus;
    const returnDays =
      resolveReturnDays(r.recommendedReturnDays, settings.defaultReturnDays) ??
      settings.defaultReturnDays;
    const bookingUrl = buildBookingUrl(org.slug, r.serviceName);
    return {
      appointmentId: r.appointmentId,
      customerId: r.customerId,
      customerName: `${r.firstName} ${r.lastName}`.trim(),
      phone: r.phone,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      lastVisitAt: new Date(r.endAt).toISOString(),
      recommendedAt: new Date(r.scheduledFor).toISOString(),
      returnDays,
      status,
      statusLabel: POST_VISIT_STATUS_LABEL[status] ?? status,
      whatsappTaskId: r.taskId,
      messagePreview: r.messageSnapshot,
      waLink:
        r.status === "PENDING" && r.phone
          ? buildWaMeLink(r.phone, r.messageSnapshot)
          : null,
      bookingUrl,
      blockReason: null,
      canPrepare: r.status === "PENDING",
    };
  });

  // Upcoming COMPLETED not yet due (preview)
  const { rows: upcoming } = await pool.query<CandidateRow>(
    `SELECT a.id, a."customerId", c."firstName", c."lastName", c.phone,
            c."marketingWhatsapp", s.id AS "serviceId", s.name AS "serviceName",
            s."recommendedReturnDays", a."endAt"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a.status = 'COMPLETED'
       AND c."deletedAt" IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "WhatsAppTask" t
         WHERE t."organizationId" = $1 AND t."idempotencyKey" = 'postvisit:' || a.id
       )
     ORDER BY a."endAt" DESC
     LIMIT 50`,
    [organizationId],
  );

  for (const apt of upcoming) {
    const returnDays = resolveReturnDays(apt.recommendedReturnDays, settings.defaultReturnDays);
    if (returnDays == null) continue;
    const recommendedAt = addDays(new Date(apt.endAt), returnDays);
    if (recommendedAt.getTime() <= Date.now()) continue;

    const bookingUrl = buildBookingUrl(org.slug, apt.serviceName);
    const preview = tpl
      ? buildMessage({
          templateBody: tpl.body,
          org: {
            name: org.name,
            phone: org.phone ?? "",
            address: org.address ?? "",
            slug: org.slug,
          },
          firstName: apt.firstName,
          lastName: apt.lastName,
          serviceName: apt.serviceName,
          endAt: new Date(apt.endAt),
          recommendedAt,
          bookingUrl,
        })
      : null;

    items.push({
      appointmentId: apt.id,
      customerId: apt.customerId,
      customerName: `${apt.firstName} ${apt.lastName}`.trim(),
      phone: apt.phone,
      serviceId: apt.serviceId,
      serviceName: apt.serviceName,
      lastVisitAt: new Date(apt.endAt).toISOString(),
      recommendedAt: recommendedAt.toISOString(),
      returnDays,
      status: "UPCOMING",
      statusLabel: POST_VISIT_STATUS_LABEL.UPCOMING,
      whatsappTaskId: null,
      messagePreview: preview,
      waLink: null,
      bookingUrl,
      blockReason: null,
      canPrepare: false,
    });
  }

  items.sort(
    (a, b) => new Date(a.recommendedAt).getTime() - new Date(b.recommendedAt).getTime(),
  );

  const kpis: PostVisitKpis = {
    eligible: items.filter((i) => i.status === "PENDING" || i.status === "UPCOMING").length,
    prepared: items.filter((i) => i.status === "PENDING").length,
    sent: items.filter((i) => i.status === "SENT").length,
    upcoming: items.filter((i) => i.status === "UPCOMING").length,
  };

  return { items, kpis, settings };
}

export async function skipPostVisitTask(
  organizationId: string,
  appointmentId: string,
  actor: { id: string; name?: string | null },
): Promise<void> {
  const key = postVisitIdempotencyKey(appointmentId);
  await pool.query(
    `UPDATE "WhatsAppTask"
     SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "idempotencyKey" = $2
       AND status = 'PENDING'::"WhatsAppTaskStatus"`,
    [organizationId, key],
  );
  await writeAuditLog({
    organizationId,
    entityType: "PostVisit",
    entityId: appointmentId,
    action: "SKIP",
    actorId: actor.id,
    actorName: actor.name,
  });
}

export async function getPostVisitAnalytics(
  organizationId: string,
  range?: { start: Date; end: Date },
): Promise<PostVisitAnalytics> {
  const start = range?.start ?? new Date(Date.now() - 30 * 86_400_000);
  const end = range?.end ?? new Date();

  const { rows: taskStats } = await pool.query<{ status: string; n: string }>(
    `SELECT status::text, COUNT(*)::text AS n
     FROM "WhatsAppTask"
     WHERE "organizationId" = $1
       AND type = 'POST_VISIT'::"WhatsAppTaskType"
       AND "createdAt" >= $2 AND "createdAt" <= $3
     GROUP BY status`,
    [organizationId, start, end],
  );
  const map = Object.fromEntries(taskStats.map((r) => [r.status, Number(r.n)]));
  const prepared = (map.PENDING ?? 0) + (map.SENT ?? 0) + (map.SKIPPED ?? 0) + (map.CANCELLED ?? 0);
  const sent = map.SENT ?? 0;

  const { rows: bookRows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'post_visit'
       AND "createdAt" >= $2 AND "createdAt" <= $3`,
    [organizationId, start, end],
  );

  const { rows: doneRows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1
       AND "attributionSource" = 'post_visit'
       AND status = 'COMPLETED'
       AND "startAt" >= $2 AND "startAt" <= $3`,
    [organizationId, start, end],
  );

  return {
    eligible: prepared,
    prepared,
    sent,
    bookingsAfter: parseInt(bookRows[0]?.n ?? "0", 10),
    completedAfter: parseInt(doneRows[0]?.n ?? "0", 10),
  };
}
