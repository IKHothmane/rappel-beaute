import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { createInventoryMovement } from "@/lib/db/inventory";
import type {
  CreatePurchaseInput,
  CreateSupplierInput,
  LinkProductSupplierInput,
  ProductSupplierLink,
  PurchaseDetail,
  PurchaseItemRow,
  PurchaseKpis,
  PurchaseListItem,
  PurchaseReceipt,
  PurchaseStatus,
  ReceivePurchaseInput,
  SupplierDetail,
  SupplierKpis,
  SupplierListItem,
  UpdatePurchaseInput,
  UpdateSupplierInput,
} from "@/types/procurement";
import type { ProductUnit } from "@/types/inventory";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export { isUniqueViolation };

// ─── Suppliers ───────────────────────────────────────────────────────────────

export async function getSupplierKpis(organizationId: string): Promise<SupplierKpis> {
  const { rows } = await pool.query<{
    supplierCount: string;
    activeCount: string;
    openOrdersCount: string;
    monthPurchasesTotal: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::text FROM "Supplier"
        WHERE "organizationId" = $1 AND "deletedAt" IS NULL) AS "supplierCount",
      (SELECT COUNT(*)::text FROM "Supplier"
        WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND active = true) AS "activeCount",
      (SELECT COUNT(*)::text FROM "Purchase"
        WHERE "organizationId" = $1
          AND status IN ('ORDERED','PARTIALLY_RECEIVED')) AS "openOrdersCount",
      (SELECT COALESCE(SUM(pi."quantityOrdered" * pi."unitPrice"), 0)::text
        FROM "PurchaseItem" pi
        JOIN "Purchase" pu ON pu.id = pi."purchaseId"
        WHERE pu."organizationId" = $1
          AND pu.status <> 'CANCELLED'
          AND pu."createdAt" >= date_trunc('month', NOW())) AS "monthPurchasesTotal"`,
    [organizationId],
  );
  const r = rows[0];
  return {
    supplierCount: parseInt(r.supplierCount, 10) || 0,
    activeCount: parseInt(r.activeCount, 10) || 0,
    openOrdersCount: parseInt(r.openOrdersCount, 10) || 0,
    monthPurchasesTotal: Math.round(parseFloat(r.monthPurchasesTotal) * 100) / 100 || 0,
  };
}

export async function listSuppliers(
  organizationId: string,
  opts: { page: number; limit: number; search?: string; active?: boolean | null },
): Promise<{ items: SupplierListItem[]; total: number; kpis: SupplierKpis }> {
  const conditions = [`s."organizationId" = $1`, `s."deletedAt" IS NULL`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (opts.active === true || opts.active === false) {
    conditions.push(`s.active = $${pi}`);
    params.push(opts.active);
    pi++;
  }
  if (opts.search) {
    conditions.push(
      `(s.name ILIKE $${pi} OR COALESCE(s.phone,'') ILIKE $${pi} OR COALESCE(s.email,'') ILIKE $${pi} OR COALESCE(s."contactName",'') ILIKE $${pi})`,
    );
    params.push(`%${opts.search}%`);
    pi++;
  }

  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;

  const [countRes, listRes, kpis] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM "Supplier" s WHERE ${where}`,
      params,
    ),
    pool.query(
      `SELECT
        s.id, s.name, s.phone, s.email, s."contactName", s.active,
        COUNT(DISTINCT ps.id)::int AS "productCount",
        COUNT(DISTINCT pu.id)::int AS "purchaseCount",
        COALESCE(SUM(DISTINCT CASE WHEN pu.status <> 'CANCELLED'
          THEN (SELECT SUM(pi."quantityOrdered" * pi."unitPrice") FROM "PurchaseItem" pi WHERE pi."purchaseId" = pu.id)
          ELSE 0 END), 0)::text AS "totalPurchased"
       FROM "Supplier" s
       LEFT JOIN "ProductSupplier" ps ON ps."supplierId" = s.id
       LEFT JOIN "Purchase" pu ON pu."supplierId" = s.id
       WHERE ${where}
       GROUP BY s.id
       ORDER BY s.name
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
    getSupplierKpis(organizationId),
  ]);

  // Fix totalPurchased calculation - the SUM DISTINCT trick is fragile. Recalculate simply.
  const items: SupplierListItem[] = await Promise.all(
    listRes.rows.map(async (r) => {
      const tot = await pool.query<{ t: string }>(
        `SELECT COALESCE(SUM(pi."quantityOrdered" * pi."unitPrice"), 0)::text AS t
         FROM "Purchase" pu
         JOIN "PurchaseItem" pi ON pi."purchaseId" = pu.id
         WHERE pu."supplierId" = $1 AND pu.status <> 'CANCELLED'`,
        [r.id],
      );
      return {
        id: r.id as string,
        name: r.name as string,
        phone: (r.phone as string) ?? null,
        email: (r.email as string) ?? null,
        contactName: (r.contactName as string) ?? null,
        active: Boolean(r.active),
        productCount: Number(r.productCount) || 0,
        purchaseCount: Number(r.purchaseCount) || 0,
        totalPurchased: Math.round(parseFloat(tot.rows[0]?.t ?? "0") * 100) / 100,
      };
    }),
  );

  return { items, total: countRes.rows[0]?.total ?? 0, kpis };
}

async function loadProductLinks(supplierId: string): Promise<ProductSupplierLink[]> {
  const { rows } = await pool.query(
    `SELECT
      ps.id, ps."productId", p.name AS "productName", p.sku AS "productSku",
      p.unit::text AS unit, ps."supplierId", s.name AS "supplierName",
      ps."supplierSku", ps."purchasePrice"::text, ps."minimumOrderQuantity"::text,
      ps."leadTimeDays", ps.preferred
     FROM "ProductSupplier" ps
     JOIN "Product" p ON p.id = ps."productId"
     JOIN "Supplier" s ON s.id = ps."supplierId"
     WHERE ps."supplierId" = $1 AND p."deletedAt" IS NULL
     ORDER BY ps.preferred DESC, p.name`,
    [supplierId],
  );
  return rows.map(mapProductSupplierRow);
}

function mapProductSupplierRow(r: Record<string, unknown>): ProductSupplierLink {
  return {
    id: String(r.id),
    productId: String(r.productId),
    productName: String(r.productName),
    productSku: String(r.productSku),
    unit: String(r.unit),
    supplierId: String(r.supplierId),
    supplierName: String(r.supplierName),
    supplierSku: (r.supplierSku as string) ?? null,
    purchasePrice: parseFloat(String(r.purchasePrice)) || 0,
    minimumOrderQuantity:
      r.minimumOrderQuantity != null ? parseFloat(String(r.minimumOrderQuantity)) : null,
    leadTimeDays: r.leadTimeDays != null ? Number(r.leadTimeDays) : null,
    preferred: Boolean(r.preferred),
  };
}

export async function getSupplierById(
  organizationId: string,
  supplierId: string,
): Promise<SupplierDetail | null> {
  const { rows } = await pool.query(
    `SELECT id, name, phone, email, address, "contactName", notes, active,
            "createdAt", "updatedAt"
     FROM "Supplier"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [supplierId, organizationId],
  );
  if (!rows[0]) return null;

  const [products, purchases, counts] = await Promise.all([
    loadProductLinks(supplierId),
    listPurchases(organizationId, {
      page: 1,
      limit: 10,
      supplierId,
    }),
    pool.query<{ purchaseCount: string; totalPurchased: string; lastAt: Date | null }>(
      `SELECT
        COUNT(*)::text AS "purchaseCount",
        COALESCE(SUM(sub.total), 0)::text AS "totalPurchased",
        MAX(pu."createdAt") AS "lastAt"
       FROM "Purchase" pu
       LEFT JOIN LATERAL (
         SELECT SUM(pi."quantityOrdered" * pi."unitPrice") AS total
         FROM "PurchaseItem" pi WHERE pi."purchaseId" = pu.id
       ) sub ON true
       WHERE pu."supplierId" = $1 AND pu.status <> 'CANCELLED'`,
      [supplierId],
    ),
  ]);

  const c = counts.rows[0];
  return {
    id: rows[0].id,
    name: rows[0].name,
    phone: rows[0].phone,
    email: rows[0].email,
    address: rows[0].address,
    contactName: rows[0].contactName,
    notes: rows[0].notes,
    active: rows[0].active,
    productCount: products.length,
    purchaseCount: parseInt(c?.purchaseCount ?? "0", 10) || 0,
    totalPurchased: Math.round(parseFloat(c?.totalPurchased ?? "0") * 100) / 100,
    lastPurchaseAt: c?.lastAt?.toISOString() ?? null,
    products,
    recentPurchases: purchases.items,
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
  };
}

