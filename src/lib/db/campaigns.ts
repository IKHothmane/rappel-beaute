import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { getOrCreateReactivationSettings, MARKETING_WA_TYPES } from "@/lib/db/reactivation";
import { renderTemplateBody } from "@/lib/db/whatsapp";
import type {
  CampaignChannel,
  CampaignDetail,
  CampaignKpis,
  CampaignListItem,
  CampaignPreviewResult,
  CampaignRecipientItem,
  CampaignSegmentFilters,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@/types/campaign";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function formatMonthFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

type AudienceRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  marketingWhatsapp: boolean;
  marketingEmail: boolean;
  visits: number;
  revenue: number;
  lastVisitAt: Date | null;
  daysSince: number | null;
  hasUpcoming: boolean;
  lastMarketingSentAt: Date | null;
  lastServiceName: string | null;
};

const STATS_CTE = `
  WITH customer_stats AS (
    SELECT
      cu.id,
      cu."firstName",
      cu."lastName",
      cu.phone,
      cu.email,
      cu.status::text AS status,
      cu."marketingWhatsapp",
      cu."marketingEmail",
      COUNT(DISTINCT CASE WHEN a.status = 'COMPLETED' THEN a.id END)::int AS visits,
      COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN a.price ELSE 0 END), 0)::float AS revenue,
      MAX(CASE WHEN a.status = 'COMPLETED' THEN a."startAt" END) AS "lastVisitAt",
      la.level::text AS "loyaltyLevel",
      EXISTS (
        SELECT 1 FROM "Appointment" ua
        WHERE ua."customerId" = cu.id
          AND ua.status IN ('PENDING','CONFIRMED')
          AND ua."startAt" >= NOW()
      ) AS "hasUpcoming",
      (
        SELECT wt."sentAt" FROM "WhatsAppTask" wt
        WHERE wt."customerId" = cu.id
          AND wt."organizationId" = cu."organizationId"
          AND wt.type::text = ANY($2::text[])
          AND wt.status = 'SENT'::"WhatsAppTaskStatus"
          AND wt."sentAt" IS NOT NULL
        ORDER BY wt."sentAt" DESC LIMIT 1
      ) AS "lastMarketingSentAt",
      (
        SELECT s.name FROM "Appointment" la2
        JOIN "Service" s ON s.id = la2."serviceId"
        WHERE la2."customerId" = cu.id AND la2.status = 'COMPLETED'
        ORDER BY la2."startAt" DESC LIMIT 1
      ) AS "lastServiceName",
      EXISTS (
        SELECT 1 FROM "Package" p
        WHERE p."customerId" = cu.id AND p."organizationId" = cu."organizationId"
          AND p.status = 'ACTIVE'::"PackageStatus"
      ) AS "hasActivePackage",
      EXISTS (
        SELECT 1 FROM "Package" p
        WHERE p."customerId" = cu.id AND p."organizationId" = cu."organizationId"
          AND p.status = 'ACTIVE'::"PackageStatus"
          AND (p."sessionTotal" - p."sessionUsed") <= 1
      ) AS "packageExpiringSoon"
    FROM "Customer" cu
    LEFT JOIN "Appointment" a ON a."customerId" = cu.id
    LEFT JOIN "LoyaltyAccount" la ON la."customerId" = cu.id AND la."organizationId" = cu."organizationId"
    WHERE cu."organizationId" = $1 AND cu."deletedAt" IS NULL
    GROUP BY cu.id, cu."firstName", cu."lastName", cu.phone, cu.email, cu.status,
             cu."marketingWhatsapp", cu."marketingEmail", la.level
  )
`;

