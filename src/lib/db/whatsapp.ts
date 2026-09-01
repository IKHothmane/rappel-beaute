import { randomBytes } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import {
  WHATSAPP_MARKETING_TYPES,
  WHATSAPP_TASK_TYPES,
  type CreateWhatsAppTemplateInput,
  type UpdateWhatsAppTemplateInput,
  type WhatsAppKpis,
  type WhatsAppStaffOutcome,
  type WhatsAppTaskItem,
  type WhatsAppTaskStatus,
  type WhatsAppTaskType,
  type WhatsAppTemplateItem,
} from "@/types/whatsapp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function normalizePhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  if (digits.length === 9) return `212${digits}`;
  return digits;
}

export function buildWaMeLink(phone: string, message: string): string {
  const normalized = normalizePhoneForWa(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

type TemplateContext = {
  customer: { firstName: string; lastName: string };
  appointment?: { date: string; time: string };
  service?: { name: string; price: string };
  staff?: { firstName: string };
  organization: { name: string; phone: string; address: string; googleReviewUrl?: string };
  promotion?: { code: string; discount: string };
  package?: { remainingSessions: string };
  loyalty?: { points: string };
  lastVisit?: { date: string; days: string };
  lastService?: { name: string };
};

export function renderTemplateBody(body: string, ctx: TemplateContext): string {
  const vars: Record<string, string> = {
    "{{customer.firstName}}": ctx.customer.firstName,
    "{{customer.lastName}}": ctx.customer.lastName,
    "{{appointment.date}}": ctx.appointment?.date ?? "",
    "{{appointment.time}}": ctx.appointment?.time ?? "",
    "{{service.name}}": ctx.service?.name ?? "",
    "{{service.price}}": ctx.service?.price ?? "",
    "{{staff.firstName}}": ctx.staff?.firstName ?? "",
    "{{organization.name}}": ctx.organization.name,
    "{{organization.phone}}": ctx.organization.phone,
    "{{organization.address}}": ctx.organization.address,
    "{{organization.googleReviewUrl}}": ctx.organization.googleReviewUrl ?? "",
    "{{promotion.code}}": ctx.promotion?.code ?? "",
    "{{promotion.discount}}": ctx.promotion?.discount ?? "",
    "{{package.remainingSessions}}": ctx.package?.remainingSessions ?? "",
    "{{loyalty.points}}": ctx.loyalty?.points ?? "",
    "{{lastVisit.date}}": ctx.lastVisit?.date ?? "",
    "{{lastVisit.days}}": ctx.lastVisit?.days ?? "",
    "{{lastService.name}}": ctx.lastService?.name ?? ctx.service?.name ?? "",
  };
  let out = body;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(key).join(value);
  }
  return out;
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

function mapTemplate(r: Record<string, unknown>): WhatsAppTemplateItem {
  return {
    id: String(r.id),
    name: String(r.name),
    type: r.type as WhatsAppTaskType,
    body: String(r.body),
    active: Boolean(r.active),
    isDefault: Boolean(r.isDefault),
  };
}

function mapTask(r: Record<string, unknown>): WhatsAppTaskItem {
  const phone = String(r.phoneSnapshot);
  const message = String(r.messageSnapshot);
  return {
    id: String(r.id),
    type: r.type as WhatsAppTaskType,
    status: r.status as WhatsAppTaskStatus,
    messageSnapshot: message,
    phoneSnapshot: phone,
    waLink: buildWaMeLink(phone, message),
    scheduledFor: new Date(r.scheduledFor as Date).toISOString(),
    sentAt: r.sentAt ? new Date(r.sentAt as Date).toISOString() : null,
    sentById: (r.sentById as string) ?? null,
    staffOutcome: (r.staffOutcome as WhatsAppStaffOutcome) ?? null,
    outcomeAt: r.outcomeAt ? new Date(r.outcomeAt as Date).toISOString() : null,
    customerId: String(r.customerId),
    customerName: String(r.customerName),
    appointmentId: (r.appointmentId as string) ?? null,
    appointmentStartAt: r.appointmentStartAt
      ? new Date(r.appointmentStartAt as Date).toISOString()
      : null,
    serviceName: (r.serviceName as string) ?? null,
    servicePrice: r.servicePrice != null ? parseFloat(String(r.servicePrice)) : null,
    templateId: (r.templateId as string) ?? null,
  };
}

const DEFAULT_TEMPLATES: { name: string; type: WhatsAppTaskType; body: string }[] = [
  {
    name: "Confirmation RDV",
    type: "APPOINTMENT_CONFIRMATION",
    body: `Bonjour {{customer.firstName}} 👋

Nous confirmons votre rendez-vous du {{appointment.date}}
à {{appointment.time}} pour {{service.name}}.

Merci de nous confirmer votre présence 🌸`,
  },
  {
    name: "Rappel RDV",
    type: "APPOINTMENT_REMINDER",
    body: `Bonjour {{customer.firstName}} 🌸

Petit rappel pour votre rendez-vous demain à {{appointment.time}} à {{organization.name}} pour votre {{service.name}}.

À demain !`,
  },
  {
    name: "Réactivation",
    type: "REACTIVATION",
    body: `Bonjour {{customer.firstName}} 🌸

Cela fait {{lastVisit.days}} jours que nous ne vous avons pas vue.
Votre dernier {{lastService.name}} remonte à {{lastVisit.date}}.

Nous serions ravis de vous revoir à {{organization.name}}.
{{promotion.discount}} avec le code {{promotion.code}}.`,
  },
  {
    name: "Anniversaire",
    type: "BIRTHDAY",
    body: `Joyeux anniversaire {{customer.firstName}} 🎂

Pour cette occasion, l'équipe {{organization.name}} vous prépare une surprise.

Passez nous voir au {{organization.address}} !`,
  },
  {
    name: "Demande d'avis",
    type: "REVIEW_REQUEST",
    body: `Bonjour {{customer.firstName}} 🌸

Merci pour votre visite à {{organization.name}}.

Nous espérons que vous avez apprécié votre {{service.name}}.

Votre avis nous ferait très plaisir ❤️

⭐ Laisser un avis Google :
{{organization.googleReviewUrl}}`,
  },
];

export async function ensureDefaultTemplates(organizationId: string): Promise<void> {
  for (const tpl of DEFAULT_TEMPLATES) {
    const { rows } = await pool.query(
      `SELECT id FROM "WhatsAppTemplate"
       WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType" AND "isDefault" = true
       LIMIT 1`,
      [organizationId, tpl.type],
    );
    if (rows.length) continue;
    await pool.query(
      `INSERT INTO "WhatsAppTemplate" (
        id, "organizationId", name, type, body, active, "isDefault", "updatedAt"
      ) VALUES ($1,$2,$3,$4::"WhatsAppTaskType",$5,true,true,NOW())`,
      [newId("wtpl"), organizationId, tpl.name, tpl.type, tpl.body],
    );
  }
}

async function getDefaultTemplate(
  organizationId: string,
  type: WhatsAppTaskType,
): Promise<{ id: string; body: string } | null> {
  const { rows } = await pool.query<{ id: string; body: string }>(
    `SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC, "updatedAt" DESC
     LIMIT 1`,
    [organizationId, type],
  );
  return rows[0] ?? null;
}

type OrgRow = { name: string; phone: string | null; address: string | null };

async function loadOrg(organizationId: string): Promise<OrgRow> {
  const { rows } = await pool.query<OrgRow>(
    `SELECT name, phone, address FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  return rows[0] ?? { name: "", phone: "", address: "" };
}

async function upsertTask(
  organizationId: string,
  input: {
    customerId: string;
    appointmentId?: string | null;
    templateId?: string | null;
    type: WhatsAppTaskType;
    messageSnapshot: string;
    phoneSnapshot: string;
    scheduledFor: Date;
    idempotencyKey: string;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO "WhatsAppTask" (
      id, "organizationId", "customerId", "appointmentId", "templateId",
      type, status, "messageSnapshot", "phoneSnapshot", "scheduledFor",
      "idempotencyKey", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
      $7,$8,$9,$10,NOW()
    )
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    [
      newId("wtask"),
      organizationId,
      input.customerId,
      input.appointmentId ?? null,
      input.templateId ?? null,
      input.type,
      input.messageSnapshot,
      input.phoneSnapshot,
      input.scheduledFor,
      input.idempotencyKey,
    ],
  );
}

/** Génère automatiquement les tâches du jour (idempotent) */
export async function syncWhatsAppTasks(organizationId: string): Promise<void> {
  await ensureDefaultTemplates(organizationId);
  const org = await loadOrg(organizationId);
  const orgCtx = {
    name: org.name,
    phone: org.phone ?? "",
    address: org.address ?? "",
  };

  // Rappels : RDV demain (PENDING / CONFIRMED)
  const reminderTpl = await getDefaultTemplate(organizationId, "APPOINTMENT_REMINDER");
  if (reminderTpl) {
    const { rows: aptRows } = await pool.query<{
      id: string;
      customerId: string;
      phone: string;
      firstName: string;
      lastName: string;
      startAt: Date;
      serviceName: string;
      price: string;
      staffFirstName: string;
    }>(
      `SELECT a.id, a."customerId", c.phone, c."firstName", c."lastName",
              a."startAt", s.name AS "serviceName", a.price::text,
              st."firstName" AS "staffFirstName"
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId"
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       WHERE a."organizationId" = $1
         AND a.status IN ('PENDING','CONFIRMED')
         AND a."startAt" >= (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '1 day')
         AND a."startAt" < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '2 days')
         AND c."deletedAt" IS NULL
         AND c.phone IS NOT NULL AND c.phone <> ''`,
      [organizationId],
    );

    const todayStart = new Date();
    todayStart.setHours(8, 0, 0, 0);

    for (const apt of aptRows) {
      const startAt = new Date(apt.startAt);
      const message = renderTemplateBody(reminderTpl.body, {
        customer: { firstName: apt.firstName, lastName: apt.lastName },
        appointment: { date: formatDateFr(startAt), time: formatTimeFr(startAt) },
        service: { name: apt.serviceName, price: `${apt.price} MAD` },
        staff: { firstName: apt.staffFirstName },
        organization: orgCtx,
      });
      const dayKey = startAt.toISOString().slice(0, 10);
      await upsertTask(organizationId, {
        customerId: apt.customerId,
        appointmentId: apt.id,
        templateId: reminderTpl.id,
        type: "APPOINTMENT_REMINDER",
        messageSnapshot: message,
        phoneSnapshot: apt.phone,
        scheduledFor: todayStart,
        idempotencyKey: `wa:reminder:${apt.id}:${dayKey}`,
      });
    }
  }

  // Confirmations : RDV dans 2 jours (PENDING uniquement)
  const confirmTpl = await getDefaultTemplate(organizationId, "APPOINTMENT_CONFIRMATION");
  if (confirmTpl) {
    const { rows: confirmRows } = await pool.query<{
      id: string;
      customerId: string;
      phone: string;
      firstName: string;
      lastName: string;
      startAt: Date;
      serviceName: string;
      price: string;
      staffFirstName: string;
    }>(
      `SELECT a.id, a."customerId", c.phone, c."firstName", c."lastName",
              a."startAt", s.name AS "serviceName", a.price::text,
              st."firstName" AS "staffFirstName"
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId"
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       WHERE a."organizationId" = $1
         AND a.status = 'PENDING'
         AND a."startAt" >= (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '2 days')
         AND a."startAt" < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '3 days')
         AND c."deletedAt" IS NULL
         AND c.phone IS NOT NULL AND c.phone <> ''`,
      [organizationId],
    );

    const todayStart = new Date();
    todayStart.setHours(9, 0, 0, 0);

    for (const apt of confirmRows) {
      const startAt = new Date(apt.startAt);
      const message = renderTemplateBody(confirmTpl.body, {
        customer: { firstName: apt.firstName, lastName: apt.lastName },
        appointment: { date: formatDateFr(startAt), time: formatTimeFr(startAt) },
        service: { name: apt.serviceName, price: `${apt.price} MAD` },
        staff: { firstName: apt.staffFirstName },
        organization: orgCtx,
      });
      const dayKey = startAt.toISOString().slice(0, 10);
      await upsertTask(organizationId, {
        customerId: apt.customerId,
        appointmentId: apt.id,
        templateId: confirmTpl.id,
        type: "APPOINTMENT_CONFIRMATION",
        messageSnapshot: message,
        phoneSnapshot: apt.phone,
        scheduledFor: todayStart,
        idempotencyKey: `wa:confirm:${apt.id}:${dayKey}`,
      });
    }
  }

  // Demandes d'avis — moteur ReviewRequest (étape 33)
  const { syncReviewRequests } = await import("@/lib/db/reviews");
  await syncReviewRequests(organizationId);

  // Réactivation — moteur configurable (étape 31)
  const { syncReactivationWhatsAppTasks } = await import("@/lib/db/reactivation");
  await syncReactivationWhatsAppTasks(organizationId);

  // Anniversaires (marketing opt-in)
  const bdayTpl = await getDefaultTemplate(organizationId, "BIRTHDAY");
  if (bdayTpl) {
    const year = new Date().getFullYear();
    const { rows: bdayRows } = await pool.query<{
      id: string;
      phone: string;
      firstName: string;
      lastName: string;
    }>(
      `SELECT c.id, c.phone, c."firstName", c."lastName"
       FROM "Customer" c
       WHERE c."organizationId" = $1
         AND c."deletedAt" IS NULL
         AND c."marketingWhatsapp" = true
         AND c."birthDate" IS NOT NULL
         AND EXTRACT(MONTH FROM c."birthDate") = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM c."birthDate") = EXTRACT(DAY FROM CURRENT_DATE)
         AND c.phone IS NOT NULL AND c.phone <> ''`,
      [organizationId],
    );

    for (const cust of bdayRows) {
      const message = renderTemplateBody(bdayTpl.body, {
        customer: { firstName: cust.firstName, lastName: cust.lastName },
        organization: orgCtx,
        promotion: { code: "", discount: "une surprise" },
      });
      await upsertTask(organizationId, {
        customerId: cust.id,
        templateId: bdayTpl.id,
        type: "BIRTHDAY",
        messageSnapshot: message,
        phoneSnapshot: cust.phone,
        scheduledFor: new Date(),
        idempotencyKey: `wa:birthday:${cust.id}:${year}`,
      });
    }
  }

  // Annuler les tâches PENDING liées à des RDV annulés
  await pool.query(
    `UPDATE "WhatsAppTask" t
     SET status = 'CANCELLED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     FROM "Appointment" a
     WHERE t."appointmentId" = a.id
       AND t."organizationId" = $1
       AND t.status = 'PENDING'::"WhatsAppTaskStatus"
       AND a.status IN ('CANCELLED','NO_SHOW')`,
    [organizationId],
  );
}

export async function getWhatsAppKpis(organizationId: string): Promise<WhatsAppKpis> {
  const { rows } = await pool.query<{
    pendingToday: number;
    sentToday: number;
    confirmationsRecorded: number;
    cancellationsRecorded: number;
    followUpsRecorded: number;
  }>(
    `SELECT
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND status = 'PENDING'::"WhatsAppTaskStatus"
         AND "scheduledFor" >= date_trunc('day', NOW())
         AND "scheduledFor" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "pendingToday",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND status = 'SENT'::"WhatsAppTaskStatus"
         AND "sentAt" >= date_trunc('day', NOW())
         AND "sentAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "sentToday",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND "staffOutcome" = 'CUSTOMER_CONFIRMED'::"WhatsAppStaffOutcome"
         AND "outcomeAt" >= date_trunc('day', NOW())
         AND "outcomeAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "confirmationsRecorded",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND "staffOutcome" = 'CUSTOMER_CANCELLED'::"WhatsAppStaffOutcome"
         AND "outcomeAt" >= date_trunc('day', NOW())
         AND "outcomeAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "cancellationsRecorded",
      (SELECT COUNT(*)::int FROM "WhatsAppTask"
       WHERE "organizationId" = $1
         AND "staffOutcome" = 'NEEDS_FOLLOWUP'::"WhatsAppStaffOutcome"
         AND "outcomeAt" >= date_trunc('day', NOW())
         AND "outcomeAt" < date_trunc('day', NOW()) + INTERVAL '1 day') AS "followUpsRecorded"`,
    [organizationId],
  );
  return {
    pendingToday: rows[0]?.pendingToday ?? 0,
    sentToday: rows[0]?.sentToday ?? 0,
    confirmationsRecorded: rows[0]?.confirmationsRecorded ?? 0,
    cancellationsRecorded: rows[0]?.cancellationsRecorded ?? 0,
    followUpsRecorded: rows[0]?.followUpsRecorded ?? 0,
  };
}

export async function listWhatsAppTasks(
  organizationId: string,
  opts: { status?: WhatsAppTaskStatus | null; type?: WhatsAppTaskType | null },
): Promise<{ items: WhatsAppTaskItem[]; kpis: WhatsAppKpis }> {
  await syncWhatsAppTasks(organizationId);

  const conditions = [`t."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (opts.status) {
    conditions.push(`t.status = $${pi}::"WhatsAppTaskStatus"`);
    params.push(opts.status);
    pi++;
  } else {
    conditions.push(`t.status = 'PENDING'::"WhatsAppTaskStatus"`);
  }

  if (opts.type) {
    conditions.push(`t.type = $${pi}::"WhatsAppTaskType"`);
    params.push(opts.type);
    pi++;
  }

  const where = conditions.join(" AND ");
  const [listRes, kpis] = await Promise.all([
    pool.query(
      `SELECT t.*,
              c."firstName" || ' ' || c."lastName" AS "customerName",
              a."startAt" AS "appointmentStartAt",
              s.name AS "serviceName",
              a.price::text AS "servicePrice"
       FROM "WhatsAppTask" t
       JOIN "Customer" c ON c.id = t."customerId"
       LEFT JOIN "Appointment" a ON a.id = t."appointmentId"
       LEFT JOIN "Service" s ON s.id = a."serviceId"
       WHERE ${where}
       ORDER BY t."scheduledFor" ASC, t."createdAt" ASC
       LIMIT 100`,
      params,
    ),
    getWhatsAppKpis(organizationId),
  ]);

  return {
    items: listRes.rows.map((r) => mapTask(r as Record<string, unknown>)),
    kpis,
  };
}