export async function createSupplier(
  organizationId: string,
  input: CreateSupplierInput,
): Promise<SupplierDetail> {
  const id = newId("sup");
  await pool.query(
    `INSERT INTO "Supplier" (
      id, "organizationId", name, phone, email, address, "contactName", notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
    [
      id,
      organizationId,
      input.name,
      input.phone ?? null,
      input.email ?? null,
      input.address ?? null,
      input.contactName ?? null,
      input.notes ?? null,
      input.active !== false,
    ],
  );
  const detail = await getSupplierById(organizationId, id);
  if (!detail) throw new Error("Supplier introuvable après création.");
  return detail;
}

export async function updateSupplier(
  organizationId: string,
  supplierId: string,
  input: UpdateSupplierInput,
): Promise<SupplierDetail> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let pi = 1;
  const set = (col: string, val: unknown) => {
    sets.push(`"${col}" = $${pi}`);
    params.push(val);
    pi++;
  };
  if (input.name !== undefined) set("name", input.name);
  if (input.phone !== undefined) set("phone", input.phone ?? null);
  if (input.email !== undefined) set("email", input.email ?? null);
  if (input.address !== undefined) set("address", input.address ?? null);
  if (input.contactName !== undefined) set("contactName", input.contactName ?? null);
  if (input.notes !== undefined) set("notes", input.notes ?? null);
  if (input.active !== undefined) set("active", input.active);

  if (sets.length) {
    sets.push(`"updatedAt" = NOW()`);
    params.push(supplierId, organizationId);
    const { rowCount } = await pool.query(
      `UPDATE "Supplier" SET ${sets.join(", ")}
       WHERE id = $${pi} AND "organizationId" = $${pi + 1} AND "deletedAt" IS NULL`,
      params,
    );
    if (!rowCount) throw new Error("NOT_FOUND");
  }

  const detail = await getSupplierById(organizationId, supplierId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export async function archiveSupplier(
  organizationId: string,
  supplierId: string,
): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE "Supplier"
     SET active = false, "deletedAt" = NOW(), "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [supplierId, organizationId],
  );
  if (!rowCount) throw new Error("NOT_FOUND");
}

export async function upsertProductSupplier(
  organizationId: string,
  supplierId: string,
  input: LinkProductSupplierInput,
): Promise<ProductSupplierLink> {
  const supplier = await pool.query(
    `SELECT id FROM "Supplier" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [supplierId, organizationId],
  );
  if (!supplier.rows[0]) throw new Error("SUPPLIER_NOT_FOUND");

  const product = await pool.query(
    `SELECT id FROM "Product" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [input.productId, organizationId],
  );
  if (!product.rows[0]) throw new Error("PRODUCT_NOT_FOUND");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (input.preferred) {
      await client.query(
        `UPDATE "ProductSupplier" SET preferred = false, "updatedAt" = NOW()
         WHERE "productId" = $1`,
        [input.productId],
      );
    }
    const id = newId("ps");
    await client.query(
      `INSERT INTO "ProductSupplier" (
        id, "productId", "supplierId", "supplierSku", "purchasePrice",
        "minimumOrderQuantity", "leadTimeDays", preferred, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT ("productId", "supplierId") DO UPDATE SET
        "supplierSku" = EXCLUDED."supplierSku",
        "purchasePrice" = EXCLUDED."purchasePrice",
        "minimumOrderQuantity" = EXCLUDED."minimumOrderQuantity",
        "leadTimeDays" = EXCLUDED."leadTimeDays",
        preferred = EXCLUDED.preferred,
        "updatedAt" = NOW()`,
      [
        id,
        input.productId,
        supplierId,
        input.supplierSku ?? null,
        input.purchasePrice,
        input.minimumOrderQuantity ?? null,
        input.leadTimeDays ?? null,
        Boolean(input.preferred),
      ],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const links = await loadProductLinks(supplierId);
  const found = links.find((l) => l.productId === input.productId);
  if (!found) throw new Error("Link introuvable.");
  return found;
}

export async function removeProductSupplier(
  organizationId: string,
  supplierId: string,
  productId: string,
): Promise<void> {
  const { rowCount } = await pool.query(
    `DELETE FROM "ProductSupplier" ps
     USING "Supplier" s
     WHERE ps."supplierId" = s.id
       AND s.id = $1 AND s."organizationId" = $2
       AND ps."productId" = $3`,
    [supplierId, organizationId, productId],
  );
  if (!rowCount) throw new Error("NOT_FOUND");
}

export async function listProductSuppliersForProduct(
  organizationId: string,
  productId: string,
): Promise<ProductSupplierLink[]> {
  const { rows } = await pool.query(
    `SELECT
      ps.id, ps."productId", p.name AS "productName", p.sku AS "productSku",
      p.unit::text AS unit, ps."supplierId", s.name AS "supplierName",
      ps."supplierSku", ps."purchasePrice"::text, ps."minimumOrderQuantity"::text,
      ps."leadTimeDays", ps.preferred
     FROM "ProductSupplier" ps
     JOIN "Product" p ON p.id = ps."productId"
     JOIN "Supplier" s ON s.id = ps."supplierId"
     WHERE ps."productId" = $1 AND p."organizationId" = $2 AND s."deletedAt" IS NULL
     ORDER BY ps.preferred DESC, ps."purchasePrice" ASC`,
    [productId, organizationId],
  );
  return rows.map(mapProductSupplierRow);
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export async function getPurchaseKpis(organizationId: string): Promise<PurchaseKpis> {
  const { rows } = await pool.query<{
    draftCount: string;
    orderedCount: string;
    awaitingReceiptCount: string;
    monthTotal: string;
  }>(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'DRAFT')::text AS "draftCount",
      COUNT(*) FILTER (WHERE status = 'ORDERED')::text AS "orderedCount",
      COUNT(*) FILTER (WHERE status IN ('ORDERED','PARTIALLY_RECEIVED'))::text AS "awaitingReceiptCount",
      COALESCE((
        SELECT SUM(pi."quantityOrdered" * pi."unitPrice")
        FROM "PurchaseItem" pi
        JOIN "Purchase" pu ON pu.id = pi."purchaseId"
        WHERE pu."organizationId" = $1
          AND pu.status <> 'CANCELLED'
          AND pu."createdAt" >= date_trunc('month', NOW())
      ), 0)::text AS "monthTotal"
     FROM "Purchase"
     WHERE "organizationId" = $1`,
    [organizationId],
  );
  const r = rows[0];
  return {
    draftCount: parseInt(r.draftCount, 10) || 0,
    orderedCount: parseInt(r.orderedCount, 10) || 0,
    awaitingReceiptCount: parseInt(r.awaitingReceiptCount, 10) || 0,
    monthTotal: Math.round(parseFloat(r.monthTotal) * 100) / 100 || 0,
  };
}

async function nextPurchaseNumber(organizationId: string, client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ACH-${year}-`;
  const { rows } = await client.query<{ number: string }>(
    `SELECT number FROM "Purchase"
     WHERE "organizationId" = $1 AND number LIKE $2
     ORDER BY number DESC LIMIT 1
     FOR UPDATE`,
    [organizationId, `${prefix}%`],
  );
  let seq = 1;
  if (rows[0]?.number) {
    const part = rows[0].number.slice(prefix.length);
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function mapPurchaseListRow(r: Record<string, unknown>): PurchaseListItem {
  return {
    id: String(r.id),
    number: String(r.number),
    supplierId: String(r.supplierId),
    supplierName: String(r.supplierName),
    status: r.status as PurchaseStatus,
    itemCount: Number(r.itemCount) || 0,
    total: Math.round(parseFloat(String(r.total ?? "0")) * 100) / 100,
    orderedAt: r.orderedAt ? new Date(r.orderedAt as Date).toISOString() : null,
    receivedAt: r.receivedAt ? new Date(r.receivedAt as Date).toISOString() : null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

export async function listPurchases(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    supplierId?: string | null;
    status?: PurchaseStatus | null;
  },
): Promise<{ items: PurchaseListItem[]; total: number; kpis: PurchaseKpis }> {
  const conditions = [`pu."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (opts.supplierId) {
    conditions.push(`pu."supplierId" = $${pi}`);
    params.push(opts.supplierId);
    pi++;
  }
  if (opts.status) {
    conditions.push(`pu.status = $${pi}::"PurchaseStatus"`);
    params.push(opts.status);
    pi++;
  }
  if (opts.search) {
    conditions.push(`(pu.number ILIKE $${pi} OR s.name ILIKE $${pi})`);
    params.push(`%${opts.search}%`);
    pi++;
  }

  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;

  const [countRes, listRes, kpis] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM "Purchase" pu
       JOIN "Supplier" s ON s.id = pu."supplierId"
       WHERE ${where}`,
      params,
    ),
    pool.query(
      `SELECT
        pu.id, pu.number, pu."supplierId", s.name AS "supplierName",
        pu.status::text AS status, pu."orderedAt", pu."receivedAt", pu."createdAt",
        COUNT(pi.id)::int AS "itemCount",
        COALESCE(SUM(pi."quantityOrdered" * pi."unitPrice"), 0)::text AS total
       FROM "Purchase" pu
       JOIN "Supplier" s ON s.id = pu."supplierId"
       LEFT JOIN "PurchaseItem" pi ON pi."purchaseId" = pu.id
       WHERE ${where}
       GROUP BY pu.id, s.name
       ORDER BY pu."createdAt" DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
    getPurchaseKpis(organizationId),
  ]);

  return {
    items: listRes.rows.map((r) => mapPurchaseListRow(r as Record<string, unknown>)),
    total: countRes.rows[0]?.total ?? 0,
    kpis,
  };
}