function buildSegmentConditions(
  filters: CampaignSegmentFilters,
  channel: CampaignChannel,
  params: unknown[],
  startIdx: number,
): { sql: string; nextIdx: number } {
  const parts: string[] = [];
  let pi = startIdx;

  if (filters.customerStatuses?.length) {
    parts.push(`cs.status = ANY($${pi}::text[])`);
    params.push(filters.customerStatuses);
    pi++;
  }

  if (filters.minDaysSinceLastVisit != null) {
    parts.push(`cs."lastVisitAt" IS NOT NULL`);
    parts.push(`EXTRACT(DAY FROM NOW() - cs."lastVisitAt") >= $${pi}`);
    params.push(filters.minDaysSinceLastVisit);
    pi++;
  }

  if (filters.maxDaysSinceLastVisit != null) {
    parts.push(`cs."lastVisitAt" IS NOT NULL`);
    parts.push(`EXTRACT(DAY FROM NOW() - cs."lastVisitAt") <= $${pi}`);
    params.push(filters.maxDaysSinceLastVisit);
    pi++;
  }

  if (filters.minVisits != null) {
    parts.push(`cs.visits >= $${pi}`);
    params.push(filters.minVisits);
    pi++;
  }

  if (filters.maxVisits != null) {
    parts.push(`cs.visits <= $${pi}`);
    params.push(filters.maxVisits);
    pi++;
  }

  if (filters.minRevenue != null) {
    parts.push(`cs.revenue >= $${pi}`);
    params.push(filters.minRevenue);
    pi++;
  }

  if (filters.maxRevenue != null) {
    parts.push(`cs.revenue <= $${pi}`);
    params.push(filters.maxRevenue);
    pi++;
  }

  if (filters.minAverageTicket != null) {
    parts.push(`cs.visits > 0 AND (cs.revenue / cs.visits) >= $${pi}`);
    params.push(filters.minAverageTicket);
    pi++;
  }

  if (filters.serviceIds?.length) {
    parts.push(`EXISTS (
      SELECT 1 FROM "Appointment" ax
      WHERE ax."customerId" = cs.id AND ax.status = 'COMPLETED'
        AND ax."serviceId" = ANY($${pi}::text[])
    )`);
    params.push(filters.serviceIds);
    pi++;
  }

  if (filters.loyaltyLevels?.length) {
    parts.push(`COALESCE(cs."loyaltyLevel", 'BRONZE') = ANY($${pi}::text[])`);
    params.push(filters.loyaltyLevels);
    pi++;
  }

  if (filters.hasActivePackage === true) {
    parts.push(`cs."hasActivePackage" = true`);
  }

  if (filters.packageExpiringSoon === true) {
    parts.push(`cs."packageExpiringSoon" = true`);
  }

  if (filters.noUpcomingAppointment !== false) {
    parts.push(`cs."hasUpcoming" = false`);
  }

  if (channel === "WHATSAPP" || filters.marketingWhatsapp === true) {
    parts.push(`cs."marketingWhatsapp" = true`);
    parts.push(`cs.phone IS NOT NULL AND cs.phone <> ''`);
  } else if (filters.marketingEmail === true) {
    parts.push(`cs."marketingEmail" = true`);
    parts.push(`cs.email IS NOT NULL AND cs.email <> ''`);
  }

  const sql = parts.length ? ` AND ${parts.join(" AND ")}` : "";
  return { sql, nextIdx: pi };
}

function excludeReason(
  row: AudienceRow,
  channel: CampaignChannel,
  minDays: number,
  excludeRecent: boolean,
): string | null {
  if (channel === "WHATSAPP") {
    if (!row.marketingWhatsapp) return "Opt-in WhatsApp absent";
    if (!row.phone) return "Numéro manquant";
  } else {
    if (!row.marketingEmail) return "Opt-in e-mail absent";
    if (!row.email) return "E-mail manquant";
  }
  if (row.hasUpcoming) return "Rendez-vous à venir";
  if (excludeRecent && row.lastMarketingSentAt) {
    const days = (Date.now() - new Date(row.lastMarketingSentAt).getTime()) / 86400000;
    if (days < minDays) {
      return `Message marketing récent (${Math.floor(days)} j, min. ${minDays} j)`;
    }
  }
  return null;
}

