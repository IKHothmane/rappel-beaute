import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { createInventoryMovement } from "@/lib/db/inventory";
import type { PaymentMethod } from "@/types/finance";
import type {
  CreatePosSaleInput,
  PosProductItem,
  PosSaleDetail,
  PosSaleLine,
} from "@/types/pos";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

async function nextInvoiceNumber(organizationId: string, client: PoolClient): Promise<string> {
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

async function getOpenCashSession(organizationId: string, client?: PoolClient) {
  const c = client ?? pool;
  const { rows } = await c.query<{ id: string }>(
    `SELECT id FROM "CashRegisterSession"
     WHERE "organizationId" = $1 AND status = 'OPEN'::"CashRegisterStatus"
     LIMIT 1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

export async function listPosProducts(
  organizationId: string,
  opts?: { search?: string; category?: string | null },
): Promise<PosProductItem[]> {
  const conditions = [
    `p."organizationId" = $1`,
    `p.active = true`,
    `p.sellable = true`,
    `p."deletedAt" IS NULL`,
    `p."salePrice" IS NOT NULL`,
    `p."salePrice" > 0`,
  ];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (opts?.search?.trim()) {
    conditions.push(
      `(p.name ILIKE $${pi} OR p.sku ILIKE $${pi} OR COALESCE(p.brand,'') ILIKE $${pi})`,
    );
    params.push(`%${opts.search.trim()}%`);
    pi++;
  }
  if (opts?.category) {
    conditions.push(`p.category = $${pi}::"ProductCategory"`);
    params.push(opts.category);
    pi++;
  }

  const { rows } = await pool.query<{
    id: string;
    name: string;
    sku: string;
    category: string;
    salePrice: string;
    stock: string;
    unit: string;
    brand: string | null;
  }>(
    `SELECT p.id, p.name, p.sku, p.category::text, p."salePrice"::text,
            p.stock::text, p.unit::text, p.brand
     FROM "Product" p
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.name
     LIMIT 200`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    category: r.category as PosProductItem["category"],
    salePrice: parseFloat(r.salePrice),
    stock: parseFloat(r.stock),
    unit: r.unit,
    brand: r.brand,
  }));
}

export async function searchPosCustomers(
  organizationId: string,
  q: string,
): Promise<{ id: string; name: string; phone: string }[]> {
  const needle = q.trim();
  if (needle.length < 2) return [];
  const { rows } = await pool.query<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  }>(
    `SELECT id, "firstName", "lastName", phone FROM "Customer"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND (
         "firstName" ILIKE $2 OR "lastName" ILIKE $2 OR phone ILIKE $2
         OR CONCAT("firstName", ' ', "lastName") ILIKE $2
       )
     ORDER BY "lastName", "firstName"
     LIMIT 20`,
    [organizationId, `%${needle}%`],
  );
  return rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`.trim(),
    phone: r.phone,
  }));
}

async function loadSaleDetail(
  organizationId: string,
  saleId: string,
): Promise<PosSaleDetail | null> {
  const { rows } = await pool.query<{
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    paymentId: string | null;
    customerId: string | null;
    customerName: string | null;
    status: string;
    subtotal: string;
    discountTotal: string;
    total: string;
    paymentMethod: string;
    soldById: string | null;
    notes: string | null;
    createdAt: Date;
  }>(
    `SELECT s.id, s."invoiceId", i.number AS "invoiceNumber", s."paymentId",
            s."customerId", i."customerNameSnapshot" AS "customerName",
            s.status::text, s.subtotal::text, s."discountTotal"::text, s.total::text,
            s."paymentMethod"::text, s."soldById", s.notes, s."createdAt"
     FROM "PosSale" s
     JOIN "Invoice" i ON i.id = s."invoiceId"
     WHERE s.id = $1 AND s."organizationId" = $2`,
    [saleId, organizationId],
  );
  const sale = rows[0];
  if (!sale) return null;

  const { rows: itemRows } = await pool.query<{
    productId: string | null;
    nameSnapshot: string;
    unitPrice: string;
    quantity: string;
    total: string;
    sku: string | null;
    category: string | null;
  }>(
    `SELECT ii."productId", ii."nameSnapshot", ii."unitPriceSnapshot"::text AS "unitPrice",
            ii.quantity::text, ii.total::text, p.sku, p.category::text
     FROM "InvoiceItem" ii
     LEFT JOIN "Product" p ON p.id = ii."productId"
     WHERE ii."invoiceId" = $1
     ORDER BY ii."sortOrder"`,
    [sale.invoiceId],
  );

  const lines: PosSaleLine[] = itemRows.map((r) => ({
    productId: r.productId ?? "",
    name: r.nameSnapshot,
    sku: r.sku ?? "",
    unitPrice: parseFloat(r.unitPrice),
    quantity: parseFloat(r.quantity),
    lineTotal: parseFloat(r.total),
    category: (r.category as PosSaleLine["category"]) ?? null,
  }));

  return {
    id: sale.id,
    invoiceId: sale.invoiceId,
    invoiceNumber: sale.invoiceNumber,
    paymentId: sale.paymentId,
    customerId: sale.customerId,
    customerName: sale.customerName,
    status: sale.status as PosSaleDetail["status"],
    subtotal: parseFloat(sale.subtotal),
    discountTotal: parseFloat(sale.discountTotal),
    total: parseFloat(sale.total),
    paymentMethod: sale.paymentMethod as PaymentMethod,
    lines,
    soldById: sale.soldById,
    notes: sale.notes,
    createdAt: sale.createdAt.toISOString(),
  };
}

