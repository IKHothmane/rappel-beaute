import { randomBytes } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import {
  buildWaMeLink,
  ensureDefaultTemplates,
  renderTemplateBody,
} from "@/lib/db/whatsapp";
import type {
  ReactivationBucket,
  ReactivationCustomerItem,
  ReactivationKpis,
  ReactivationSettings,
  UpdateReactivationSettingsInput,
} from "@/types/reactivation";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

const MARKETING_WA_TYPES = [
  "REACTIVATION",
  "PROMOTION",
  "BIRTHDAY",
  "LOYALTY_REWARD",
  "PACKAGE_EXPIRING",
];

export { MARKETING_WA_TYPES };

export function bucketFromDays(
  days: number,
  customerStatus?: string,
): ReactivationBucket {
  if (customerStatus === "AT_RISK" && days >= 60) return "AT_RISK";
  if (days < 30) return "ACTIVE";
  if (days < 45) return "DAYS_30";
  if (days < 60) return "DAYS_45";
  if (days < 90) return "DAYS_60";
  return "DAYS_90";
}

function mapSettings(r: Record<string, unknown>): ReactivationSettings {
  return {
    minimumDaysBetweenMarketingMessages: Number(r.minimumDaysBetweenMarketingMessages) || 30,
    threshold30Enabled: Boolean(r.threshold30Enabled),
    threshold45Enabled: Boolean(r.threshold45Enabled),
    threshold60Enabled: Boolean(r.threshold60Enabled),
    threshold90Enabled: Boolean(r.threshold90Enabled),
    autoCreateWhatsAppTasks: Boolean(r.autoCreateWhatsAppTasks),
    promoCode30: (r.promoCode30 as string) ?? null,
    promoCode45: (r.promoCode45 as string) ?? null,
    promoCode60: (r.promoCode60 as string) ?? null,
    promoCode90: (r.promoCode90 as string) ?? null,
    promoDiscount30: (r.promoDiscount30 as string) ?? null,
    promoDiscount45: (r.promoDiscount45 as string) ?? null,
    promoDiscount60: (r.promoDiscount60 as string) ?? null,
    promoDiscount90: (r.promoDiscount90 as string) ?? null,
  };
}

function promoForBucket(
  bucket: ReactivationBucket,
  settings: ReactivationSettings,
): { code: string | null; discount: string | null } {
  switch (bucket) {
    case "DAYS_30":
      return { code: settings.promoCode30, discount: settings.promoDiscount30 };
    case "DAYS_45":
      return { code: settings.promoCode45, discount: settings.promoDiscount45 };
    case "DAYS_60":
      return { code: settings.promoCode60, discount: settings.promoDiscount60 };
    case "DAYS_90":
    case "AT_RISK":
      return { code: settings.promoCode90, discount: settings.promoDiscount90 };
    default:
      return { code: null, discount: null };
  }
}

function formatMonthFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** CTE SQL réutilisable — stats dernière visite par cliente */
const CUSTOMER_REACTIVATION_CTE = `
  WITH completed AS (
    SELECT
      a."customerId",
      a."startAt",
      a.price,
      s.name AS "serviceName",
      ROW_NUMBER() OVER (PARTITION BY a."customerId" ORDER BY a."startAt" DESC) AS rn
    FROM "Appointment" a
    JOIN "Service" s ON s.id = a."serviceId"
    WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
  ),
  last_visit AS (
    SELECT
      c."customerId",
      c."startAt" AS "lastVisitAt",
      c."serviceName" AS "lastServiceName",
      c.price AS "lastServicePrice"
    FROM completed c
    WHERE c.rn = 1
  ),
  customer_stats AS (
    SELECT
      cu.id,
      cu."firstName",
      cu."lastName",
      cu.phone,
      cu.status::text AS status,
      cu."marketingWhatsapp",
      lv."lastVisitAt",
      lv."lastServiceName",
      lv."lastServicePrice",
      GREATEST(0, EXTRACT(DAY FROM NOW() - lv."lastVisitAt")::int) AS "daysSince",
      COUNT(a.id)::int AS visits,
      COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN a.price ELSE 0 END), 0)::float AS revenue
    FROM "Customer" cu
    JOIN last_visit lv ON lv."customerId" = cu.id
    LEFT JOIN "Appointment" a ON a."customerId" = cu.id
    WHERE cu."organizationId" = $1
      AND cu."deletedAt" IS NULL
    GROUP BY cu.id, cu."firstName", cu."lastName", cu.phone, cu.status,
             cu."marketingWhatsapp", lv."lastVisitAt", lv."lastServiceName", lv."lastServicePrice"
  ),
  last_marketing AS (
    SELECT DISTINCT ON (t."customerId")
      t."customerId",
      t."sentAt"
    FROM "WhatsAppTask" t
    WHERE t."organizationId" = $1
      AND t.type::text = ANY($2::text[])
      AND t.status = 'SENT'::"WhatsAppTaskStatus"
      AND t."sentAt" IS NOT NULL
    ORDER BY t."customerId", t."sentAt" DESC
  ),
  upcoming AS (
    SELECT DISTINCT a."customerId"
    FROM "Appointment" a
    WHERE a."organizationId" = $1
      AND a.status IN ('PENDING','CONFIRMED')
      AND a."startAt" >= NOW()
  ),
  snoozed AS (
    SELECT DISTINCT ON (s."customerId")
      s."customerId",
      s."snoozedUntil"
    FROM "ReactivationSnooze" s
    WHERE s."organizationId" = $1
      AND s."snoozedUntil" > NOW()
    ORDER BY s."customerId", s."snoozedUntil" DESC
  ),
  pending_wa AS (
    SELECT DISTINCT ON (t."customerId")
      t."customerId",
      t.id AS "taskId"
    FROM "WhatsAppTask" t
    WHERE t."organizationId" = $1
      AND t.type = 'REACTIVATION'::"WhatsAppTaskType"
      AND t.status = 'PENDING'::"WhatsAppTaskStatus"
    ORDER BY t."customerId", t."createdAt" DESC
  )
`;

export async function getOrCreateReactivationSettings(
  organizationId: string,
): Promise<ReactivationSettings> {
  const { rows } = await pool.query(
    `SELECT * FROM "ReactivationSettings" WHERE "organizationId" = $1`,
    [organizationId],
  );
  if (rows[0]) return mapSettings(rows[0] as Record<string, unknown>);

  const id = newId("rset");
  await pool.query(
    `INSERT INTO "ReactivationSettings" (
      id, "organizationId", "promoCode45", "promoCode60", "promoCode90", "updatedAt"
    ) VALUES ($1,$2,'RETOUR10','RETOUR15','RETOUR20',NOW())`,
    [id, organizationId],
  );
  const created = await pool.query(
    `SELECT * FROM "ReactivationSettings" WHERE "organizationId" = $1`,
    [organizationId],
  );
  return mapSettings(created.rows[0] as Record<string, unknown>);
}

export async function updateReactivationSettings(
  organizationId: string,
  input: UpdateReactivationSettingsInput,
  actor: { id: string; name?: string | null },
): Promise<ReactivationSettings> {
  await getOrCreateReactivationSettings(organizationId);
  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  const fields: (keyof UpdateReactivationSettingsInput)[] = [
    "minimumDaysBetweenMarketingMessages",
    "threshold30Enabled",
    "threshold45Enabled",
    "threshold60Enabled",
    "threshold90Enabled",
    "autoCreateWhatsAppTasks",
    "promoCode30",
    "promoCode45",
    "promoCode60",
    "promoCode90",
    "promoDiscount30",
    "promoDiscount45",
    "promoDiscount60",
    "promoDiscount90",
  ];

  for (const field of fields) {
    if (input[field] !== undefined) {
      sets.push(`"${field}" = $${pi}`);
      params.push(input[field]);
      pi++;
    }
  }

  await pool.query(
    `UPDATE "ReactivationSettings" SET ${sets.join(", ")} WHERE "organizationId" = $1`,
    params,
  );

  await writeAuditLog({
    organizationId,
    entityType: "ReactivationSettings",
    entityId: organizationId,
    action: "UPDATE",
    actorId: actor.id,
    actorName: actor.name,
    after: input,
  });

  return getOrCreateReactivationSettings(organizationId);
}

type ReactivationRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  marketingWhatsapp: boolean;
  lastVisitAt: Date;
  lastServiceName: string | null;
  lastServicePrice: string | null;
  daysSince: number;
  visits: number;
  revenue: number;
  lastMarketingSentAt: Date | null;
  hasUpcoming: boolean;
  isSnoozed: boolean;
  pendingTaskId: string | null;
};

function mapRowToItem(
  row: ReactivationRow,
  settings: ReactivationSettings,
): ReactivationCustomerItem {
  const days = Number(row.daysSince) || 0;
  const bucket = bucketFromDays(days, row.status);
  const visits = Number(row.visits) || 0;
  const revenue = Math.round((Number(row.revenue) || 0) * 100) / 100;
  const averageTicket = visits > 0 ? Math.round((revenue / visits) * 100) / 100 : 0;
  const promo = promoForBucket(bucket, settings);

  let blockReason: string | null = null;
  if (!row.marketingWhatsapp) {
    blockReason = "Opt-in WhatsApp marketing absent";
  } else if (row.hasUpcoming) {
    blockReason = "Rendez-vous à venir";
  } else if (row.isSnoozed) {
    blockReason = "Relance ignorée (snooze actif)";
  } else if (row.lastMarketingSentAt) {
    const daysSinceMsg =
      (Date.now() - new Date(row.lastMarketingSentAt).getTime()) / (86400000);
    if (daysSinceMsg < settings.minimumDaysBetweenMarketingMessages) {
      blockReason = `Dernière relance il y a ${Math.floor(daysSinceMsg)} j (min. ${settings.minimumDaysBetweenMarketingMessages} j)`;
    }
  }

  const canPrepareWhatsApp =
    !blockReason && row.marketingWhatsapp && !row.pendingTaskId;

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    marketingWhatsapp: row.marketingWhatsapp,
    status: row.status,
    bucket,
    daysSinceLastVisit: days,
    lastVisitAt: new Date(row.lastVisitAt).toISOString(),
    lastServiceName: row.lastServiceName,
    lastServicePrice: row.lastServicePrice != null ? parseFloat(String(row.lastServicePrice)) : null,
    averageTicket,
    totalRevenue: revenue,
    visits,
    lastMarketingSentAt: row.lastMarketingSentAt
      ? new Date(row.lastMarketingSentAt).toISOString()
      : null,
    hasUpcomingAppointment: row.hasUpcoming,
    isSnoozed: row.isSnoozed,
    canPrepareWhatsApp,
    blockReason,
    pendingWhatsAppTaskId: row.pendingTaskId,
    suggestedPromoCode: promo.code,
    suggestedPromoDiscount: promo.discount,
  };
}

function bucketFilterSql(bucket: ReactivationBucket | null): string {
  if (!bucket) return "";
  if (bucket === "ACTIVE") return ` AND cs."daysSince" < 30`;
  if (bucket === "AT_RISK") {
    return ` AND (cs.status = 'AT_RISK' OR cs."daysSince" >= 90)`;
  }
  if (bucket === "DAYS_30") return ` AND cs."daysSince" >= 30 AND cs."daysSince" < 45`;
  if (bucket === "DAYS_45") return ` AND cs."daysSince" >= 45 AND cs."daysSince" < 60`;
  if (bucket === "DAYS_60") return ` AND cs."daysSince" >= 60 AND cs."daysSince" < 90`;
  if (bucket === "DAYS_90") return ` AND cs."daysSince" >= 90`;
  return ` AND cs."daysSince" < 30`;
}

