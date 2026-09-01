import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import type {
  CreateInvoiceFromAppointmentInput,
  InvoiceDetail,
  InvoiceItemRow,
  InvoiceKpis,
  InvoiceListItem,
  InvoiceStatus,
  VoidInvoiceInput,
} from "@/types/invoice";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

async function nextInvoiceNumber(
  organizationId: string,
  client: PoolClient,
): Promise<string> {
  const year = new Date().getFullYear();
  await client.query(
    `INSERT INTO "InvoiceSequence" ("organizationId", year, "lastValue", "updatedAt")
     VALUES ($1, $2, 0, NOW())
     ON CONFLICT ("organizationId", year) DO NOTHING`,
    [organizationId, year],
  );
  const { rows } = await client.query<{ lastValue: number }>(
    `UPDATE "InvoiceSequence"
     SET "lastValue" = "lastValue" + 1, "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND year = $2
     RETURNING "lastValue"`,
    [organizationId, year],
  );
  const seq = rows[0]?.lastValue ?? 1;
  return `FAC-${year}-${String(seq).padStart(6, "0")}`;
}

function paidExpr(alias = "p") {
  return `COALESCE(SUM(CASE WHEN ${alias}.kind = 'REFUND' THEN -${alias}.amount ELSE ${alias}.amount END) FILTER (WHERE ${alias}.status = 'COMPLETED'), 0)`;
}

async function computePaidForInvoice(
  invoiceId: string,
  appointmentId: string | null,
  client?: PoolClient,
): Promise<{ paid: number; methods: string[] }> {
  const c = client ?? pool;
  // Paiements liés à la facture OU au RDV (si pas encore reliés)
  const { rows } = await c.query<{ paid: string; methods: string | null }>(
    `SELECT
      ${paidExpr("p")}::text AS paid,
      STRING_AGG(DISTINCT p.method::text, ',') AS methods
     FROM "Payment" p
     WHERE p.status = 'COMPLETED'
       AND (
         p."invoiceId" = $1
         OR ($2::text IS NOT NULL AND p."appointmentId" = $2 AND p."invoiceId" IS NULL)
       )`,
    [invoiceId, appointmentId],
  );
  return {
    paid: Math.round((parseFloat(rows[0]?.paid ?? "0") || 0) * 100) / 100,
    methods: rows[0]?.methods ? rows[0].methods.split(",") : [],
  };
}

function statusFromPaid(
  total: number,
  paid: number,
  current: InvoiceStatus,
): InvoiceStatus {
  if (current === "VOID" || current === "DRAFT") return current;
  if (paid <= 0.001) return "ISSUED";
  if (paid + 0.01 >= total) return "PAID";
  return "PARTIALLY_PAID";
}

function mapListRow(
  r: Record<string, unknown>,
  paid: number,
  methods: string[],
): InvoiceListItem {
  const total = parseFloat(String(r.total)) || 0;
  const status = (r.status as InvoiceStatus) === "VOID"
    ? "VOID"
    : statusFromPaid(total, paid, r.status as InvoiceStatus);
  return {
    id: String(r.id),
    number: String(r.number),
    customerId: String(r.customerId),
    customerName: String(r.customerNameSnapshot ?? r.customerName ?? ""),
    appointmentId: (r.appointmentId as string) ?? null,
    status,
    subtotal: parseFloat(String(r.subtotal)) || 0,
    discountTotal: parseFloat(String(r.discountTotal)) || 0,
    total,
    paidAmount: paid,
    remaining: Math.max(0, Math.round((total - paid) * 100) / 100),
    issuedAt: r.issuedAt ? new Date(r.issuedAt as Date).toISOString() : null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
    paymentMethods: methods,
  };
}

