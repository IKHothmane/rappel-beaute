import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import type {
  CreateMovementInput,
  CreateProductInput,
  InventoryCountItem,
  InventoryMovementItem,
  MovementType,
  ProductCategory,
  ProductDetail,
  ProductListItem,
  ProductLotItem,
  ProductUnit,
  StockKpis,
  UpdateProductInput,
} from "@/types/inventory";
import { computeStockAlert, movementSign } from "@/types/inventory";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  brand: string | null;
  unit: ProductUnit;
  purchasePrice: string;
  salePrice: string | null;
  stock: string;
  minStock: string;
  maxStock: string | null;
  supplierName: string | null;
  consumable: boolean;
  sellable: boolean;
  active: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  nearestExpiry: Date | null;
  serviceCount: string;
};

function rowToListItem(row: ProductRow): ProductListItem {
  const stock = parseFloat(row.stock) || 0;
  const minStock = parseFloat(row.minStock) || 0;
  const purchasePrice = parseFloat(row.purchasePrice) || 0;
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    brand: row.brand,
    unit: row.unit,
    purchasePrice,
    salePrice: row.salePrice != null ? parseFloat(row.salePrice) : null,
    stock,
    minStock,
    maxStock: row.maxStock != null ? parseFloat(row.maxStock) : null,
    supplierName: row.supplierName,
    consumable: row.consumable,
    sellable: row.sellable,
    active: row.active,
    stockValue: Math.round(stock * purchasePrice * 100) / 100,
    alert: computeStockAlert(stock, minStock, row.nearestExpiry),
    nearestExpiry: row.nearestExpiry?.toISOString() ?? null,
    serviceCount: parseInt(row.serviceCount, 10) || 0,
  };
}

const PRODUCT_SELECT = `
  SELECT
    p.id, p.name, p.sku, p.category::text AS category, p.brand, p.unit::text AS unit,
    p."purchasePrice"::text, p."salePrice"::text,
    p.stock::text, p."minStock"::text, p."maxStock"::text,
    p."supplierName", p.consumable, p.sellable, p.active, p.notes,
    p."createdAt", p."updatedAt",
    MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) AS "nearestExpiry",
    COUNT(DISTINCT sp."serviceId")::text AS "serviceCount"
  FROM "Product" p
  LEFT JOIN "ProductLot" l ON l."productId" = p.id
  LEFT JOIN "ServiceProduct" sp ON sp."productId" = p.id
`;

export async function getStockKpis(organizationId: string): Promise<StockKpis> {
  const { rows } = await pool.query<{
    productCount: string;
    activeCount: string;
    lowStockCount: string;
    outOfStockCount: string;
    totalStockValue: string;
    expiringSoonCount: string;
    expiredCount: string;
  }>(
    `SELECT
      COUNT(*)::text AS "productCount",
      COUNT(*) FILTER (WHERE active)::text AS "activeCount",
      COUNT(*) FILTER (WHERE active AND stock > 0 AND stock < "minStock")::text AS "lowStockCount",
      COUNT(*) FILTER (WHERE active AND stock <= 0)::text AS "outOfStockCount",
      COALESCE(SUM(stock * "purchasePrice") FILTER (WHERE active), 0)::text AS "totalStockValue",
      (
        SELECT COUNT(DISTINCT p2.id)::text FROM "Product" p2
        JOIN "ProductLot" l2 ON l2."productId" = p2.id
        WHERE p2."organizationId" = $1 AND p2."deletedAt" IS NULL AND p2.active
          AND l2.quantity > 0
          AND l2."expiresAt" IS NOT NULL
          AND l2."expiresAt" >= NOW()
          AND l2."expiresAt" <= NOW() + INTERVAL '30 days'
      ) AS "expiringSoonCount",
      (
        SELECT COUNT(DISTINCT p3.id)::text FROM "Product" p3
        JOIN "ProductLot" l3 ON l3."productId" = p3.id
        WHERE p3."organizationId" = $1 AND p3."deletedAt" IS NULL AND p3.active
          AND l3.quantity > 0
          AND l3."expiresAt" IS NOT NULL
          AND l3."expiresAt" < NOW()
      ) AS "expiredCount"
     FROM "Product"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL`,
    [organizationId],
  );

  const r = rows[0];
  return {
    productCount: parseInt(r?.productCount ?? "0", 10),
    activeCount: parseInt(r?.activeCount ?? "0", 10),
    lowStockCount: parseInt(r?.lowStockCount ?? "0", 10),
    outOfStockCount: parseInt(r?.outOfStockCount ?? "0", 10),
    expiringSoonCount: parseInt(r?.expiringSoonCount ?? "0", 10),
    expiredCount: parseInt(r?.expiredCount ?? "0", 10),
    totalStockValue: Math.round((parseFloat(r?.totalStockValue ?? "0") || 0) * 100) / 100,
  };
}