export async function listSentWhatsAppTasks(
  organizationId: string,
): Promise<WhatsAppTaskItem[]> {
  const { rows } = await pool.query(
    `SELECT t.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            a."startAt" AS "appointmentStartAt",
            s.name AS "serviceName",
            a.price::text AS "servicePrice"
     FROM "WhatsAppTask" t
     JOIN "Customer" c ON c.id = t."customerId"
     LEFT JOIN "Appointment" a ON a.id = t."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE t."organizationId" = $1
       AND t.status = 'SENT'::"WhatsAppTaskStatus"
     ORDER BY t."sentAt" DESC NULLS LAST
     LIMIT 50`,
    [organizationId],
  );
  return rows.map((r) => mapTask(r as Record<string, unknown>));
}

export async function markWhatsAppTaskSent(
  organizationId: string,
  taskId: string,
  actor: { id: string; name?: string | null },
): Promise<WhatsAppTaskItem | null> {
  const { rows } = await pool.query(
    `UPDATE "WhatsAppTask"
     SET status = 'SENT'::"WhatsAppTaskStatus",
         "sentAt" = NOW(),
         "sentById" = $3,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'PENDING'::"WhatsAppTaskStatus"
     RETURNING *`,
    [organizationId, taskId, actor.id],
  );
  if (!rows[0]) return null;

  await pool.query(
    `UPDATE "CampaignRecipient"
     SET status = 'SENT'::"CampaignRecipientStatus", "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"CampaignRecipientStatus"`,
    [taskId],
  );

  const { syncReviewRequestOnWhatsAppSent } = await import("@/lib/db/reviews");
  await syncReviewRequestOnWhatsAppSent(taskId, actor.id);

  await writeAuditLog({
    organizationId,
    entityType: "WhatsAppTask",
    entityId: taskId,
    action: "SENT",
    actorId: actor.id,
    actorName: actor.name,
    after: { manual: true },
  });

  const full = await pool.query(
    `SELECT t.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            a."startAt" AS "appointmentStartAt",
            s.name AS "serviceName",
            a.price::text AS "servicePrice"
     FROM "WhatsAppTask" t
     JOIN "Customer" c ON c.id = t."customerId"
     LEFT JOIN "Appointment" a ON a.id = t."appointmentId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE t.id = $1`,
    [taskId],
  );
  return mapTask(full.rows[0] as Record<string, unknown>);
}