export async function getReactivationKpis(organizationId: string): Promise<ReactivationKpis> {
  const { rows } = await pool.query<{
    toRelance: number;
    days30: number;
    days45: number;
    days60: number;
    days90: number;
    estimatedRevenue: string;
  }>(
    `${CUSTOMER_REACTIVATION_CTE}
     SELECT
       COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND NOT (sn."customerId" IS NOT NULL))::int AS "toRelance",
       COUNT(*) FILTER (WHERE cs."daysSince" >= 30 AND cs."daysSince" < 45)::int AS "days30",
       COUNT(*) FILTER (WHERE cs."daysSince" >= 45 AND cs."daysSince" < 60)::int AS "days45",
       COUNT(*) FILTER (WHERE cs."daysSince" >= 60 AND cs."daysSince" < 90)::int AS "days60",
       COUNT(*) FILTER (WHERE cs."daysSince" >= 90)::int AS "days90",
       COALESCE(SUM(
         CASE WHEN cs."daysSince" >= 30 AND NOT (sn."customerId" IS NOT NULL)
         THEN CASE WHEN cs.visits > 0 THEN cs.revenue / cs.visits ELSE COALESCE(cs."lastServicePrice"::float, 0) END
         ELSE 0 END
       ), 0)::text AS "estimatedRevenue"
     FROM customer_stats cs
     LEFT JOIN snoozed sn ON sn."customerId" = cs.id`,
    [organizationId, MARKETING_WA_TYPES],
  );

  const r = rows[0];
  return {
    toRelance: r?.toRelance ?? 0,
    days30: r?.days30 ?? 0,
    days45: r?.days45 ?? 0,
    days60: r?.days60 ?? 0,
    days90: r?.days90 ?? 0,
    estimatedRevenue: Math.round((parseFloat(r?.estimatedRevenue ?? "0") || 0) * 100) / 100,
  };
}

export async function listReactivationCustomers(
  organizationId: string,
  opts: { bucket?: ReactivationBucket | null; relanceOnly?: boolean },
): Promise<{ items: ReactivationCustomerItem[]; kpis: ReactivationKpis; settings: ReactivationSettings }> {
  const settings = await getOrCreateReactivationSettings(organizationId);
  const bucketFilter = opts.bucket ? bucketFilterSql(opts.bucket) : "";
  const relanceFilter = opts.relanceOnly !== false ? ` AND cs."daysSince" >= 30` : "";

  const { rows } = await pool.query<ReactivationRow>(
    `${CUSTOMER_REACTIVATION_CTE}
     SELECT
       cs.id,
       cs."firstName",
       cs."lastName",
       cs.phone,
       cs.status,
       cs."marketingWhatsapp",
       cs."lastVisitAt",
       cs."lastServiceName",
       cs."lastServicePrice",
       cs."daysSince",
       cs.visits,
       cs.revenue,
       lm."sentAt" AS "lastMarketingSentAt",
       (up."customerId" IS NOT NULL) AS "hasUpcoming",
       (sn."customerId" IS NOT NULL) AS "isSnoozed",
       pw."taskId" AS "pendingTaskId"
     FROM customer_stats cs
     LEFT JOIN last_marketing lm ON lm."customerId" = cs.id
     LEFT JOIN upcoming up ON up."customerId" = cs.id
     LEFT JOIN snoozed sn ON sn."customerId" = cs.id
     LEFT JOIN pending_wa pw ON pw."customerId" = cs.id
     WHERE 1=1 ${relanceFilter} ${bucketFilter}
     ORDER BY cs."daysSince" DESC, cs.revenue DESC
     LIMIT 200`,
    [organizationId, MARKETING_WA_TYPES],
  );

  const kpis = await getReactivationKpis(organizationId);
  return {
    items: rows.map((r) => mapRowToItem(r, settings)),
    kpis,
    settings,
  };
}

