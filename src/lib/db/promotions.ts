import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import type {
  ComputedPromotionDiscount,
  CreatePromotionInput,
  PromotionKpis,
  PromotionListItem,
  PromotionStatus,
  PromotionType,
} from "@/types/promo";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function mapPromo(r: Record<string, unknown>): PromotionListItem {
  return {
    id: String(r.id),
    name: String(r.name),
    code: (r.code as string) ?? null,
    type: r.type as PromotionType,
    status: r.status as PromotionStatus,
    value: r.value != null ? parseFloat(String(r.value)) : null,
    serviceId: (r.serviceId as string) ?? null,
    category: (r.category as string) ?? null,
    minAmount: r.minAmount != null ? parseFloat(String(r.minAmount)) : null,
    maxUses: r.maxUses != null ? Number(r.maxUses) : null,
    usageCount: Number(r.usageCount) || 0,
    startsAt: r.startsAt ? new Date(r.startsAt as Date).toISOString() : null,
    endsAt: r.endsAt ? new Date(r.endsAt as Date).toISOString() : null,
    timeStart: (r.timeStart as string) ?? null,
    timeEnd: (r.timeEnd as string) ?? null,
    weekdays: (r.weekdays as string) ?? null,
    description: (r.description as string) ?? null,
  };
}

export async function getPromotionKpis(organizationId: string): Promise<PromotionKpis> {
  const { rows } = await pool.query<{
    activeCount: number;
    usedThisMonth: number;
    discountTotalMonth: string;
    estimatedRevenueMonth: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::int FROM "Promotion"
       WHERE "organizationId" = $1 AND status = 'ACTIVE' AND "deletedAt" IS NULL) AS "activeCount",
      (SELECT COUNT(*)::int FROM "PromotionUsage"
       WHERE "organizationId" = $1
         AND "createdAt" >= date_trunc('month', NOW())) AS "usedThisMonth",
      COALESCE((SELECT SUM("discountAmount") FROM "PromotionUsage"
        WHERE "organizationId" = $1
          AND "createdAt" >= date_trunc('month', NOW())), 0)::text AS "discountTotalMonth",
      COALESCE((SELECT SUM(i.total) FROM "Invoice" i
        WHERE i."organizationId" = $1 AND i."promotionId" IS NOT NULL
          AND i."issuedAt" >= date_trunc('month', NOW())
          AND i.status <> 'VOID'), 0)::text AS "estimatedRevenueMonth"`,
    [organizationId],
  );
  return {
    activeCount: rows[0]?.activeCount ?? 0,
    usedThisMonth: rows[0]?.usedThisMonth ?? 0,
    discountTotalMonth: Math.round((parseFloat(rows[0]?.discountTotalMonth ?? "0") || 0) * 100) / 100,
    estimatedRevenueMonth:
      Math.round((parseFloat(rows[0]?.estimatedRevenueMonth ?? "0") || 0) * 100) / 100,
  };
}

export async function listPromotions(
  organizationId: string,
  opts: { page: number; limit: number; status?: string | null; search?: string },
): Promise<{ items: PromotionListItem[]; total: number; kpis: PromotionKpis }> {
  const conditions = [`"organizationId" = $1`, `"deletedAt" IS NULL`];
  const params: unknown[] = [organizationId];
  let pi = 2;
  if (opts.status) {
    conditions.push(`status = $${pi}::"PromotionStatus"`);
    params.push(opts.status);
    pi++;
  }
  if (opts.search) {
    conditions.push(`(name ILIKE $${pi} OR COALESCE(code,'') ILIKE $${pi})`);
    params.push(`%${opts.search}%`);
    pi++;
  }
  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;
  const [countRes, listRes, kpis] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "Promotion" WHERE ${where}`,
      params,
    ),
    pool.query(
      `SELECT id, name, code, type::text, status::text, value::text, "serviceId", category,
              "minAmount"::text, "maxUses", "usageCount", "startsAt", "endsAt",
              "timeStart", "timeEnd", weekdays, description
       FROM "Promotion" WHERE ${where}
       ORDER BY "createdAt" DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
    getPromotionKpis(organizationId),
  ]);
  return {
    items: listRes.rows.map((r) => mapPromo(r as Record<string, unknown>)),
    total: countRes.rows[0]?.total ?? 0,
    kpis,
  };
}

export async function createPromotion(
  organizationId: string,
  input: CreatePromotionInput,
  actor: { id: string; name?: string | null },
): Promise<PromotionListItem> {
  const id = newId("promo");
  await pool.query(
    `INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "serviceId", category,
      "customerId", "minAmount", "maxUses", "maxUsesPerCustomer", "usageCount",
      "startsAt", "endsAt", "timeStart", "timeEnd", weekdays, description, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5::"PromotionType",$6::"PromotionStatus",$7,$8,$9,
      $10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,NOW()
    )`,
    [
      id,
      organizationId,
      input.name,
      input.code ?? null,
      input.type,
      input.status ?? "ACTIVE",
      input.value ?? null,
      input.serviceId ?? null,
      input.category ?? null,
      input.customerId ?? null,
      input.minAmount ?? null,
      input.maxUses ?? null,
      input.maxUsesPerCustomer ?? null,
      input.startsAt ? new Date(input.startsAt) : null,
      input.endsAt ? new Date(input.endsAt) : null,
      input.timeStart ?? null,
      input.timeEnd ?? null,
      input.weekdays ?? null,
      input.description ?? null,
    ],
  );
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "Promotion",
    entityId: id,
    action: "CREATE",
    after: input,
  });
  const { items } = await listPromotions(organizationId, { page: 1, limit: 1, search: input.name });
  return items.find((p) => p.id === id) ?? items[0];
}

export async function setPromotionStatus(
  organizationId: string,
  promotionId: string,
  status: PromotionStatus,
  actor: { id: string; name?: string | null },
): Promise<PromotionListItem> {
  await pool.query(
    `UPDATE "Promotion" SET status = $1::"PromotionStatus", "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3 AND "deletedAt" IS NULL`,
    [status, promotionId, organizationId],
  );
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "Promotion",
    entityId: promotionId,
    action: "STATUS",
    after: { status },
  });
  const { rows } = await pool.query(
    `SELECT id, name, code, type::text, status::text, value::text, "serviceId", category,
            "minAmount"::text, "maxUses", "usageCount", "startsAt", "endsAt",
            "timeStart", "timeEnd", weekdays, description
     FROM "Promotion" WHERE id = $1 AND "organizationId" = $2`,
    [promotionId, organizationId],
  );
  if (!rows[0]) throw new Error("NOT_FOUND");
  return mapPromo(rows[0] as Record<string, unknown>);
}