async function loadPromotion(orgId: string, promotionId: string | null) {
  if (!promotionId) return null;
  const { rows } = await pool.query<{ name: string; code: string | null; value: string | null; type: string }>(
    `SELECT name, code, value::text, type::text FROM "Promotion"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [promotionId, orgId],
  );
  const p = rows[0];
  if (!p) return null;
  let discount = "";
  if (p.type === "PERCENTAGE" && p.value) discount = `-${p.value}%`;
  else if (p.value) discount = `-${p.value} MAD`;
  return { name: p.name, code: p.code ?? "", discount };
}

async function buildCampaignMessage(
  organizationId: string,
  template: string,
  row: AudienceRow,
  promotionId: string | null,
): Promise<string> {
  const orgRes = await pool.query<{ name: string; phone: string | null; address: string | null }>(
    `SELECT name, phone, address FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  const org = orgRes.rows[0] ?? { name: "", phone: "", address: "" };
  const promo = await loadPromotion(organizationId, promotionId);
  const lastVisitAt = row.lastVisitAt ? new Date(row.lastVisitAt) : null;

  return renderTemplateBody(template, {
    customer: { firstName: row.firstName, lastName: row.lastName },
    organization: { name: org.name, phone: org.phone ?? "", address: org.address ?? "" },
    service: { name: row.lastServiceName ?? "", price: "" },
    promotion: { code: promo?.code ?? "", discount: promo?.discount ?? "" },
    lastVisit: {
      date: lastVisitAt ? formatMonthFr(lastVisitAt) : "",
      days: row.daysSince != null ? String(row.daysSince) : "",
    },
    lastService: { name: row.lastServiceName ?? "" },
  });
}

async function queryAudience(
  organizationId: string,
  filters: CampaignSegmentFilters,
  channel: CampaignChannel,
): Promise<AudienceRow[]> {
  const params: unknown[] = [organizationId, MARKETING_WA_TYPES];
  const { sql: segmentSql, nextIdx: pi } = buildSegmentConditions(filters, channel, params, 3);

  const { rows } = await pool.query(
    `${STATS_CTE}
     SELECT
       cs.id,
       cs."firstName",
       cs."lastName",
       cs.phone,
       cs.email,
       cs."marketingWhatsapp",
       cs."marketingEmail",
       cs.visits,
       cs.revenue,
       cs."lastVisitAt",
       CASE WHEN cs."lastVisitAt" IS NOT NULL
         THEN GREATEST(0, EXTRACT(DAY FROM NOW() - cs."lastVisitAt")::int)
         ELSE NULL END AS "daysSince",
       cs."hasUpcoming",
       cs."lastMarketingSentAt",
       cs."lastServiceName"
     FROM customer_stats cs
     WHERE 1=1 ${segmentSql}
     ORDER BY cs.revenue DESC, cs."lastName"
     LIMIT 500`,
    params,
  );
  return rows as AudienceRow[];
}

export async function previewCampaignAudience(
  organizationId: string,
  filters: CampaignSegmentFilters,
  channel: CampaignChannel,
  messageTemplate: string,
  promotionId?: string | null,
): Promise<CampaignPreviewResult> {
  const settings = await getOrCreateReactivationSettings(organizationId);
  const excludeRecent = filters.excludeRecentMarketing !== false;
  const rows = await queryAudience(organizationId, filters, channel);

  const checks: string[] = [];
  if (channel === "WHATSAPP") checks.push("Opt-in WhatsApp");
  if (filters.noUpcomingAppointment !== false) checks.push("Aucun RDV futur");
  if (filters.minDaysSinceLastVisit != null) {
    checks.push(`Dernière visite > ${filters.minDaysSinceLastVisit} jours`);
  }
  if (excludeRecent) {
    checks.push(`Pas de message marketing < ${settings.minimumDaysBetweenMarketingMessages} j`);
  }

  const customers = rows.map((r) => {
    const reason = excludeReason(r, channel, settings.minimumDaysBetweenMarketingMessages, excludeRecent);
    return {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      lastVisitAt: r.lastVisitAt ? new Date(r.lastVisitAt).toISOString() : null,
      daysSinceLastVisit: r.daysSince,
      excluded: !!reason,
      excludeReason: reason,
    };
  });

  const eligible = customers.filter((c) => !c.excluded);
  const firstEligible = rows.find((r) => !excludeReason(r, channel, settings.minimumDaysBetweenMarketingMessages, excludeRecent));

  let sampleMessage: string | null = null;
  let sampleCustomer: { id: string; name: string } | null = null;
  if (firstEligible) {
    sampleMessage = await buildCampaignMessage(
      organizationId,
      messageTemplate,
      firstEligible,
      promotionId ?? null,
    );
    sampleCustomer = {
      id: firstEligible.id,
      name: `${firstEligible.firstName} ${firstEligible.lastName}`,
    };
  }

  return {
    eligibleCount: eligible.length,
    excludedCount: customers.length - eligible.length,
    checks,
    sampleMessage,
    sampleCustomer,
    customers: customers.slice(0, 50),
  };
}

function mapCampaignList(r: Record<string, unknown>): CampaignListItem {
  return {
    id: String(r.id),
    name: String(r.name),
    channel: r.channel as CampaignListItem["channel"],
    status: r.status as CampaignStatus,
    audienceCount: Number(r.audienceCount) || 0,
    pendingCount: Number(r.pendingCount) || 0,
    sentCount: Number(r.sentCount) || 0,
    promotionId: (r.promotionId as string) ?? null,
    promotionName: (r.promotionName as string) ?? null,
    preparedAt: r.preparedAt ? new Date(r.preparedAt as Date).toISOString() : null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

export async function getCampaignKpis(organizationId: string): Promise<CampaignKpis> {
  const { rows } = await pool.query<{
    activeCampaigns: number;
    targetedCustomers: number;
    pendingMessages: number;
    sentMessages: number;
    attributedRevenue: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::int FROM "Campaign"
       WHERE "organizationId" = $1 AND status = 'ACTIVE'::"CampaignStatus") AS "activeCampaigns",
      (SELECT COALESCE(SUM("audienceCount"), 0)::int FROM "Campaign"
       WHERE "organizationId" = $1 AND status IN ('ACTIVE','COMPLETED')) AS "targetedCustomers",
      (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
       JOIN "Campaign" c ON c.id = cr."campaignId"
       WHERE c."organizationId" = $1 AND cr.status = 'PENDING'::"CampaignRecipientStatus") AS "pendingMessages",
      (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
       JOIN "Campaign" c ON c.id = cr."campaignId"
       WHERE c."organizationId" = $1 AND cr.status = 'SENT'::"CampaignRecipientStatus") AS "sentMessages",
      COALESCE((
        SELECT SUM(i.total)::float FROM "Invoice" i
        JOIN "Campaign" camp ON camp."promotionId" = i."promotionId"
        JOIN "CampaignRecipient" cr ON cr."campaignId" = camp.id AND cr."customerId" = i."customerId"
        WHERE camp."organizationId" = $1
          AND camp."preparedAt" IS NOT NULL
          AND i."issuedAt" >= camp."preparedAt"
          AND i.status <> 'VOID'
      ), 0)::text AS "attributedRevenue"`,
    [organizationId],
  );
  const r = rows[0];
  return {
    activeCampaigns: r?.activeCampaigns ?? 0,
    targetedCustomers: r?.targetedCustomers ?? 0,
    pendingMessages: r?.pendingMessages ?? 0,
    sentMessages: r?.sentMessages ?? 0,
    attributedRevenue: Math.round((parseFloat(r?.attributedRevenue ?? "0") || 0) * 100) / 100,
  };
}

export async function listCampaigns(organizationId: string): Promise<{
  items: CampaignListItem[];
  kpis: CampaignKpis;
}> {
  const [listRes, kpis] = await Promise.all([
    pool.query(
      `SELECT c.*,
              p.name AS "promotionName",
              (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
               WHERE cr."campaignId" = c.id AND cr.status = 'PENDING'::"CampaignRecipientStatus") AS "pendingCount",
              (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
               WHERE cr."campaignId" = c.id AND cr.status = 'SENT'::"CampaignRecipientStatus") AS "sentCount"
       FROM "Campaign" c
       LEFT JOIN "Promotion" p ON p.id = c."promotionId"
       WHERE c."organizationId" = $1
       ORDER BY c."createdAt" DESC
       LIMIT 50`,
      [organizationId],
    ),
    getCampaignKpis(organizationId),
  ]);

  return {
    items: listRes.rows.map((r) => mapCampaignList(r as Record<string, unknown>)),
    kpis,
  };
}

export async function createCampaign(
  organizationId: string,
  input: CreateCampaignInput,
  actor: { id: string; name?: string | null },
): Promise<CampaignListItem> {
  const id = newId("camp");
  await pool.query(
    `INSERT INTO "Campaign" (
      id, "organizationId", name, channel, status, "messageTemplate",
      "segmentFilters", "promotionId", "scheduledFor", "createdById", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4::"CampaignChannel",'DRAFT'::"CampaignStatus",$5,$6::jsonb,$7,$8,$9,NOW()
    )`,
    [
      id,
      organizationId,
      input.name,
      input.channel,
      input.messageTemplate,
      JSON.stringify(input.segmentFilters),
      input.promotionId ?? null,
      input.scheduledFor ? new Date(input.scheduledFor) : null,
      actor.id,
    ],
  );

  await writeAuditLog({
    organizationId,
    entityType: "Campaign",
    entityId: id,
    action: "CREATE",
    actorId: actor.id,
    actorName: actor.name,
  });

  const detail = await getCampaignById(organizationId, id);
  if (!detail) throw new Error("Campagne introuvable après création.");
  return detail;
}

export async function getCampaignById(
  organizationId: string,
  campaignId: string,
): Promise<CampaignDetail | null> {
  const { rows } = await pool.query(
    `SELECT c.*,
            p.name AS "promotionName",
            (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
             WHERE cr."campaignId" = c.id AND cr.status = 'PENDING'::"CampaignRecipientStatus") AS "pendingCount",
            (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
             WHERE cr."campaignId" = c.id AND cr.status = 'SENT'::"CampaignRecipientStatus") AS "sentCount",
            (SELECT COUNT(*)::int FROM "CampaignRecipient" cr
             WHERE cr."campaignId" = c.id AND cr.status = 'SKIPPED'::"CampaignRecipientStatus") AS "skippedCount",
            COALESCE((
              SELECT SUM(i.total)::float FROM "Invoice" i
              WHERE i."promotionId" = c."promotionId"
                AND c."preparedAt" IS NOT NULL
                AND i."issuedAt" >= c."preparedAt"
                AND i.status <> 'VOID'
                AND EXISTS (
                  SELECT 1 FROM "CampaignRecipient" cr
                  WHERE cr."campaignId" = c.id AND cr."customerId" = i."customerId"
                )
            ), 0)::text AS "attributedRevenue"
     FROM "Campaign" c
     LEFT JOIN "Promotion" p ON p.id = c."promotionId"
     WHERE c.id = $2 AND c."organizationId" = $1`,
    [organizationId, campaignId],
  );
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;

  const base = mapCampaignList(r);
  return {
    ...base,
    messageTemplate: String(r.messageTemplate),
    segmentFilters: (r.segmentFilters ?? {}) as CampaignSegmentFilters,
    scheduledFor: r.scheduledFor ? new Date(r.scheduledFor as Date).toISOString() : null,
    skippedCount: Number(r.skippedCount) || 0,
    attributedRevenue: Math.round((parseFloat(String(r.attributedRevenue ?? "0")) || 0) * 100) / 100,
  };
}

export async function updateCampaign(
  organizationId: string,
  campaignId: string,
  input: UpdateCampaignInput,
  actor: { id: string; name?: string | null },
): Promise<CampaignDetail | null> {
  const existing = await getCampaignById(organizationId, campaignId);
  if (!existing) return null;
  if (existing.status !== "DRAFT" && input.segmentFilters) {
    throw new Error("Impossible de modifier l'audience d'une campagne préparée.");
  }

  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [organizationId, campaignId];
  let pi = 3;

  if (input.name !== undefined) {
    sets.push(`name = $${pi}`);
    params.push(input.name);
    pi++;
  }
  if (input.status !== undefined) {
    sets.push(`status = $${pi}::"CampaignStatus"`);
    params.push(input.status);
    pi++;
  }
  if (input.messageTemplate !== undefined) {
    sets.push(`"messageTemplate" = $${pi}`);
    params.push(input.messageTemplate);
    pi++;
  }
  if (input.segmentFilters !== undefined) {
    sets.push(`"segmentFilters" = $${pi}::jsonb`);
    params.push(JSON.stringify(input.segmentFilters));
    pi++;
  }
  if (input.promotionId !== undefined) {
    sets.push(`"promotionId" = $${pi}`);
    params.push(input.promotionId);
    pi++;
  }
  if (input.scheduledFor !== undefined) {
    sets.push(`"scheduledFor" = $${pi}`);
    params.push(input.scheduledFor ? new Date(input.scheduledFor) : null);
    pi++;
  }

  await pool.query(
    `UPDATE "Campaign" SET ${sets.join(", ")} WHERE "organizationId" = $1 AND id = $2`,
    params,
  );

  await writeAuditLog({
    organizationId,
    entityType: "Campaign",
    entityId: campaignId,
    action: "UPDATE",
    actorId: actor.id,
    actorName: actor.name,
    after: input,
  });

  return getCampaignById(organizationId, campaignId);
}

async function insertRecipientWithTask(
  client: PoolClient,
  organizationId: string,
  campaignId: string,
  row: AudienceRow,
  message: string,
  channel: CampaignChannel,
): Promise<void> {
  const recipientId = newId("crec");
  const idempotencyKey = `campaign:${campaignId}:customer:${row.id}`;

  if (channel === "WHATSAPP") {
    const taskId = newId("wtask");
    await client.query(
      `INSERT INTO "WhatsAppTask" (
        id, "organizationId", "customerId", "campaignId", type, status,
        "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,'PROMOTION'::"WhatsAppTaskType",'PENDING'::"WhatsAppTaskStatus",
        $5,$6,NOW(),$7,NOW()
      )
      ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
      [taskId, organizationId, row.id, campaignId, message, row.phone, idempotencyKey],
    );

    const taskRes = await client.query<{ id: string }>(
      `SELECT id FROM "WhatsAppTask" WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [organizationId, idempotencyKey],
    );
    const whatsappTaskId = taskRes.rows[0]?.id ?? taskId;

    await client.query(
      `INSERT INTO "CampaignRecipient" (
        id, "campaignId", "customerId", status, "messageSnapshot",
        "phoneSnapshot", "whatsappTaskId", "updatedAt"
      ) VALUES (
        $1,$2,$3,'PENDING'::"CampaignRecipientStatus",$4,$5,$6,NOW()
      )
      ON CONFLICT ("campaignId", "customerId") DO NOTHING`,
      [recipientId, campaignId, row.id, message, row.phone, whatsappTaskId],
    );
  } else {
    await client.query(
      `INSERT INTO "CampaignRecipient" (
        id, "campaignId", "customerId", status, "messageSnapshot",
        "emailSnapshot", "updatedAt"
      ) VALUES (
        $1,$2,$3,'PENDING'::"CampaignRecipientStatus",$4,$5,NOW()
      )
      ON CONFLICT ("campaignId", "customerId") DO NOTHING`,
      [recipientId, campaignId, row.id, message, row.email],
    );
  }
}

export async function prepareCampaign(
  organizationId: string,
  campaignId: string,
  actor: { id: string; name?: string | null },
): Promise<{ prepared: number; skipped: number }> {
  const campaign = await getCampaignById(organizationId, campaignId);
  if (!campaign) throw new Error("Campagne introuvable.");
  if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
    throw new Error("Campagne terminée ou annulée.");
  }

  const settings = await getOrCreateReactivationSettings(organizationId);
  const excludeRecent = campaign.segmentFilters.excludeRecentMarketing !== false;
  const rows = await queryAudience(organizationId, campaign.segmentFilters, campaign.channel);

  const client = await pool.connect();
  let prepared = 0;
  let skipped = 0;

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const reason = excludeReason(
        row,
        campaign.channel,
        settings.minimumDaysBetweenMarketingMessages,
        excludeRecent,
      );
      if (reason) {
        skipped++;
        continue;
      }

      const message = await buildCampaignMessage(
        organizationId,
        campaign.messageTemplate,
        row,
        campaign.promotionId,
      );

      await insertRecipientWithTask(
        client,
        organizationId,
        campaignId,
        row,
        message,
        campaign.channel,
      );
      prepared++;
    }

    const countRes = await client.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM "CampaignRecipient" WHERE "campaignId" = $1`,
      [campaignId],
    );
    const audienceCount = countRes.rows[0]?.n ?? 0;

    await client.query(
      `UPDATE "Campaign"
       SET status = CASE WHEN $3 > 0 THEN 'ACTIVE'::"CampaignStatus" ELSE status END,
           "audienceCount" = $3,
           "preparedAt" = CASE WHEN $3 > 0 THEN NOW() ELSE "preparedAt" END,
           "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,
      [campaignId, organizationId, audienceCount],
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  await writeAuditLog({
    organizationId,
    entityType: "Campaign",
    entityId: campaignId,
    action: "PREPARE",
    actorId: actor.id,
    actorName: actor.name,
    after: { prepared, skipped },
  });

  return { prepared, skipped };
}

export async function listCampaignRecipients(
  organizationId: string,
  campaignId: string,
): Promise<CampaignRecipientItem[]> {
  const { rows } = await pool.query(
    `SELECT cr.*,
            c."firstName" || ' ' || c."lastName" AS "customerName",
            wt."sentAt"
     FROM "CampaignRecipient" cr
     JOIN "Campaign" camp ON camp.id = cr."campaignId"
     JOIN "Customer" c ON c.id = cr."customerId"
     LEFT JOIN "WhatsAppTask" wt ON wt.id = cr."whatsappTaskId"
     WHERE camp."organizationId" = $1 AND cr."campaignId" = $2
     ORDER BY cr."createdAt" ASC
     LIMIT 500`,
    [organizationId, campaignId],
  );

  return rows.map((r) => ({
    id: String(r.id),
    customerId: String(r.customerId),
    customerName: String(r.customerName),
    status: r.status as CampaignRecipientItem["status"],
    messageSnapshot: String(r.messageSnapshot),
    phoneSnapshot: (r.phoneSnapshot as string) ?? null,
    whatsappTaskId: (r.whatsappTaskId as string) ?? null,
    sentAt: r.sentAt ? new Date(r.sentAt as Date).toISOString() : null,
  }));
}

/** Sync statut destinataire quand tâche WhatsApp marquée envoyée */
export async function syncCampaignRecipientOnWhatsAppSent(
  whatsappTaskId: string,
  client?: PoolClient,
): Promise<void> {
  const c = client ?? pool;
  await c.query(
    `UPDATE "CampaignRecipient"
     SET status = 'SENT'::"CampaignRecipientStatus", "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"CampaignRecipientStatus"`,
    [whatsappTaskId],
  );
}