async function loadOrg(organizationId: string) {
  const { rows } = await pool.query<{ name: string; phone: string | null; address: string | null }>(
    `SELECT name, phone, address FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  return rows[0] ?? { name: "", phone: "", address: "" };
}

async function getDefaultReactivationTemplate(organizationId: string) {
  const { rows } = await pool.query<{ id: string; body: string }>(
    `SELECT id, body FROM "WhatsAppTemplate"
     WHERE "organizationId" = $1 AND type = 'REACTIVATION'::"WhatsAppTaskType" AND active = true
     ORDER BY "isDefault" DESC, "updatedAt" DESC LIMIT 1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

export async function buildReactivationMessage(
  organizationId: string,
  customerId: string,
): Promise<{ message: string; templateId: string | null; phone: string } | null> {
  const settings = await getOrCreateReactivationSettings(organizationId);
  const { rows } = await pool.query<{
    firstName: string;
    lastName: string;
    phone: string;
    lastVisitAt: Date;
    lastServiceName: string;
    daysSince: number;
    bucket: ReactivationBucket;
  }>(
    `${CUSTOMER_REACTIVATION_CTE}
     SELECT
       cs."firstName",
       cs."lastName",
       cs.phone,
       cs."lastVisitAt",
       cs."lastServiceName",
       cs."daysSince",
       cs.status
     FROM customer_stats cs
     WHERE cs.id = $3`,
    [organizationId, MARKETING_WA_TYPES, customerId],
  );

  const row = rows[0];
  if (!row) return null;

  const bucket = bucketFromDays(Number(row.daysSince), row.status as string);
  const promo = promoForBucket(bucket, settings);
  const org = await loadOrg(organizationId);
  const tpl = await getDefaultReactivationTemplate(organizationId);

  const lastVisitAt = new Date(row.lastVisitAt);
  const body =
    tpl?.body ??
    `Bonjour {{customer.firstName}} 🌸

Cela fait {{lastVisit.days}} jours que nous ne vous avons pas vue.
Votre dernier {{lastService.name}} remonte à {{lastVisit.date}}.

Nous serions ravis de vous revoir à {{organization.name}}.`;

  const message = renderTemplateBody(body, {
    customer: { firstName: row.firstName, lastName: row.lastName },
    organization: { name: org.name, phone: org.phone ?? "", address: org.address ?? "" },
    service: { name: row.lastServiceName ?? "", price: "" },
    promotion: {
      code: promo.code ?? "",
      discount: promo.discount ?? "",
    },
    lastVisit: {
      date: formatMonthFr(lastVisitAt),
      days: String(row.daysSince),
    },
    lastService: { name: row.lastServiceName ?? "" },
  });

  return { message, templateId: tpl?.id ?? null, phone: row.phone };
}

export async function prepareReactivationWhatsApp(
  organizationId: string,
  customerId: string,
  actor: { id: string; name?: string | null },
): Promise<{ taskId: string; waLink: string; message: string } | { error: string }> {
  const settings = await getOrCreateReactivationSettings(organizationId);
  const list = await listReactivationCustomers(organizationId, { relanceOnly: false });
  const customer = list.items.find((c) => c.id === customerId);
  if (!customer) return { error: "Cliente introuvable." };
  if (customer.daysSinceLastVisit < 30) return { error: "Cliente encore active (< 30 j)." };
  if (!customer.marketingWhatsapp) return { error: "Opt-in WhatsApp marketing requis." };
  if (customer.hasUpcomingAppointment) return { error: "Rendez-vous à venir — pas de relance." };
  if (customer.isSnoozed) return { error: "Relance en pause (ignorée)." };
  if (customer.pendingWhatsAppTaskId) {
    const built = await buildReactivationMessage(organizationId, customerId);
    if (!built) return { error: "Impossible de préparer le message." };
    return {
      taskId: customer.pendingWhatsAppTaskId,
      waLink: buildWaMeLink(built.phone, built.message),
      message: built.message,
    };
  }
  if (customer.lastMarketingSentAt) {
    const daysSince =
      (Date.now() - new Date(customer.lastMarketingSentAt).getTime()) / 86400000;
    if (daysSince < settings.minimumDaysBetweenMarketingMessages) {
      return {
        error: `Relance trop récente (min. ${settings.minimumDaysBetweenMarketingMessages} j).`,
      };
    }
  }

  const built = await buildReactivationMessage(organizationId, customerId);
  if (!built) return { error: "Impossible de préparer le message." };

  const taskId = newId("wtask");
  const monthKey = new Date().toISOString().slice(0, 7);
  await pool.query(
    `INSERT INTO "WhatsAppTask" (
      id, "organizationId", "customerId", "templateId", type, status,
      "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,'REACTIVATION'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
      $5,$6,NOW(),$7,NOW()
    )
    ON CONFLICT ("organizationId", "idempotencyKey") DO UPDATE SET
      "messageSnapshot" = EXCLUDED."messageSnapshot",
      "phoneSnapshot" = EXCLUDED."phoneSnapshot",
      "updatedAt" = NOW()
    RETURNING id`,
    [
      taskId,
      organizationId,
      customerId,
      built.templateId,
      built.message,
      built.phone,
      `wa:reactivation:manual:${customerId}:${monthKey}`,
    ],
  );

  const { rows: taskRows } = await pool.query<{ id: string }>(
    `SELECT id FROM "WhatsAppTask"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [organizationId, `wa:reactivation:manual:${customerId}:${monthKey}`],
  );

  await writeAuditLog({
    organizationId,
    entityType: "Reactivation",
    entityId: customerId,
    action: "PREPARE_WHATSAPP",
    actorId: actor.id,
    actorName: actor.name,
  });

  const finalId = taskRows[0]?.id ?? taskId;
  return {
    taskId: finalId,
    waLink: buildWaMeLink(built.phone, built.message),
    message: built.message,
  };
}

export async function snoozeReactivationCustomer(
  organizationId: string,
  customerId: string,
  days: number,
  actor: { id: string; name?: string | null },
  reason?: string,
): Promise<void> {
  const id = newId("rsnz");
  await pool.query(
    `INSERT INTO "ReactivationSnooze" (
      id, "organizationId", "customerId", "snoozedUntil", reason, "createdById"
    ) VALUES ($1,$2,$3,NOW() + ($4 || ' days')::interval,$5,$6)`,
    [id, organizationId, customerId, String(days), reason ?? null, actor.id],
  );

  await pool.query(
    `UPDATE "WhatsAppTask"
     SET status = 'SKIPPED'::"WhatsAppTaskStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND "customerId" = $2
       AND type = 'REACTIVATION'::"WhatsAppTaskType"
       AND status = 'PENDING'::"WhatsAppTaskStatus"`,
    [organizationId, customerId],
  );

  await writeAuditLog({
    organizationId,
    entityType: "ReactivationSnooze",
    entityId: customerId,
    action: "SNOOZE",
    actorId: actor.id,
    actorName: actor.name,
    after: { days, reason },
  });
}

function thresholdEnabled(bucket: ReactivationBucket, settings: ReactivationSettings): boolean {
  if (bucket === "DAYS_30") return settings.threshold30Enabled;
  if (bucket === "DAYS_45") return settings.threshold45Enabled;
  if (bucket === "DAYS_60") return settings.threshold60Enabled;
  if (bucket === "DAYS_90" || bucket === "AT_RISK") return settings.threshold90Enabled;
  return false;
}

/** Sync auto des tâches WhatsApp réactivation (appelé depuis whatsapp sync) */
export async function syncReactivationWhatsAppTasks(organizationId: string): Promise<void> {
  const settings = await getOrCreateReactivationSettings(organizationId);
  if (!settings.autoCreateWhatsAppTasks) return;

  await ensureDefaultTemplates(organizationId);
  const org = await loadOrg(organizationId);
  const tpl = await getDefaultReactivationTemplate(organizationId);
  if (!tpl) return;

  const { items } = await listReactivationCustomers(organizationId, { relanceOnly: true });

  const monthKey = new Date().toISOString().slice(0, 7);

  for (const customer of items) {
    if (!thresholdEnabled(customer.bucket, settings)) continue;
    if (!customer.canPrepareWhatsApp) continue;
    if (customer.pendingWhatsAppTaskId) continue;

    const built = await buildReactivationMessage(organizationId, customer.id);
    if (!built) continue;

    await pool.query(
      `INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "templateId", type, status,
        "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,'REACTIVATION'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $5,$6,NOW(),$7,NOW()
      )
      ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
      [
        newId("wtask"),
        organizationId,
        customer.id,
        tpl.id,
        built.message,
        built.phone,
        `wa:reactivation:auto:${customer.id}:${monthKey}`,
      ],
    );
  }
}