/**
 * Recalcule la remise côté serveur — ne jamais faire confiance au frontend.
 */
export async function computePromotionDiscount(opts: {
  organizationId: string;
  promotionId?: string | null;
  promotionCode?: string | null;
  serviceId: string;
  serviceCategory?: string | null;
  customerId: string;
  amount: number;
  at?: Date;
}): Promise<ComputedPromotionDiscount | null> {
  const at = opts.at ?? new Date();
  let promo: Record<string, unknown> | null = null;

  if (opts.promotionId) {
    const { rows } = await pool.query(
      `SELECT * FROM "Promotion"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [opts.promotionId, opts.organizationId],
    );
    promo = (rows[0] as Record<string, unknown>) ?? null;
  } else if (opts.promotionCode) {
    const { rows } = await pool.query(
      `SELECT * FROM "Promotion"
       WHERE "organizationId" = $1 AND upper(code) = upper($2) AND "deletedAt" IS NULL`,
      [opts.organizationId, opts.promotionCode],
    );
    promo = (rows[0] as Record<string, unknown>) ?? null;
  }
  if (!promo) return null;
  if (String(promo.status) !== "ACTIVE") throw new Error("PROMO_INACTIVE");

  if (promo.startsAt && new Date(promo.startsAt as Date) > at) throw new Error("PROMO_NOT_STARTED");
  if (promo.endsAt && new Date(promo.endsAt as Date) < at) throw new Error("PROMO_EXPIRED");

  if (promo.serviceId && String(promo.serviceId) !== opts.serviceId) {
    throw new Error("PROMO_SERVICE_MISMATCH");
  }
  if (promo.category && opts.serviceCategory && String(promo.category) !== opts.serviceCategory) {
    throw new Error("PROMO_CATEGORY_MISMATCH");
  }
  if (promo.customerId && String(promo.customerId) !== opts.customerId) {
    throw new Error("PROMO_CUSTOMER_MISMATCH");
  }
  const minAmount = promo.minAmount != null ? parseFloat(String(promo.minAmount)) : 0;
  if (opts.amount < minAmount) throw new Error("PROMO_MIN_AMOUNT");

  if (promo.maxUses != null && Number(promo.usageCount) >= Number(promo.maxUses)) {
    throw new Error("PROMO_MAX_USES");
  }
  if (promo.maxUsesPerCustomer != null) {
    const { rows } = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM "PromotionUsage"
       WHERE "promotionId" = $1 AND "customerId" = $2`,
      [promo.id, opts.customerId],
    );
    if ((rows[0]?.n ?? 0) >= Number(promo.maxUsesPerCustomer)) {
      throw new Error("PROMO_MAX_PER_CUSTOMER");
    }
  }

  const type = String(promo.type) as PromotionType;
  if (type === "HAPPY_HOUR" || promo.timeStart || promo.weekdays) {
    if (promo.weekdays) {
      const days = String(promo.weekdays).split(",").map((d) => d.trim());
      if (!days.includes(String(at.getDay()))) throw new Error("PROMO_WEEKDAY");
    }
    if (promo.timeStart && promo.timeEnd) {
      const hhmm = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
      if (hhmm < String(promo.timeStart) || hhmm > String(promo.timeEnd)) {
        throw new Error("PROMO_TIME");
      }
    }
  }

  const value = promo.value != null ? parseFloat(String(promo.value)) : 0;
  let discount = 0;
  if (type === "PERCENTAGE") {
    discount = Math.round(opts.amount * (value / 100) * 100) / 100;
  } else if (type === "FIXED_AMOUNT" || type === "HAPPY_HOUR" || type === "PACKAGE") {
    discount = Math.min(opts.amount, value);
  } else if (type === "FREE_SERVICE") {
    discount = opts.amount;
  }
  discount = Math.max(0, Math.min(opts.amount, discount));
  if (discount <= 0) return null;

  return {
    promotionId: String(promo.id),
    name: String(promo.name),
    code: (promo.code as string) ?? null,
    type,
    discountAmount: discount,
  };
}