async function loadPurchaseItems(purchaseId: string): Promise<PurchaseItemRow[]> {
  const { rows } = await pool.query(
    `SELECT
      pi.id, pi."productId", p.name AS "productName", p.sku AS "productSku",
      pi."quantityOrdered"::text, pi."quantityReceived"::text,
      pi."unitPrice"::text, pi.unit::text AS unit
     FROM "PurchaseItem" pi
     JOIN "Product" p ON p.id = pi."productId"
     WHERE pi."purchaseId" = $1
     ORDER BY p.name`,
    [purchaseId],
  );
  return rows.map((r) => {
    const ordered = parseFloat(r.quantityOrdered) || 0;
    const received = parseFloat(r.quantityReceived) || 0;
    const unitPrice = parseFloat(r.unitPrice) || 0;
    return {
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      productSku: r.productSku,
      quantityOrdered: ordered,
      quantityReceived: received,
      quantityRemaining: Math.max(0, Math.round((ordered - received) * 1000) / 1000),
      unitPrice,
      unit: r.unit,
      lineTotal: Math.round(ordered * unitPrice * 100) / 100,
    };
  });
}

async function loadReceipts(purchaseId: string): Promise<PurchaseReceipt[]> {
  const { rows } = await pool.query(
    `SELECT
      pr.id, pr."receivedAt", pr."userId", pr.notes, pr."idempotencyKey",
      u."firstName" AS "userFirst", u."lastName" AS "userLast"
     FROM "PurchaseReceipt" pr
     LEFT JOIN "User" u ON u.id = pr."userId"
     WHERE pr."purchaseId" = $1
     ORDER BY pr."receivedAt" DESC`,
    [purchaseId],
  );

  const receipts: PurchaseReceipt[] = [];
  for (const r of rows) {
    const lines = await pool.query(
      `SELECT
        rl.id, rl."purchaseItemId", rl."productId", p.name AS "productName",
        rl.quantity::text, rl."lotNumber", rl."expiresAt", rl."inventoryMovementId"
       FROM "PurchaseReceiptLine" rl
       JOIN "Product" p ON p.id = rl."productId"
       WHERE rl."receiptId" = $1`,
      [r.id],
    );
    receipts.push({
      id: r.id,
      receivedAt: r.receivedAt.toISOString(),
      userId: r.userId,
      userName:
        r.userFirst || r.userLast
          ? `${r.userFirst ?? ""} ${r.userLast ?? ""}`.trim()
          : null,
      notes: r.notes,
      idempotencyKey: r.idempotencyKey,
      lines: lines.rows.map((l) => ({
        id: l.id,
        purchaseItemId: l.purchaseItemId,
        productId: l.productId,
        productName: l.productName,
        quantity: parseFloat(l.quantity) || 0,
        lotNumber: l.lotNumber,
        expiresAt: l.expiresAt ? new Date(l.expiresAt).toISOString() : null,
        inventoryMovementId: l.inventoryMovementId,
      })),
    });
  }
  return receipts;
}