/**
 * Vente POS transactionnelle :
 * stock → Invoice → Payment → InventoryMovement SALE → PosSale → Audit
 */
export async function createPosSale(
  organizationId: string,
  input: CreatePosSaleInput,
  actor: { id: string; name?: string | null },
): Promise<PosSaleDetail> {
  if (!input.lines?.length) throw new Error("EMPTY_CART");
  if (!input.idempotencyKey?.trim()) throw new Error("IDEMPOTENCY_REQUIRED");

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM "PosSale"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [organizationId, input.idempotencyKey],
  );
  if (existing.rows[0]) {
    const detail = await loadSaleDetail(organizationId, existing.rows[0].id);
    if (detail) return detail;
  }

  const method = input.paymentMethod;
  if (method === "ONLINE") throw new Error("ONLINE_NOT_ALLOWED");

  // Fusion lignes mêmes produits
  const qtyByProduct = new Map<string, number>();
  for (const line of input.lines) {
    const q = Number(line.quantity);
    if (!line.productId || !Number.isFinite(q) || q <= 0) throw new Error("INVALID_LINE");
    qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + q);
  }

  const client = await pool.connect();
  let saleId = "";
  try {
    await client.query("BEGIN");

    if (method === "CASH") {
      const open = await getOpenCashSession(organizationId, client);
      if (!open) throw new Error("NO_OPEN_SESSION");
    }

    let customerName = "Passage";
    let customerPhone: string | null = null;
    let customerId: string | null = input.customerId?.trim() || null;

    if (customerId) {
      const { rows: cust } = await client.query<{
        firstName: string;
        lastName: string;
        phone: string;
      }>(
        `SELECT "firstName", "lastName", phone FROM "Customer"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
         FOR SHARE`,
        [customerId, organizationId],
      );
      if (!cust[0]) throw new Error("CUSTOMER_NOT_FOUND");
      customerName = `${cust[0].firstName} ${cust[0].lastName}`.trim();
      customerPhone = cust[0].phone;
    }

    const { rows: orgRows } = await client.query<{
      name: string;
      address: string | null;
      phone: string | null;
      ice: string | null;
    }>(`SELECT name, address, phone, ice FROM "Organization" WHERE id = $1`, [
      organizationId,
    ]);
    if (!orgRows[0]) throw new Error("ORG_NOT_FOUND");

    type LockedProduct = {
      id: string;
      name: string;
      sku: string;
      salePrice: string;
      stock: string;
      category: string;
      sellable: boolean;
      active: boolean;
    };

    const resolved: Array<{
      product: LockedProduct;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    for (const [productId, quantity] of qtyByProduct) {
      const { rows } = await client.query<LockedProduct>(
        `SELECT id, name, sku, "salePrice"::text, stock::text, category::text,
                sellable, active
         FROM "Product"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
         FOR UPDATE`,
        [productId, organizationId],
      );
      const p = rows[0];
      if (!p || !p.active || !p.sellable) throw new Error("PRODUCT_NOT_FOUND");
      const unitPrice = parseFloat(p.salePrice);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("PRODUCT_NO_PRICE");
      const stock = parseFloat(p.stock);
      if (stock < quantity - 0.0001) throw new Error("INSUFFICIENT_STOCK");
      if (stock <= 0) throw new Error("INSUFFICIENT_STOCK");

      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
      resolved.push({ product: p, quantity, unitPrice, lineTotal });
    }

    const subtotal = Math.round(resolved.reduce((s, r) => s + r.lineTotal, 0) * 100) / 100;
    let discount = Math.max(0, Number(input.discountTotal) || 0);
    if (discount > subtotal) discount = subtotal;
    discount = Math.round(discount * 100) / 100;
    const total = Math.round((subtotal - discount) * 100) / 100;
    if (total < 0) throw new Error("INVALID_TOTAL");

    const invoiceId = newId("inv");
    const paymentId = newId("pay");
    saleId = newId("pos");
    const number = await nextInvoiceNumber(organizationId, client);

    await client.query(
      `INSERT INTO "Invoice" (
        id, "organizationId", number, "appointmentId", "customerId", status,
        "orgNameSnapshot", "orgAddressSnapshot", "orgPhoneSnapshot", "orgIceSnapshot",
        "customerNameSnapshot", "customerPhoneSnapshot",
        subtotal, "discountTotal", total,
        notes, "issuedAt", "createdById", "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,NULL,$4,'PAID'::"InvoiceStatus",
        $5,$6,$7,$8,$9,$10,
        $11,$12,$13,
        $14,NOW(),$15,$16,NOW()
      )`,
      [
        invoiceId,
        organizationId,
        number,
        customerId,
        orgRows[0].name,
        orgRows[0].address,
        orgRows[0].phone,
        orgRows[0].ice,
        customerName,
        customerPhone,
        subtotal,
        discount,
        total,
        input.notes ?? null,
        actor.id,
        `pos:${input.idempotencyKey}`,
      ],
    );

    // Répartir la remise proportionnellement sur les lignes (affichage)
    let allocatedDiscount = 0;
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i];
      const isLast = i === resolved.length - 1;
      const share =
        discount <= 0
          ? 0
          : isLast
            ? Math.round((discount - allocatedDiscount) * 100) / 100
            : Math.round((discount * (r.lineTotal / subtotal)) * 100) / 100;
      allocatedDiscount += share;
      const lineNet = Math.round((r.lineTotal - share) * 100) / 100;

      await client.query(
        `INSERT INTO "InvoiceItem" (
          id, "invoiceId", "serviceId", "productId", "nameSnapshot",
          "unitPriceSnapshot", quantity, discount, total, "sortOrder"
        ) VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9)`,
        [
          newId("ii"),
          invoiceId,
          r.product.id,
          r.product.name,
          r.unitPrice,
          r.quantity,
          share,
          lineNet,
          i,
        ],
      );
    }

    await client.query(
      `INSERT INTO "Payment" (
        id, "organizationId", "appointmentId", "customerId", "invoiceId",
        amount, method, kind, status, notes, "userId", "idempotencyKey",
        "paidAt", "updatedAt"
      ) VALUES (
        $1,$2,NULL,$3,$4,$5,$6::"PaymentMethod",'PAYMENT'::"PaymentKind",
        'COMPLETED'::"PaymentStatus",$7,$8,$9,NOW(),NOW()
      )`,
      [
        paymentId,
        organizationId,
        customerId,
        invoiceId,
        total,
        method,
        input.notes ?? `Vente POS ${number}`,
        actor.id,
        `pospay:${input.idempotencyKey}`,
      ],
    );

    if (method === "CASH") {
      const open = await getOpenCashSession(organizationId, client);
      if (!open) throw new Error("NO_OPEN_SESSION");
      await client.query(
        `INSERT INTO "CashRegisterTransaction" (
          id, "organizationId", "sessionId", type, amount, method, "paymentId",
          "userId", reason, "idempotencyKey"
        ) VALUES (
          $1,$2,$3,'SALE'::"CashTxnType",$4,'CASH'::"PaymentMethod",$5,$6,$7,$8
        )`,
        [
          newId("ctxn"),
          organizationId,
          open.id,
          total,
          paymentId,
          actor.id,
          `POS ${number}`,
          `cashpos:${paymentId}`,
        ],
      );
    }

    for (const r of resolved) {
      await createInventoryMovement(
        organizationId,
        {
          productId: r.product.id,
          type: "SALE",
          quantity: r.quantity,
          reason: `Vente POS ${number}`,
          referenceType: "SALE",
          referenceId: saleId,
          idempotencyKey: `pos:${input.idempotencyKey}:mov:${r.product.id}`,
        },
        actor.id,
        client,
      );
    }

    await client.query(
      `INSERT INTO "PosSale" (
        id, "organizationId", "invoiceId", "paymentId", "customerId", "soldById",
        status, subtotal, "discountTotal", total, "paymentMethod",
        "idempotencyKey", notes, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        'COMPLETED'::"PosSaleStatus",$7,$8,$9,$10::"PaymentMethod",
        $11,$12,NOW()
      )`,
      [
        saleId,
        organizationId,
        invoiceId,
        paymentId,
        customerId,
        actor.id,
        subtotal,
        discount,
        total,
        method,
        input.idempotencyKey,
        input.notes ?? null,
      ],
    );

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "PosSale",
      entityId: saleId,
      action: "POS_SALE_CREATED",
      after: {
        invoiceId,
        paymentId,
        total,
        method,
        customerId,
        lines: resolved.map((r) => ({
          productId: r.product.id,
          qty: r.quantity,
          unitPrice: r.unitPrice,
        })),
      },
      client,
    });

    if (discount > 0) {
      await writeAuditLog({
        organizationId,
        actorId: actor.id,
        actorName: actor.name,
        entityType: "PosSale",
        entityId: saleId,
        action: "POS_DISCOUNT_APPLIED",
        after: { discountTotal: discount, subtotal, total },
        client,
      });
    }

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "PosSale",
      entityId: saleId,
      action: "POS_PAYMENT_COMPLETED",
      after: { paymentId, method, amount: total },
      client,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "23505"
    ) {
      const again = await pool.query<{ id: string }>(
        `SELECT id FROM "PosSale"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
        [organizationId, input.idempotencyKey],
      );
      if (again.rows[0]) {
        const detail = await loadSaleDetail(organizationId, again.rows[0].id);
        if (detail) return detail;
      }
    }
    throw e;
  } finally {
    client.release();
  }

  // Fidélité si cliente
  try {
    if (input.customerId) {
      const { earnPointsFromPayment } = await import("@/lib/db/loyalty");
      const detail = await loadSaleDetail(organizationId, saleId);
      if (detail?.paymentId) {
        await earnPointsFromPayment({
          organizationId,
          paymentId: detail.paymentId,
          customerId: input.customerId,
          amountMad: detail.total,
          userId: actor.id,
        });
      }
    }
  } catch (e) {
    console.error("[createPosSale] loyalty", e);
  }

  const detail = await loadSaleDetail(organizationId, saleId);
  if (!detail) throw new Error("SALE_NOT_FOUND");
  return detail;
}

export async function listPosSales(
  organizationId: string,
  opts?: { limit?: number },
): Promise<PosSaleDetail[]> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM "PosSale"
     WHERE "organizationId" = $1
     ORDER BY "createdAt" DESC
     LIMIT $2`,
    [organizationId, opts?.limit ?? 50],
  );
  const out: PosSaleDetail[] = [];
  for (const r of rows) {
    const d = await loadSaleDetail(organizationId, r.id);
    if (d) out.push(d);
  }
  return out;
}