export async function recordPromotionUsage(opts: {
  organizationId: string;
  promotionId: string;
  customerId: string;
  appointmentId?: string | null;
  invoiceId?: string | null;
  discountAmount: number;
  idempotencyKey: string;
  client?: PoolClient;
}): Promise<void> {
  const c = opts.client ?? pool;
  await c.query(
    `INSERT INTO "PromotionUsage" (
      id, "organizationId", "promotionId", "customerId", "appointmentId",
      "invoiceId", "discountAmount", "idempotencyKey"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    [
      newId("prus"),
      opts.organizationId,
      opts.promotionId,
      opts.customerId,
      opts.appointmentId ?? null,
      opts.invoiceId ?? null,
      opts.discountAmount,
      opts.idempotencyKey,
    ],
  );
  await c.query(
    `UPDATE "Promotion" SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2
       AND NOT EXISTS (
         SELECT 1 FROM "PromotionUsage"
         WHERE "organizationId" = $2 AND "idempotencyKey" = $3
           AND id <> (
             SELECT id FROM "PromotionUsage"
             WHERE "organizationId" = $2 AND "idempotencyKey" = $3
             LIMIT 1
           )
       )`,
    [opts.promotionId, opts.organizationId, opts.idempotencyKey],
  );
  // Simpler usage count: only increment if insert happened
  // The ON CONFLICT makes increment tricky — use a safer approach:
  await c.query(
    `UPDATE "Promotion" p SET "usageCount" = (
       SELECT COUNT(*) FROM "PromotionUsage" u WHERE u."promotionId" = p.id
     ), "updatedAt" = NOW()
     WHERE p.id = $1`,
    [opts.promotionId],
  );
}