export async function listProducts(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    category?: ProductCategory | null;
    active?: boolean | null;
    alert?: string | null;
    supplier?: string | null;
  },
): Promise<{ items: ProductListItem[]; total: number; kpis: StockKpis }> {
  const { page, limit, search, category, active, alert, supplier } = opts;
  const conditions = [`p."organizationId" = $1`, `p."deletedAt" IS NULL`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (search) {
    conditions.push(
      `(p.name ILIKE $${pi} OR p.sku ILIKE $${pi} OR COALESCE(p.brand, '') ILIKE $${pi} OR COALESCE(p."supplierName", '') ILIKE $${pi})`,
    );
    params.push(`%${search}%`);
    pi++;
  }
  if (category) {
    conditions.push(`p.category = $${pi}::"ProductCategory"`);
    params.push(category);
    pi++;
  }
  if (active !== null && active !== undefined) {
    conditions.push(`p.active = $${pi}`);
    params.push(active);
    pi++;
  }
  if (supplier) {
    conditions.push(`p."supplierName" ILIKE $${pi}`);
    params.push(`%${supplier}%`);
    pi++;
  }

  const where = conditions.join(" AND ");
  const kpis = await getStockKpis(organizationId);

  let having = "";
  if (alert === "LOW") having = `HAVING p.stock > 0 AND p.stock < p."minStock"`;
  else if (alert === "OUT") having = `HAVING p.stock <= 0`;
  else if (alert === "EXPIRING") {
    having = `HAVING MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) IS NOT NULL
      AND MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) >= NOW()
      AND MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) <= NOW() + INTERVAL '30 days'`;
  } else if (alert === "EXPIRED") {
    having = `HAVING MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) IS NOT NULL
      AND MIN(l."expiresAt") FILTER (WHERE l.quantity > 0) < NOW()`;
  }

  const offset = (page - 1) * limit;

  const countRes = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM (
      SELECT p.id
      FROM "Product" p
      LEFT JOIN "ProductLot" l ON l."productId" = p.id
      WHERE ${where}
      GROUP BY p.id
      ${having}
    ) sub`,
    params,
  );

  const listSql = `
    ${PRODUCT_SELECT}
    WHERE ${where}
    GROUP BY p.id
    ${having}
    ORDER BY p.active DESC, p.name
    LIMIT $${pi} OFFSET $${pi + 1}
  `;

  const listRes = await pool.query<ProductRow>(listSql, [...params, limit, offset]);

  return {
    items: listRes.rows.map(rowToListItem),
    total: countRes.rows[0]?.total ?? 0,
    kpis,
  };
}

async function loadLots(productId: string): Promise<ProductLotItem[]> {
  const { rows } = await pool.query<{
    id: string;
    lotNumber: string;
    quantity: string;
    expiresAt: Date | null;
    receivedAt: Date;
    notes: string | null;
  }>(
    `SELECT id, "lotNumber", quantity::text, "expiresAt", "receivedAt", notes
     FROM "ProductLot" WHERE "productId" = $1
     ORDER BY "expiresAt" NULLS LAST, "receivedAt" DESC`,
    [productId],
  );
  return rows.map((r) => ({
    id: r.id,
    lotNumber: r.lotNumber,
    quantity: parseFloat(r.quantity) || 0,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    receivedAt: r.receivedAt.toISOString(),
    notes: r.notes,
  }));
}

function mapMovementRow(r: {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: string;
  quantity: string;
  unit: ProductUnit;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  userId: string | null;
  userFirst: string | null;
  userLast: string | null;
  createdAt: Date;
}): InventoryMovementItem {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    type: r.type as MovementType,
    quantity: parseFloat(r.quantity) || 0,
    unit: r.unit,
    reason: r.reason,
    referenceType: r.referenceType as InventoryMovementItem["referenceType"],
    referenceId: r.referenceId,
    userId: r.userId,
    userName:
      r.userFirst || r.userLast
        ? `${r.userFirst ?? ""} ${r.userLast ?? ""}`.trim()
        : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listMovements(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    productId?: string | null;
    type?: string | null;
    search?: string;
  },
): Promise<{ items: InventoryMovementItem[]; total: number }> {
  const conditions = [`im."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (opts.productId) {
    conditions.push(`im."productId" = $${pi}`);
    params.push(opts.productId);
    pi++;
  }
  if (opts.type) {
    conditions.push(`im.type = $${pi}::"MovementType"`);
    params.push(opts.type);
    pi++;
  }
  if (opts.search) {
    conditions.push(
      `(p.name ILIKE $${pi} OR p.sku ILIKE $${pi} OR COALESCE(im.reason, '') ILIKE $${pi})`,
    );
    params.push(`%${opts.search}%`);
    pi++;
  }

  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;

  const [countRes, listRes] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM "InventoryMovement" im
       JOIN "Product" p ON p.id = im."productId"
       WHERE ${where}`,
      params,
    ),
    pool.query(
      `SELECT
        im.id, im."productId", p.name AS "productName", p.sku AS "productSku",
        im.type::text, im.quantity::text, im.unit::text AS unit, im.reason,
        im."referenceType"::text, im."referenceId", im."userId",
        u."firstName" AS "userFirst", u."lastName" AS "userLast",
        im."createdAt"
       FROM "InventoryMovement" im
       JOIN "Product" p ON p.id = im."productId"
       LEFT JOIN "User" u ON u.id = im."userId"
       WHERE ${where}
       ORDER BY im."createdAt" DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
  ]);

  return {
    items: listRes.rows.map((r) =>
      mapMovementRow(
        r as Parameters<typeof mapMovementRow>[0],
      ),
    ),
    total: countRes.rows[0]?.total ?? 0,
  };
}