export async function skipWhatsAppTask(
  organizationId: string,
  taskId: string,
  actor: { id: string; name?: string | null },
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE "WhatsAppTask"
     SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'PENDING'::"WhatsAppTaskStatus"`,
    [organizationId, taskId],
  );
  if (!rowCount) return false;
  await pool.query(
    `UPDATE "ReviewRequest"
     SET status = 'SKIPPED'::"ReviewRequestStatus", "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"ReviewRequestStatus"`,
    [taskId],
  );
  await writeAuditLog({
    organizationId,
    entityType: "WhatsAppTask",
    entityId: taskId,
    action: "SKIPPED",
    actorId: actor.id,
    actorName: actor.name,
  });
  return true;
}

export async function recordWhatsAppOutcome(
  organizationId: string,
  taskId: string,
  outcome: WhatsAppStaffOutcome,
  actor: { id: string; name?: string | null },
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE "WhatsAppTask"
     SET "staffOutcome" = $3::"WhatsAppStaffOutcome",
         "outcomeAt" = NOW(),
         "outcomeById" = $4,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $1 AND status = 'SENT'::"WhatsAppTaskStatus"`,
    [organizationId, taskId, outcome, actor.id],
  );
  if (!rowCount) return false;
  await writeAuditLog({
    organizationId,
    entityType: "WhatsAppTask",
    entityId: taskId,
    action: "OUTCOME",
    actorId: actor.id,
    actorName: actor.name,
    after: { outcome },
  });
  return true;
}

export async function listWhatsAppTemplates(
  organizationId: string,
): Promise<WhatsAppTemplateItem[]> {
  await ensureDefaultTemplates(organizationId);
  const { rows } = await pool.query(
    `SELECT id, name, type::text, body, active, "isDefault"
     FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1
     ORDER BY type, "isDefault" DESC, name`,
    [organizationId],
  );
  return rows.map((r) => mapTemplate(r as Record<string, unknown>));
}

export async function createWhatsAppTemplate(
  organizationId: string,
  input: CreateWhatsAppTemplateInput,
  actor: { id: string; name?: string | null },
): Promise<WhatsAppTemplateItem> {
  if (!WHATSAPP_TASK_TYPES.includes(input.type)) {
    throw new Error("Type de modèle invalide.");
  }
  const id = newId("wtpl");
  if (input.isDefault) {
    await pool.query(
      `UPDATE "WhatsAppTemplate" SET "isDefault" = false, "updatedAt" = NOW()
       WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType"`,
      [organizationId, input.type],
    );
  }
  await pool.query(
    `INSERT INTO "WhatsAppTemplate" (
      id, "organizationId", name, type, body, active, "isDefault", "updatedAt"
    ) VALUES ($1,$2,$3,$4::"WhatsAppTaskType",$5,$6,$7,NOW())`,
    [
      id,
      organizationId,
      input.name,
      input.type,
      input.body,
      input.active ?? true,
      input.isDefault ?? false,
    ],
  );
  await writeAuditLog({
    organizationId,
    entityType: "WhatsAppTemplate",
    entityId: id,
    action: "CREATE",
    actorId: actor.id,
    actorName: actor.name,
  });
  const { rows } = await pool.query(
    `SELECT id, name, type::text, body, active, "isDefault" FROM "WhatsAppTemplate" WHERE id = $1`,
    [id],
  );
  return mapTemplate(rows[0] as Record<string, unknown>);
}