export async function getInvoiceKpis(organizationId: string): Promise<InvoiceKpis> {
  const { rows } = await pool.query<{
    billedTotal: string;
    paidTotal: string;
    unpaidTotal: string;
    monthCount: string;
  }>(
    `WITH inv AS (
      SELECT i.id, i.total, i.status, i."appointmentId", i."issuedAt"
      FROM "Invoice" i
      WHERE i."organizationId" = $1 AND i.status <> 'VOID'
    ),
    paid AS (
      SELECT
        inv.id,
        inv.total,
        COALESCE((
          SELECT ${paidExpr("p")}
          FROM "Payment" p
          WHERE p.status = 'COMPLETED'
            AND (p."invoiceId" = inv.id
              OR (inv."appointmentId" IS NOT NULL AND p."appointmentId" = inv."appointmentId" AND p."invoiceId" IS NULL))
        ), 0) AS paid
      FROM inv
    )
    SELECT
      COALESCE(SUM(total), 0)::text AS "billedTotal",
      COALESCE(SUM(LEAST(paid, total)), 0)::text AS "paidTotal",
      COALESCE(SUM(GREATEST(total - paid, 0)), 0)::text AS "unpaidTotal",
      (SELECT COUNT(*)::text FROM inv WHERE "issuedAt" >= date_trunc('month', NOW())) AS "monthCount"
     FROM paid`,
    [organizationId],
  );
  const r = rows[0];
  return {
    billedTotal: Math.round(parseFloat(r?.billedTotal ?? "0") * 100) / 100,
    paidTotal: Math.round(parseFloat(r?.paidTotal ?? "0") * 100) / 100,
    unpaidTotal: Math.round(parseFloat(r?.unpaidTotal ?? "0") * 100) / 100,
    monthCount: parseInt(r?.monthCount ?? "0", 10) || 0,
  };
}