export async function getProductById(
  organizationId: string,
  productId: string,
): Promise<ProductDetail | null> {
  const { rows } = await pool.query<ProductRow>(
    `${PRODUCT_SELECT}
     WHERE p.id = $1 AND p."organizationId" = $2 AND p."deletedAt" IS NULL
     GROUP BY p.id`,
    [productId, organizationId],
  );
  if (!rows[0]) return null;

  const [lots, services, movements, supplierLinks] = await Promise.all([
    loadLots(productId),
    pool.query<{
      serviceId: string;
      serviceName: string;
      quantity: string;
      unit: string;
    }>(
      `SELECT s.id AS "serviceId", s.name AS "serviceName", sp.quantity::text, sp.unit
       FROM "ServiceProduct" sp
       JOIN "Service" s ON s.id = sp."serviceId"
       WHERE sp."productId" = $1
       ORDER BY s.name`,
      [productId],
    ),
    listMovements(organizationId, { page: 1, limit: 20, productId }),
    pool.query<{
      supplierId: string;
      supplierName: string;
      purchasePrice: string;
      preferred: boolean;
    }>(
      `SELECT ps."supplierId", s.name AS "supplierName", ps."purchasePrice"::text, ps.preferred
       FROM "ProductSupplier" ps
       JOIN "Supplier" s ON s.id = ps."supplierId"
       WHERE ps."productId" = $1 AND s."deletedAt" IS NULL
       ORDER BY ps.preferred DESC, ps."purchasePrice" ASC`,
      [productId],
    ),
  ]);

  return {
    ...rowToListItem(rows[0]),
    notes: rows[0].notes,
    lots,
    services: services.rows.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      quantity: parseFloat(s.quantity) || 0,
      unit: s.unit,
    })),
    suppliers: supplierLinks.rows.map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      purchasePrice: parseFloat(s.purchasePrice) || 0,
      preferred: s.preferred,
    })),
    recentMovements: movements.items,
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
  };
}