export async function updateWhatsAppTemplate(
  organizationId: string,
  input: UpdateWhatsAppTemplateInput,
  actor: { id: string; name?: string | null },
): Promise<WhatsAppTemplateItem | null> {
  const existing = await pool.query<{ type: WhatsAppTaskType }>(
    `SELECT type::text AS type FROM "WhatsAppTemplate" WHERE id = $1 AND "organizationId" = $2`,
    [input.id, organizationId],
  );
  if (!existing.rows[0]) return null;

  if (input.isDefault) {
    await pool.query(
      `UPDATE "WhatsAppTemplate" SET "isDefault" = false, "updatedAt" = NOW()
       WHERE "organizationId" = $1 AND type = $2::"WhatsAppTaskType" AND id <> $3`,
      [organizationId, existing.rows[0].type, input.id],
    );
  }

  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [organizationId, input.id];
  let pi = 3;
  if (input.name !== undefined) {
    sets.push(`name = $${pi}`);
    params.push(input.name);
    pi++;
  }
  if (input.body !== undefined) {
    sets.push(`body = $${pi}`);
    params.push(input.body);
    pi++;
  }
  if (input.active !== undefined) {
    sets.push(`active = $${pi}`);
    params.push(input.active);
    pi++;
  }
  if (input.isDefault !== undefined) {
    sets.push(`"isDefault" = $${pi}`);
    params.push(input.isDefault);
    pi++;
  }

  await pool.query(
    `UPDATE "WhatsAppTemplate" SET ${sets.join(", ")} WHERE "organizationId" = $1 AND id = $2`,
    params,
  );

  await writeAuditLog({
    organizationId,
    entityType: "WhatsAppTemplate",
    entityId: input.id,
    action: "UPDATE",
    actorId: actor.id,
    actorName: actor.name,
  });

  const { rows } = await pool.query(
    `SELECT id, name, type::text, body, active, "isDefault" FROM "WhatsAppTemplate" WHERE id = $1`,
    [input.id],
  );
  return rows[0] ? mapTemplate(rows[0] as Record<string, unknown>) : null;
}