export async function listInvoices(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    customerId?: string | null;
    status?: InvoiceStatus | null;
    method?: string | null;
    from?: string | null;
    to?: string | null;
  },
): Promise<{ items: InvoiceListItem[]; total: number; kpis: InvoiceKpis }> {
  const conditions = [`i."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (opts.customerId) {
    conditions.push(`i."customerId" = $${pi}`);
    params.push(opts.customerId);
    pi++;
  }
  if (opts.status) {
    conditions.push(`i.status = $${pi}::"InvoiceStatus"`);
    params.push(opts.status);
    pi++;
  }
  if (opts.search) {
    conditions.push(
      `(i.number ILIKE $${pi} OR i."customerNameSnapshot" ILIKE $${pi})`,
    );
    params.push(`%${opts.search}%`);
    pi++;
  }
  if (opts.from) {
    conditions.push(`i."issuedAt" >= $${pi}::timestamptz`);
    params.push(opts.from);
    pi++;
  }
  if (opts.to) {
    conditions.push(`i."issuedAt" < ($${pi}::date + INTERVAL '1 day')`);
    params.push(opts.to);
    pi++;
  }
  if (opts.method) {
    conditions.push(`EXISTS (
      SELECT 1 FROM "Payment" p
      WHERE p.status = 'COMPLETED' AND p.method = $${pi}::"PaymentMethod"
        AND (p."invoiceId" = i.id OR (i."appointmentId" IS NOT NULL AND p."appointmentId" = i."appointmentId"))
    )`);
    params.push(opts.method);
    pi++;
  }

  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;

  const [countRes, listRes, kpis] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "Invoice" i WHERE ${where}`,
      params,
    ),
    pool.query(
      `SELECT
        i.id, i.number, i."customerId", i."customerNameSnapshot",
        i."appointmentId", i.status::text, i.subtotal::text, i."discountTotal"::text,
        i.total::text, i."issuedAt", i."createdAt"
       FROM "Invoice" i
       WHERE ${where}
       ORDER BY COALESCE(i."issuedAt", i."createdAt") DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
    getInvoiceKpis(organizationId),
  ]);

  const items: InvoiceListItem[] = [];
  for (const row of listRes.rows) {
    const { paid, methods } = await computePaidForInvoice(
      row.id as string,
      (row.appointmentId as string) ?? null,
    );
    items.push(mapListRow(row as Record<string, unknown>, paid, methods));
  }

  return { items, total: countRes.rows[0]?.total ?? 0, kpis };
}

async function loadItems(invoiceId: string): Promise<InvoiceItemRow[]> {
  const { rows } = await pool.query(
    `SELECT id, "serviceId", "nameSnapshot", "unitPriceSnapshot"::text,
            quantity::text, discount::text, total::text, "sortOrder"
     FROM "InvoiceItem"
     WHERE "invoiceId" = $1
     ORDER BY "sortOrder", id`,
    [invoiceId],
  );
  return rows.map((r) => ({
    id: r.id,
    serviceId: r.serviceId,
    nameSnapshot: r.nameSnapshot,
    unitPriceSnapshot: parseFloat(r.unitPriceSnapshot) || 0,
    quantity: parseFloat(r.quantity) || 0,
    discount: parseFloat(r.discount) || 0,
    total: parseFloat(r.total) || 0,
    sortOrder: r.sortOrder,
  }));
}

export async function getInvoiceById(
  organizationId: string,
  invoiceId: string,
): Promise<InvoiceDetail | null> {
  const { rows } = await pool.query(
    `SELECT
      i.id, i.number, i."customerId", i."customerNameSnapshot",
      i."customerPhoneSnapshot", i."appointmentId", i.status::text,
      i."orgNameSnapshot", i."orgAddressSnapshot", i."orgPhoneSnapshot", i."orgIceSnapshot",
      i.subtotal::text, i."discountTotal"::text, i.total::text, i.notes,
      i."promotionId", i."promotionNameSnapshot", i."promotionCodeSnapshot", i."promotionTypeSnapshot",
      i."issuedAt", i."voidedAt", i."voidReason", i."createdAt", i."updatedAt"
     FROM "Invoice" i
     WHERE i.id = $1 AND i."organizationId" = $2`,
    [invoiceId, organizationId],
  );
  if (!rows[0]) return null;

  const [items, pay] = await Promise.all([
    loadItems(invoiceId),
    computePaidForInvoice(invoiceId, rows[0].appointmentId),
  ]);

  const base = mapListRow(rows[0] as Record<string, unknown>, pay.paid, pay.methods);
  // Persist derived status if drifted (non-void)
  if (base.status !== rows[0].status && rows[0].status !== "VOID" && rows[0].status !== "DRAFT") {
    await pool.query(
      `UPDATE "Invoice" SET status = $1::"InvoiceStatus", "updatedAt" = NOW() WHERE id = $2`,
      [base.status, invoiceId],
    );
  }

  return {
    ...base,
    orgNameSnapshot: rows[0].orgNameSnapshot,
    orgAddressSnapshot: rows[0].orgAddressSnapshot,
    orgPhoneSnapshot: rows[0].orgPhoneSnapshot,
    orgIceSnapshot: rows[0].orgIceSnapshot,
    customerNameSnapshot: rows[0].customerNameSnapshot,
    customerPhoneSnapshot: rows[0].customerPhoneSnapshot,
    promotionId: rows[0].promotionId ?? null,
    promotionNameSnapshot: rows[0].promotionNameSnapshot ?? null,
    promotionCodeSnapshot: rows[0].promotionCodeSnapshot ?? null,
    promotionTypeSnapshot: rows[0].promotionTypeSnapshot ?? null,
    notes: rows[0].notes,
    voidedAt: rows[0].voidedAt?.toISOString() ?? null,
    voidReason: rows[0].voidReason,
    items,
    updatedAt: rows[0].updatedAt.toISOString(),
  };
}

/**
 * Émet une facture depuis un RDV — snapshots prix + org + cliente.
 * Idempotent via clé apt:{appointmentId}:invoice
 */
export async function issueInvoiceFromAppointment(
  organizationId: string,
  input: CreateInvoiceFromAppointmentInput,
  userId?: string | null,
): Promise<{ invoice: InvoiceDetail; created: boolean }> {
  const idempotencyKey = `apt:${input.appointmentId}:invoice`;

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM "Invoice"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [organizationId, idempotencyKey],
  );
  if (existing.rows[0]) {
    const invoice = await getInvoiceById(organizationId, existing.rows[0].id);
    if (!invoice) throw new Error("NOT_FOUND");
    // Relier paiements éventuels + recalcul statut
    await linkPaymentsAndRefreshStatus(organizationId, invoice.id);
    const refreshed = await getInvoiceById(organizationId, invoice.id);
    return { invoice: refreshed!, created: false };
  }

  const apt = await pool.query<{
    id: string;
    customerId: string;
    serviceId: string;
    price: string;
    status: string;
    promotionId: string | null;
    serviceName: string;
    serviceCategory: string | null;
    customerFirst: string;
    customerLast: string;
    customerPhone: string;
  }>(
    `SELECT
      a.id, a."customerId", a."serviceId", a.price::text, a.status::text, a."promotionId",
      s.name AS "serviceName", s.category AS "serviceCategory",
      c."firstName" AS "customerFirst", c."lastName" AS "customerLast", c.phone AS "customerPhone"
     FROM "Appointment" a
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     WHERE a.id = $1 AND a."organizationId" = $2`,
    [input.appointmentId, organizationId],
  );
  if (!apt.rows[0]) throw new Error("APPOINTMENT_NOT_FOUND");

  const org = await pool.query<{
    name: string;
    address: string | null;
    phone: string | null;
    ice: string | null;
  }>(
    `SELECT name, address, phone, ice FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  if (!org.rows[0]) throw new Error("ORG_NOT_FOUND");

  const unitPrice = parseFloat(apt.rows[0].price) || 0;

  // Remise : toujours recalculée serveur si promo liée
  let discount = 0;
  let promoSnap: {
    promotionId: string;
    name: string;
    code: string | null;
    type: string;
  } | null = null;

  const promoId = input.promotionId || apt.rows[0].promotionId;
  const promoCode = input.promotionCode;
  if (promoId || promoCode) {
    const { computePromotionDiscount } = await import("@/lib/db/promotions");
    const computed = await computePromotionDiscount({
      organizationId,
      promotionId: promoId,
      promotionCode: promoCode,
      serviceId: apt.rows[0].serviceId,
      serviceCategory: apt.rows[0].serviceCategory,
      customerId: apt.rows[0].customerId,
      amount: unitPrice,
    });
    if (computed) {
      discount = computed.discountAmount;
      promoSnap = {
        promotionId: computed.promotionId,
        name: computed.name,
        code: computed.code,
        type: computed.type,
      };
    }
  } else if (input.discountTotal != null && input.discountTotal > 0) {
    // Pas de promo : remise manuelle plafonnée (OWNER) — V1 autorisée sans code
    discount = Math.min(unitPrice, Math.max(0, input.discountTotal));
  }

  const lineTotal = Math.max(0, Math.round((unitPrice - discount) * 100) / 100);
  const subtotal = unitPrice;
  const total = lineTotal;

  const client = await pool.connect();
  let invoiceId = "";
  try {
    await client.query("BEGIN");
    const number = await nextInvoiceNumber(organizationId, client);
    invoiceId = newId("inv");
    const customerName =
      `${apt.rows[0].customerFirst} ${apt.rows[0].customerLast}`.trim();

    await client.query(
      `INSERT INTO "Invoice" (
        id, "organizationId", number, "appointmentId", "customerId", status,
        "orgNameSnapshot", "orgAddressSnapshot", "orgPhoneSnapshot", "orgIceSnapshot",
        "customerNameSnapshot", "customerPhoneSnapshot",
        subtotal, "discountTotal", total,
        "promotionId", "promotionNameSnapshot", "promotionCodeSnapshot", "promotionTypeSnapshot",
        notes, "issuedAt", "createdById", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,'ISSUED'::"InvoiceStatus",
        $6,$7,$8,$9,$10,$11,
        $12,$13,$14,
        $15,$16,$17,$18,
        $19,NOW(),$20,$21,NOW()
      )`,
      [
        invoiceId,
        organizationId,
        number,
        input.appointmentId,
        apt.rows[0].customerId,
        org.rows[0].name,
        org.rows[0].address,
        org.rows[0].phone,
        org.rows[0].ice,
        customerName,
        apt.rows[0].customerPhone,
        subtotal,
        discount,
        total,
        promoSnap?.promotionId ?? null,
        promoSnap?.name ?? null,
        promoSnap?.code ?? null,
        promoSnap?.type ?? null,
        input.notes ?? null,
        userId ?? null,
        idempotencyKey,
      ],
    );

    await client.query(
      `INSERT INTO "InvoiceItem" (
        id, "invoiceId", "serviceId", "nameSnapshot", "unitPriceSnapshot",
        quantity, discount, total, "sortOrder"
      ) VALUES ($1,$2,$3,$4,$5,1,$6,$7,0)`,
      [
        newId("ini"),
        invoiceId,
        apt.rows[0].serviceId,
        apt.rows[0].serviceName,
        unitPrice,
        discount,
        total,
      ],
    );

    if (promoSnap && discount > 0) {
      const { recordPromotionUsage } = await import("@/lib/db/promotions");
      await recordPromotionUsage({
        organizationId,
        promotionId: promoSnap.promotionId,
        customerId: apt.rows[0].customerId,
        appointmentId: input.appointmentId,
        invoiceId,
        discountAmount: discount,
        idempotencyKey: `apt:${input.appointmentId}:promo`,
        client,
      });
    }

    // Lier les paiements du RDV à la facture
    await client.query(
      `UPDATE "Payment" SET "invoiceId" = $1
       WHERE "appointmentId" = $2 AND "organizationId" = $3 AND "invoiceId" IS NULL`,
      [invoiceId, input.appointmentId, organizationId],
    );

    const pay = await computePaidForInvoice(invoiceId, input.appointmentId, client);
    const status = statusFromPaid(total, pay.paid, "ISSUED");
    await client.query(
      `UPDATE "Invoice" SET status = $1::"InvoiceStatus", "updatedAt" = NOW() WHERE id = $2`,
      [status, invoiceId],
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) {
      const again = await pool.query<{ id: string }>(
        `SELECT id FROM "Invoice"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
        [organizationId, idempotencyKey],
      );
      if (again.rows[0]) {
        const invoice = await getInvoiceById(organizationId, again.rows[0].id);
        return { invoice: invoice!, created: false };
      }
    }
    throw e;
  } finally {
    client.release();
  }

  const invoice = await getInvoiceById(organizationId, invoiceId);
  if (!invoice) throw new Error("NOT_FOUND");
  return { invoice, created: true };
}

async function linkPaymentsAndRefreshStatus(
  organizationId: string,
  invoiceId: string,
) {
  const inv = await pool.query<{ appointmentId: string | null; total: string; status: string }>(
    `SELECT "appointmentId", total::text, status::text FROM "Invoice"
     WHERE id = $1 AND "organizationId" = $2`,
    [invoiceId, organizationId],
  );
  if (!inv.rows[0] || inv.rows[0].status === "VOID") return;

  if (inv.rows[0].appointmentId) {
    await pool.query(
      `UPDATE "Payment" SET "invoiceId" = $1
       WHERE "appointmentId" = $2 AND "organizationId" = $3 AND "invoiceId" IS NULL`,
      [invoiceId, inv.rows[0].appointmentId, organizationId],
    );
  }

  const pay = await computePaidForInvoice(invoiceId, inv.rows[0].appointmentId);
  const total = parseFloat(inv.rows[0].total) || 0;
  const status = statusFromPaid(total, pay.paid, inv.rows[0].status as InvoiceStatus);
  await pool.query(
    `UPDATE "Invoice" SET status = $1::"InvoiceStatus", "updatedAt" = NOW() WHERE id = $2`,
    [status, invoiceId],
  );
}

export async function voidInvoice(
  organizationId: string,
  invoiceId: string,
  input: VoidInvoiceInput,
): Promise<InvoiceDetail> {
  const existing = await getInvoiceById(organizationId, invoiceId);
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status === "VOID") return existing;

  await pool.query(
    `UPDATE "Invoice"
     SET status = 'VOID'::"InvoiceStatus",
         "voidedAt" = NOW(),
         "voidReason" = $1,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,
    [input.reason, invoiceId, organizationId],
  );

  const invoice = await getInvoiceById(organizationId, invoiceId);
  if (!invoice) throw new Error("NOT_FOUND");
  return invoice;
}

/** Rafraîchir statut facture après un paiement */
export async function refreshInvoiceStatusForAppointment(
  organizationId: string,
  appointmentId: string,
) {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM "Invoice"
     WHERE "organizationId" = $1 AND "appointmentId" = $2 AND status <> 'VOID'`,
    [organizationId, appointmentId],
  );
  for (const r of rows) {
    await linkPaymentsAndRefreshStatus(organizationId, r.id);
  }
}

/**
 * Figé la commission employée au COMPLETED — idempotent.
 * @deprecated import depuis @/lib/db/commissions
 */
export { createCommissionForAppointment } from "@/lib/db/commissions";

/**
 * Effets secondaires idempotents du passage COMPLETED :
 * stock + facture + commission + consommation forfait
 */
export async function onAppointmentCompleted(opts: {
  organizationId: string;
  appointmentId: string;
  serviceId: string;
  userId?: string | null;
}): Promise<void> {
  const { consumeProductsForAppointment } = await import("@/lib/db/inventory");
  const { createCommissionForAppointment } = await import("@/lib/db/commissions");
  const { consumePackageSessionForAppointment } = await import("@/lib/db/loyalty");

  await consumeProductsForAppointment({
    organizationId: opts.organizationId,
    appointmentId: opts.appointmentId,
    serviceId: opts.serviceId,
    userId: opts.userId,
  });

  await issueInvoiceFromAppointment(
    opts.organizationId,
    { appointmentId: opts.appointmentId },
    opts.userId,
  );

  await createCommissionForAppointment({
    organizationId: opts.organizationId,
    appointmentId: opts.appointmentId,
  });

  const apt = await pool.query<{ customerId: string }>(
    `SELECT "customerId" FROM "Appointment" WHERE id = $1 AND "organizationId" = $2`,
    [opts.appointmentId, opts.organizationId],
  );
  if (apt.rows[0]) {
    await consumePackageSessionForAppointment({
      organizationId: opts.organizationId,
      appointmentId: opts.appointmentId,
      customerId: apt.rows[0].customerId,
      serviceId: opts.serviceId,
    });
  }
}