function computePurchaseStatus(items: PurchaseItemRow[]): PurchaseStatus {
  if (items.length === 0) return "ORDERED";
  const allReceived = items.every((i) => i.quantityReceived >= i.quantityOrdered - 0.0001);
  const anyReceived = items.some((i) => i.quantityReceived > 0);
  if (allReceived) return "RECEIVED";
  if (anyReceived) return "PARTIALLY_RECEIVED";
  return "ORDERED";
}

export async function getPurchaseById(
  organizationId: string,
  purchaseId: string,
): Promise<PurchaseDetail | null> {
  const { rows } = await pool.query(
    `SELECT
      pu.id, pu.number, pu."supplierId", s.name AS "supplierName",
      pu.status::text AS status, pu.notes, pu."orderedAt", pu."receivedAt",
      pu."createdById", pu."createdAt", pu."updatedAt"
     FROM "Purchase" pu
     JOIN "Supplier" s ON s.id = pu."supplierId"
     WHERE pu.id = $1 AND pu."organizationId" = $2`,
    [purchaseId, organizationId],
  );
  if (!rows[0]) return null;

  const [items, receipts] = await Promise.all([
    loadPurchaseItems(purchaseId),
    loadReceipts(purchaseId),
  ]);
  const total = items.reduce((s, i) => s + i.lineTotal, 0);

  return {
    id: rows[0].id,
    number: rows[0].number,
    supplierId: rows[0].supplierId,
    supplierName: rows[0].supplierName,
    status: rows[0].status as PurchaseStatus,
    itemCount: items.length,
    total: Math.round(total * 100) / 100,
    orderedAt: rows[0].orderedAt?.toISOString() ?? null,
    receivedAt: rows[0].receivedAt?.toISOString() ?? null,
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
    notes: rows[0].notes,
    createdById: rows[0].createdById,
    items,
    receipts,
  };
}