/** Tâche WhatsApp confirmation après réservation en ligne — envoi manuel via /whatsapp */
export async function enqueueOnlineBookingConfirmation(
  organizationId: string,
  appointmentId: string,
): Promise<void> {
  await ensureDefaultTemplates(organizationId);
  const confirmTpl = await getDefaultTemplate(organizationId, "APPOINTMENT_CONFIRMATION");
  if (!confirmTpl) return;

  const { rows } = await pool.query<{
    customerId: string;
    phone: string;
    firstName: string;
    lastName: string;
    startAt: Date;
    serviceName: string;
    price: string;
    staffFirstName: string;
  }>(
    `SELECT a."customerId", c.phone, c."firstName", c."lastName",
            a."startAt", s.name AS "serviceName", a.price::text,
            st."firstName" AS "staffFirstName"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     WHERE a.id = $1 AND a."organizationId" = $2
       AND c.phone IS NOT NULL AND c.phone <> ''`,
    [appointmentId, organizationId],
  );
  const apt = rows[0];
  if (!apt) return;

  const org = await loadOrg(organizationId);
  const startAt = new Date(apt.startAt);
  const message = renderTemplateBody(confirmTpl.body, {
    customer: { firstName: apt.firstName, lastName: apt.lastName },
    appointment: { date: formatDateFr(startAt), time: formatTimeFr(startAt) },
    service: { name: apt.serviceName, price: `${apt.price} MAD` },
    staff: { firstName: apt.staffFirstName },
    organization: { name: org.name, phone: org.phone ?? "", address: org.address ?? "" },
  });

  await upsertTask(organizationId, {
    customerId: apt.customerId,
    appointmentId,
    templateId: confirmTpl.id,
    type: "APPOINTMENT_CONFIRMATION",
    messageSnapshot: message,
    phoneSnapshot: apt.phone,
    scheduledFor: new Date(),
    idempotencyKey: `wa:online_confirm:${appointmentId}`,
  });
}

export function isMarketingWhatsAppType(type: WhatsAppTaskType): boolean {
  return WHATSAPP_MARKETING_TYPES.has(type);
}