/**
 * Crée un mouvement immuable et met à jour le cache Product.stock.
 * Idempotent si idempotencyKey déjà présent.
 */
export async function createInventoryMovement(
  organizationId: string,
  input: CreateMovementInput,
  userId?: string | null,
  client?: PoolClient,
): Promise<{ movement: InventoryMovementItem; created: boolean }> {
  const ownClient = !client;
  const c = client ?? (await pool.connect());

  try {
    if (ownClient) await c.query("BEGIN");

    if (input.idempotencyKey) {
      const existing = await c.query<{ id: string }>(
        `SELECT id FROM "InventoryMovement"
         WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
        [organizationId, input.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (ownClient) await c.query("COMMIT");
        const list = await listMovements(organizationId, {
          page: 1,
          limit: 1,
          productId: input.productId,
        });
        const found = list.items.find((m) => m.id === existing.rows[0].id);
        if (found) return { movement: found, created: false };
        // fallback fetch
        const { rows } = await c.query(
          `SELECT
            im.id, im."productId", p.name AS "productName", p.sku AS "productSku",
            im.type::text, im.quantity::text, im.unit::text AS unit, im.reason,
            im."referenceType"::text, im."referenceId", im."userId",
            u."firstName" AS "userFirst", u."lastName" AS "userLast",
            im."createdAt"
           FROM "InventoryMovement" im
           JOIN "Product" p ON p.id = im."productId"
           LEFT JOIN "User" u ON u.id = im."userId"
           WHERE im.id = $1`,
          [existing.rows[0].id],
        );
        return {
          movement: mapMovementRow(rows[0] as Parameters<typeof mapMovementRow>[0]),
          created: false,
        };
      }
    }

    const product = await c.query<{
      id: string;
      unit: ProductUnit;
      name: string;
      sku: string;
    }>(
      `SELECT id, unit, name, sku FROM "Product"
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
       FOR UPDATE`,
      [input.productId, organizationId],
    );
    if (!product.rows[0]) throw new Error("PRODUCT_NOT_FOUND");

    const signedQty = movementSign(input.type, input.quantity);
    const id = newId("mov");

    await c.query(
      `INSERT INTO "InventoryMovement" (
        id, "organizationId", "productId", type, quantity, unit, reason,
        "referenceType", "referenceId", "userId", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,$4::"MovementType",$5,$6::"ProductUnit",$7,
        $8::"InventoryReferenceType",$9,$10,$11
      )`,
      [
        id,
        organizationId,
        input.productId,
        input.type,
        signedQty,
        product.rows[0].unit,
        input.reason ?? null,
        input.referenceType ?? null,
        input.referenceId ?? null,
        userId ?? null,
        input.idempotencyKey ?? null,
      ],
    );

    await c.query(
      `UPDATE "Product"
       SET stock = stock + $1, "updatedAt" = NOW()
       WHERE id = $2`,
      [signedQty, input.productId],
    );

    if (ownClient) await c.query("COMMIT");

    try {
      const { checkStockAndNotify } = await import("@/lib/notifications/emitter");
      await checkStockAndNotify(organizationId, input.productId);
    } catch (e) {
      console.error("[createInventoryMovement] notification", e);
    }

    return {
      movement: {
        id,
        productId: input.productId,
        productName: product.rows[0].name,
        productSku: product.rows[0].sku,
        type: input.type,
        quantity: signedQty,
        unit: product.rows[0].unit,
        reason: input.reason ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        userId: userId ?? null,
        userName: null,
        createdAt: new Date().toISOString(),
      },
      created: true,
    };
  } catch (e) {
    if (ownClient) await c.query("ROLLBACK");
    // Concurrent idempotency race
    if (
      input.idempotencyKey &&
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "23505"
    ) {
      const list = await listMovements(organizationId, {
        page: 1,
        limit: 5,
        productId: input.productId,
      });
      const found = list.items.find(
        (m) =>
          m.referenceId === input.referenceId && m.type === input.type,
      );
      if (found) return { movement: found, created: false };
    }
    throw e;
  } finally {
    if (ownClient) c.release();
  }
}

export async function createProduct(
  organizationId: string,
  input: CreateProductInput,
  userId?: string | null,
): Promise<ProductDetail> {
  const id = newId("prd");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "Product" (
        id, "organizationId", name, sku, category, brand, unit,
        "purchasePrice", "salePrice", stock, "minStock", "maxStock",
        "supplierName", consumable, sellable, active, notes, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5::"ProductCategory",$6,$7::"ProductUnit",
        $8,$9,0,$10,$11,$12,$13,$14,$15,$16,NOW()
      )`,
      [
        id,
        organizationId,
        input.name,
        input.sku,
        input.category ?? "CONSOMMABLE",
        input.brand ?? null,
        input.unit ?? "UNIT",
        input.purchasePrice ?? 0,
        input.salePrice ?? null,
        input.minStock ?? 0,
        input.maxStock ?? null,
        input.supplierName ?? null,
        input.consumable !== false,
        Boolean(input.sellable),
        input.active !== false,
        input.notes ?? null,
      ],
    );

    if (input.initialStock && input.initialStock > 0) {
      await createInventoryMovement(
        organizationId,
        {
          productId: id,
          type: "PURCHASE",
          quantity: input.initialStock,
          reason: "Stock initial",
          referenceType: "MANUAL",
        },
        userId,
        client,
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const detail = await getProductById(organizationId, id);
  if (!detail) throw new Error("Product introuvable après création.");
  return detail;
}

export async function updateProduct(
  organizationId: string,
  productId: string,
  input: UpdateProductInput,
  userId?: string | null,
): Promise<ProductDetail> {
  const existing = await getProductById(organizationId, productId);
  if (!existing) throw new Error("NOT_FOUND");

  const priceChanged =
    (input.purchasePrice !== undefined && input.purchasePrice !== existing.purchasePrice) ||
    (input.salePrice !== undefined && input.salePrice !== existing.salePrice);

  const sets: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  const set = (col: string, val: unknown, cast?: string) => {
    sets.push(cast ? `"${col}" = $${pi}${cast}` : `"${col}" = $${pi}`);
    params.push(val);
    pi++;
  };

  if (input.name !== undefined) set("name", input.name);
  if (input.sku !== undefined) set("sku", input.sku);
  if (input.category !== undefined) set("category", input.category, '::"ProductCategory"');
  if (input.brand !== undefined) set("brand", input.brand ?? null);
  if (input.unit !== undefined) set("unit", input.unit, '::"ProductUnit"');
  if (input.purchasePrice !== undefined) set("purchasePrice", input.purchasePrice);
  if (input.salePrice !== undefined) set("salePrice", input.salePrice ?? null);
  if (input.minStock !== undefined) set("minStock", input.minStock);
  if (input.maxStock !== undefined) set("maxStock", input.maxStock ?? null);
  if (input.supplierName !== undefined) set("supplierName", input.supplierName ?? null);
  if (input.consumable !== undefined) set("consumable", input.consumable);
  if (input.sellable !== undefined) set("sellable", input.sellable);
  if (input.active !== undefined) set("active", input.active);
  if (input.notes !== undefined) set("notes", input.notes ?? null);

  if (sets.length) {
    sets.push(`"updatedAt" = NOW()`);
    params.push(productId, organizationId);
    await pool.query(
      `UPDATE "Product" SET ${sets.join(", ")}
       WHERE id = $${pi} AND "organizationId" = $${pi + 1} AND "deletedAt" IS NULL`,
      params,
    );
  }

  if (priceChanged) {
    await pool.query(
      `INSERT INTO "ProductPriceHistory" (
        id, "productId", "oldPurchasePrice", "newPurchasePrice",
        "oldSalePrice", "newSalePrice", "userId"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        newId("pph"),
        productId,
        existing.purchasePrice,
        input.purchasePrice ?? existing.purchasePrice,
        existing.salePrice,
        input.salePrice !== undefined ? input.salePrice ?? null : existing.salePrice,
        userId ?? null,
      ],
    );
  }

  const detail = await getProductById(organizationId, productId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export async function createProductLot(
  organizationId: string,
  productId: string,
  input: {
    lotNumber: string;
    quantity: number;
    expiresAt?: string;
    notes?: string;
  },
): Promise<ProductLotItem> {
  const exists = await pool.query(
    `SELECT id FROM "Product" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [productId, organizationId],
  );
  if (!exists.rows[0]) throw new Error("NOT_FOUND");

  const id = newId("lot");
  await pool.query(
    `INSERT INTO "ProductLot" (id, "productId", "lotNumber", quantity, "expiresAt", notes, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [
      id,
      productId,
      input.lotNumber,
      input.quantity,
      input.expiresAt ? new Date(input.expiresAt) : null,
      input.notes ?? null,
    ],
  );
  const lots = await loadLots(productId);
  const lot = lots.find((l) => l.id === id);
  if (!lot) throw new Error("Lot introuvable.");
  return lot;
}

/** Inventaire physique → mouvements d'ajustement */
export async function applyInventoryCount(
  organizationId: string,
  items: InventoryCountItem[],
  userId?: string | null,
): Promise<{ adjustments: number }> {
  let adjustments = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of items) {
      const { rows } = await client.query<{ stock: string }>(
        `SELECT stock::text FROM "Product"
         WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL
         FOR UPDATE`,
        [item.productId, organizationId],
      );
      if (!rows[0]) continue;
      const theoretical = parseFloat(rows[0].stock) || 0;
      const diff = Math.round((item.countedQuantity - theoretical) * 1000) / 1000;
      if (diff === 0) continue;

      await createInventoryMovement(
        organizationId,
        {
          productId: item.productId,
          type: diff > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          quantity: Math.abs(diff),
          reason: `Inventaire physique (théorique ${theoretical} → réel ${item.countedQuantity})`,
          referenceType: "INVENTORY",
          idempotencyKey: `inv:${new Date().toISOString().slice(0, 10)}:${item.productId}:${theoretical}:${item.countedQuantity}`,
        },
        userId,
        client,
      );
      adjustments++;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return { adjustments };
}

/**
 * Consommation automatique à la finalisation d'un RDV.
 * Idempotente via clé apt:{id}:product:{productId}
 */
export async function consumeProductsForAppointment(opts: {
  organizationId: string;
  appointmentId: string;
  serviceId: string;
  userId?: string | null;
}): Promise<{ created: number; skipped: number }> {
  const { organizationId, appointmentId, serviceId, userId } = opts;

  const { rows: products } = await pool.query<{
    productId: string;
    quantity: string;
    unit: string;
    productName: string;
  }>(
    `SELECT sp."productId", sp.quantity::text, sp.unit, p.name AS "productName"
     FROM "ServiceProduct" sp
     JOIN "Product" p ON p.id = sp."productId"
     WHERE sp."serviceId" = $1 AND p."organizationId" = $2 AND p."deletedAt" IS NULL`,
    [serviceId, organizationId],
  );

  let created = 0;
  let skipped = 0;

  for (const p of products) {
    const qty = parseFloat(p.quantity) || 0;
    if (qty <= 0) continue;

    const result = await createInventoryMovement(
      organizationId,
      {
        productId: p.productId,
        type: "SERVICE_CONSUMPTION",
        quantity: qty,
        reason: `Consommation service — ${p.productName}`,
        referenceType: "APPOINTMENT",
        referenceId: appointmentId,
        idempotencyKey: `apt:${appointmentId}:product:${p.productId}`,
      },
      userId,
    );
    if (result.created) created++;
    else skipped++;
  }

  return { created, skipped };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