export async function getPosSaleById(
  organizationId: string,
  saleId: string,
): Promise<PosSaleDetail | null> {
  return loadSaleDetail(organizationId, saleId);
}

/**
 * Remboursement total POS : Payment REFUND + InventoryMovement RETURN + statut REFUNDED.
 */
export async function refundPosSale(
  organizationId: string,
  saleId: string,
  actor: { id: string; name?: string | null },
): Promise<PosSaleDetail> {
  const sale = await loadSaleDetail(organizationId, saleId);
  if (!sale) throw new Error("SALE_NOT_FOUND");
  if (sale.status === "REFUNDED") return sale;
  if (sale.status !== "COMPLETED") throw new Error("SALE_NOT_REFUNDABLE");
  if (!sale.paymentId) throw new Error("PAYMENT_MISSING");

  const { refundPayment } = await import("@/lib/db/finance");
  await refundPayment(
    organizationId,
    sale.paymentId,
    {
      amount: sale.total,
      method: sale.paymentMethod,
      reason: `Remboursement POS ${sale.invoiceNumber}`,
      idempotencyKey: `posrefund:${saleId}`,
    },
    actor.id,
  );

  for (const line of sale.lines) {
    if (!line.productId) continue;
    await createInventoryMovement(
      organizationId,
      {
        productId: line.productId,
        type: "RETURN",
        quantity: line.quantity,
        reason: `Retour POS ${sale.invoiceNumber}`,
        referenceType: "SALE",
        referenceId: saleId,
        idempotencyKey: `posrefund:${saleId}:mov:${line.productId}`,
      },
      actor.id,
    );
  }

  await pool.query(
    `UPDATE "PosSale"
     SET status = 'REFUNDED'::"PosSaleStatus", "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [saleId, organizationId],
  );

  await pool.query(
    `UPDATE "Invoice"
     SET status = 'VOID'::"InvoiceStatus", "voidedAt" = NOW(),
         "voidReason" = $3, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [sale.invoiceId, organizationId, `Remboursement POS`],
  );

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "PosSale",
    entityId: saleId,
    action: "POS_REFUND_CREATED",
    before: { status: "COMPLETED", total: sale.total },
    after: { status: "REFUNDED" },
  });

  const detail = await loadSaleDetail(organizationId, saleId);
  if (!detail) throw new Error("SALE_NOT_FOUND");
  return detail;
}