async function insertPurchaseItems(
  client: PoolClient,
  purchaseId: string,
  organizationId: string,
  items: CreatePurchaseInput["items"],
) {
  for (const item of items) {
    const product = await client.query<{ id: string; unit: ProductUnit }>(
      `SELECT id, unit FROM "Product"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [item.productId, organizationId],
    );
    if (!product.rows[0]) throw new Error("PRODUCT_NOT_FOUND");
    await client.query(
      `INSERT INTO "PurchaseItem" (
        id, "purchaseId", "productId", "quantityOrdered", "quantityReceived", "unitPrice", unit
      ) VALUES ($1,$2,$3,$4,0,$5,$6::"ProductUnit")`,
      [
        newId("pui"),
        purchaseId,
        item.productId,
        item.quantityOrdered,
        item.unitPrice,
        product.rows[0].unit,
      ],
    );
  }
}

export async function createPurchase(
  organizationId: string,
  input: CreatePurchaseInput,
  userId?: string | null,
): Promise<PurchaseDetail> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const supplier = await client.query(
      `SELECT id FROM "Supplier"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL AND active = true`,
      [input.supplierId, organizationId],
    );
    if (!supplier.rows[0]) throw new Error("SUPPLIER_NOT_FOUND");

    const number = await nextPurchaseNumber(organizationId, client);
    const id = newId("pur");
    const status: PurchaseStatus = input.submit ? "ORDERED" : "DRAFT";

    await client.query(
      `INSERT INTO "Purchase" (
        id, "organizationId", "supplierId", number, status, notes,
        "orderedAt", "createdById", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5::"PurchaseStatus",$6,$7,$8,NOW())`,
      [
        id,
        organizationId,
        input.supplierId,
        number,
        status,
        input.notes ?? null,
        input.submit ? new Date() : null,
        userId ?? null,
      ],
    );

    await insertPurchaseItems(client, id, organizationId, input.items);
    await client.query("COMMIT");

    const detail = await getPurchaseById(organizationId, id);
    if (!detail) throw new Error("Purchase introuvable.");
    return detail;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updatePurchase(
  organizationId: string,
  purchaseId: string,
  input: UpdatePurchaseInput,
): Promise<PurchaseDetail> {
  const existing = await getPurchaseById(organizationId, purchaseId);
  if (!existing) throw new Error("NOT_FOUND");

  if (existing.status !== "DRAFT" && input.items) {
    throw new Error("ITEMS_LOCKED");
  }
  if (existing.status === "CANCELLED" || existing.status === "RECEIVED") {
    throw new Error("LOCKED");
  }
  if (
    input.status === "CANCELLED" &&
    existing.status === "PARTIALLY_RECEIVED"
  ) {
    throw new Error("CANNOT_CANCEL");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (input.notes !== undefined) {
      await client.query(
        `UPDATE "Purchase" SET notes = $1, "updatedAt" = NOW() WHERE id = $2`,
        [input.notes ?? null, purchaseId],
      );
    }

    if (input.items) {
      await client.query(`DELETE FROM "PurchaseItem" WHERE "purchaseId" = $1`, [purchaseId]);
      await insertPurchaseItems(client, purchaseId, organizationId, input.items);
    }

    if (input.status === "ORDERED" && existing.status === "DRAFT") {
      await client.query(
        `UPDATE "Purchase"
         SET status = 'ORDERED'::"PurchaseStatus", "orderedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $1`,
        [purchaseId],
      );
    }
    if (input.status === "CANCELLED") {
      await client.query(
        `UPDATE "Purchase"
         SET status = 'CANCELLED'::"PurchaseStatus", "updatedAt" = NOW()
         WHERE id = $1`,
        [purchaseId],
      );
    }
    if (input.status === "DRAFT" && existing.status === "ORDERED") {
      await client.query(
        `UPDATE "Purchase"
         SET status = 'DRAFT'::"PurchaseStatus", "orderedAt" = NULL, "updatedAt" = NOW()
         WHERE id = $1`,
        [purchaseId],
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const detail = await getPurchaseById(organizationId, purchaseId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

/**
 * Réception partielle ou totale.
 * Crée PurchaseReceipt + InventoryMovement PURCHASE (ledger) + lots optionnels.
 * Idempotent via PurchaseReceipt.idempotencyKey.
 */
export async function receivePurchase(
  organizationId: string,
  purchaseId: string,
  input: ReceivePurchaseInput,
  userId?: string | null,
): Promise<{ purchase: PurchaseDetail; created: boolean }> {
  // Idempotence au niveau réception
  const existingReceipt = await pool.query<{ id: string }>(
    `SELECT id FROM "PurchaseReceipt"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [organizationId, input.idempotencyKey],
  );
  if (existingReceipt.rows[0]) {
    const purchase = await getPurchaseById(organizationId, purchaseId);
    if (!purchase) throw new Error("NOT_FOUND");
    return { purchase, created: false };
  }

  const purchase = await getPurchaseById(organizationId, purchaseId);
  if (!purchase) throw new Error("NOT_FOUND");
  if (
    purchase.status !== "ORDERED" &&
    purchase.status !== "PARTIALLY_RECEIVED"
  ) {
    throw new Error("NOT_RECEIVABLE");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Re-check idempotency inside txn
    const again = await client.query<{ id: string }>(
      `SELECT id FROM "PurchaseReceipt"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2
       FOR UPDATE`,
      [organizationId, input.idempotencyKey],
    );
    if (again.rows[0]) {
      await client.query("COMMIT");
      const p = await getPurchaseById(organizationId, purchaseId);
      return { purchase: p!, created: false };
    }

    const receiptId = newId("recv");
    await client.query(
      `INSERT INTO "PurchaseReceipt" (
        id, "organizationId", "purchaseId", "userId", notes, "idempotencyKey"
      ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        receiptId,
        organizationId,
        purchaseId,
        userId ?? null,
        input.notes ?? null,
        input.idempotencyKey,
      ],
    );

    for (const line of input.items) {
      const item = await client.query<{
        id: string;
        productId: string;
        quantityOrdered: string;
        quantityReceived: string;
      }>(
        `SELECT id, "productId", "quantityOrdered"::text, "quantityReceived"::text
         FROM "PurchaseItem"
         WHERE id = $1 AND "purchaseId" = $2
         FOR UPDATE`,
        [line.purchaseItemId, purchaseId],
      );
      if (!item.rows[0]) throw new Error("ITEM_NOT_FOUND");

      const ordered = parseFloat(item.rows[0].quantityOrdered) || 0;
      const already = parseFloat(item.rows[0].quantityReceived) || 0;
      const remaining = ordered - already;
      if (line.quantity > remaining + 0.0001) throw new Error("OVER_RECEIVE");

      const movKey = `recv:${receiptId}:item:${line.purchaseItemId}`;
      const { movement } = await createInventoryMovement(
        organizationId,
        {
          productId: item.rows[0].productId,
          type: "PURCHASE",
          quantity: line.quantity,
          reason: `Réception ${purchase.number}`,
          referenceType: "PURCHASE",
          referenceId: purchaseId,
          idempotencyKey: movKey,
        },
        userId,
        client,
      );

      if (line.lotNumber) {
        await client.query(
          `INSERT INTO "ProductLot" (
            id, "productId", "lotNumber", quantity, "expiresAt", notes, "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
          [
            newId("lot"),
            item.rows[0].productId,
            line.lotNumber,
            line.quantity,
            line.expiresAt ? new Date(line.expiresAt) : null,
            `Réception ${purchase.number}`,
          ],
        );
      }

      const lineId = newId("rln");
      await client.query(
        `INSERT INTO "PurchaseReceiptLine" (
          id, "receiptId", "purchaseItemId", "productId", quantity,
          "lotNumber", "expiresAt", "inventoryMovementId"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          lineId,
          receiptId,
          line.purchaseItemId,
          item.rows[0].productId,
          line.quantity,
          line.lotNumber ?? null,
          line.expiresAt ? new Date(line.expiresAt) : null,
          movement.id,
        ],
      );

      await client.query(
        `UPDATE "PurchaseItem"
         SET "quantityReceived" = "quantityReceived" + $1
         WHERE id = $2`,
        [line.quantity, line.purchaseItemId],
      );
    }

    // Recalcul statut dans la même transaction
    const statusRows = await client.query<{
      quantityOrdered: string;
      quantityReceived: string;
    }>(
      `SELECT "quantityOrdered"::text, "quantityReceived"::text
       FROM "PurchaseItem" WHERE "purchaseId" = $1`,
      [purchaseId],
    );
    const statusItems: PurchaseItemRow[] = statusRows.rows.map((r, i) => {
      const ordered = parseFloat(r.quantityOrdered) || 0;
      const received = parseFloat(r.quantityReceived) || 0;
      return {
        id: String(i),
        productId: "",
        productName: "",
        productSku: "",
        quantityOrdered: ordered,
        quantityReceived: received,
        quantityRemaining: Math.max(0, ordered - received),
        unitPrice: 0,
        unit: "UNIT",
        lineTotal: 0,
      };
    });
    const newStatus = computePurchaseStatus(statusItems);
    await client.query(
      `UPDATE "Purchase"
       SET status = $1::"PurchaseStatus",
           "receivedAt" = CASE WHEN $1 = 'RECEIVED' THEN NOW() ELSE "receivedAt" END,
           "updatedAt" = NOW()
       WHERE id = $2`,
      [newStatus, purchaseId],
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) {
      const p = await getPurchaseById(organizationId, purchaseId);
      if (p) return { purchase: p, created: false };
    }
    throw e;
  } finally {
    client.release();
  }

  const detail = await getPurchaseById(organizationId, purchaseId);
  if (!detail) throw new Error("NOT_FOUND");
  return { purchase: detail, created: true };
}
