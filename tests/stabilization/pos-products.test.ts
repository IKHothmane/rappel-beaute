import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createPosSale,
  getPosSaleById,
  listPosProducts,
  listPosSales,
  refundPosSale,
  searchPosCustomers,
} from "@/lib/db/pos";
import {
  canAccessNav,
  canReadFeature,
  canWriteFeature,
  getFeatureAccess,
} from "@/lib/rbac";
import { isPlanFeatureEnabled, NAV_PLAN_FEATURE } from "@/lib/subscriptions/nav-features";
import {
  ensureSecondOrg,
  getSeedOrgId,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_pos";

describe("41.23 — POS RBAC + plan (unit)", () => {
  it("OWNER/MANAGER/CASHIER écrivent caisse (POS)", () => {
    expect(canWriteFeature("OWNER", "cash-register")).toBe(true);
    expect(canWriteFeature("MANAGER", "cash-register")).toBe(true);
    expect(canWriteFeature("CASHIER", "cash-register")).toBe(true);
  });

  it("STAFF n'écrit pas la caisse par défaut", () => {
    expect(canWriteFeature("STAFF", "cash-register")).toBe(false);
  });

  it("ACCOUNTANT lecture caisse uniquement", () => {
    expect(canReadFeature("ACCOUNTANT", "cash-register")).toBe(true);
    expect(getFeatureAccess("ACCOUNTANT", "cash-register")).toBe("read");
    expect(canWriteFeature("ACCOUNTANT", "cash-register")).toBe(false);
  });

  it("nav POS accessible OWNER / CASHIER", () => {
    expect(canAccessNav("OWNER", "pos")).toBe(true);
    expect(canAccessNav("CASHIER", "pos")).toBe(true);
    expect(canAccessNav("ACCOUNTANT", "pos")).toBe(true);
  });

  it("plan feature POS exige cashRegister + inventory", () => {
    expect(NAV_PLAN_FEATURE.pos).toBe("cashRegister");
    expect(
      isPlanFeatureEnabled({ cashRegister: true, inventory: true }, "pos"),
    ).toBe(true);
    expect(
      isPlanFeatureEnabled({ cashRegister: true, inventory: false }, "pos"),
    ).toBe(false);
    expect(
      isPlanFeatureEnabled({ cashRegister: false, inventory: true }, "pos"),
    ).toBe(false);
  });
});

run("41.23 — POS PostgreSQL", () => {
  let orgA: string;
  let orgB: string;
  let productId: string;
  let productB: string;
  let customerId: string;
  let saleId: string;
  let invoiceIdForCash: string;

  async function ensureOpenCash() {
    const open = await testPool.query(
      `SELECT id FROM "CashRegisterSession"
       WHERE "organizationId" = $1 AND status = 'OPEN' LIMIT 1`,
      [orgA],
    );
    if (open.rows[0]) return;
    await testPool.query(
      `INSERT INTO "CashRegisterSession" (
        id, "organizationId", "openedById", "openingFloat", status, "openedAt", "updatedAt"
      ) VALUES ($1,$2,'u_owner',500,'OPEN'::"CashRegisterStatus",NOW(),NOW())`,
      [testId(`${PREFIX}_sess`), orgA],
    );
  }

  beforeAll(async () => {
    orgA = await getSeedOrgId();
    orgB = await ensureSecondOrg();
    productId = testId(`${PREFIX}_p`);
    productB = testId(`${PREFIX}_p2`);
    customerId = testId(`${PREFIX}_c`);

    await testPool.query(
      `INSERT INTO "Product" (
        id, "organizationId", name, sku, category, unit,
        "purchasePrice", "salePrice", stock, "minStock",
        consumable, sellable, active, "updatedAt"
      ) VALUES
        ($1,$2,'Shampooing POS','SKU-POS-1','VENTE'::"ProductCategory",'UNIT'::"ProductUnit",
         50,120,10,2,false,true,true,NOW()),
        ($3,$2,'Crème POS','SKU-POS-2','VENTE'::"ProductCategory",'UNIT'::"ProductUnit",
         80,180,5,1,false,true,true,NOW())`,
      [productId, orgA, productB],
    );

    await testPool.query(
      `INSERT INTO "Customer" (
        id, "organizationId", "firstName", "lastName", phone, status, "updatedAt"
      ) VALUES ($1,$2,'Sara','POS','0661554433','ACTIVE',NOW())`,
      [customerId, orgA],
    );

    await ensureOpenCash();
  });

  afterAll(async () => {
    try {
      await testPool.query(
        `DELETE FROM "InventoryMovement" WHERE "productId" IN ($1,$2)`,
        [productId, productB],
      );
      await testPool.query(
        `DELETE FROM "CashRegisterTransaction" WHERE "organizationId" = $1 AND reason LIKE 'POS %'`,
        [orgA],
      );
      await testPool.query(
        `DELETE FROM "Payment" WHERE "organizationId" = $1 AND "idempotencyKey" LIKE 'pos%'`,
        [orgA],
      );
      await testPool.query(`DELETE FROM "PosSale" WHERE "organizationId" = $1`, [orgA]);
      await testPool.query(
        `DELETE FROM "InvoiceItem" WHERE "productId" IN ($1,$2)`,
        [productId, productB],
      );
      await testPool.query(
        `DELETE FROM "Invoice" WHERE "organizationId" = $1 AND "idempotencyKey" LIKE 'pos:%'`,
        [orgA],
      );
      await testPool.query(`DELETE FROM "Product" WHERE id IN ($1,$2)`, [productId, productB]);
      await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
      await testPool.query(
        `DELETE FROM "AuditLog" WHERE "organizationId" = $1 AND "entityType" = 'PosSale'`,
        [orgA],
      );
    } catch {
      /* best-effort cleanup */
    }
  });

  it("liste produits vendables", async () => {
    const list = await listPosProducts(orgA);
    expect(list.some((p) => p.id === productId)).toBe(true);
  });

  it("recherche produit", async () => {
    const list = await listPosProducts(orgA, { search: "Shampooing" });
    expect(list.some((p) => p.id === productId)).toBe(true);
  });

  it("recherche cliente", async () => {
    const hits = await searchPosCustomers(orgA, "Sara");
    expect(hits.some((c) => c.id === customerId)).toBe(true);
  });

  it("vente produit CASH + facture + stock", async () => {
    await ensureOpenCash();
    const sale = await createPosSale(
      orgA,
      {
        lines: [{ productId, quantity: 2 }],
        paymentMethod: "CASH",
        customerId,
        idempotencyKey: `${PREFIX}_sale1`,
      },
      { id: "u_owner", name: "Owner" },
    );
    saleId = sale.id;
    invoiceIdForCash = sale.invoiceId;
    expect(sale.total).toBe(240);
    expect(sale.invoiceNumber).toMatch(/^FAC-/);
    expect(sale.customerId).toBe(customerId);
    expect(sale.lines).toHaveLength(1);
    expect(sale.paymentMethod).toBe("CASH");

    const { rows: stock } = await testPool.query<{ stock: string }>(
      `SELECT stock::text FROM "Product" WHERE id = $1`,
      [productId],
    );
    expect(parseFloat(stock[0].stock)).toBe(8);
  });

  it("InventoryMovement SALE créé", async () => {
    const mov = await testPool.query(
      `SELECT type::text, quantity::text FROM "InventoryMovement"
       WHERE "referenceId" = $1 AND type = 'SALE'`,
      [saleId],
    );
    expect(mov.rows.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(mov.rows[0].quantity)).toBe(-2);
  });

  it("facture PAID liée", async () => {
    const { rows } = await testPool.query<{ status: string; total: string }>(
      `SELECT status::text, total::text FROM "Invoice" WHERE id = $1`,
      [invoiceIdForCash],
    );
    expect(rows[0].status).toBe("PAID");
    expect(parseFloat(rows[0].total)).toBe(240);
  });

  it("plusieurs produits + quantité CARD", async () => {
    const sale = await createPosSale(
      orgA,
      {
        lines: [
          { productId, quantity: 1 },
          { productB, quantity: 1 },
        ],
        paymentMethod: "CARD",
        idempotencyKey: `${PREFIX}_sale2`,
      },
      { id: "u_owner" },
    );
    expect(sale.total).toBe(300);
    expect(sale.lines.length).toBe(2);
    expect(sale.paymentMethod).toBe("CARD");
  });

  it("stock insuffisant", async () => {
    await expect(
      createPosSale(
        orgA,
        {
          lines: [{ productId, quantity: 999 }],
          paymentMethod: "CARD",
          idempotencyKey: `${PREFIX}_fail_stock`,
        },
        { id: "u_owner" },
      ),
    ).rejects.toThrow("INSUFFICIENT_STOCK");
  });

  it("stock = 0 bloqué", async () => {
    const zeroP = testId(`${PREFIX}_zero`);
    await testPool.query(
      `INSERT INTO "Product" (
        id, "organizationId", name, sku, category, unit,
        "purchasePrice", "salePrice", stock, sellable, active, "updatedAt"
      ) VALUES ($1,$2,'Zero','SKU-Z','VENTE'::"ProductCategory",'UNIT'::"ProductUnit",
        10,50,0,true,true,NOW())`,
      [zeroP, orgA],
    );
    await expect(
      createPosSale(
        orgA,
        {
          lines: [{ productId: zeroP, quantity: 1 }],
          paymentMethod: "CARD",
          idempotencyKey: `${PREFIX}_zero`,
        },
        { id: "u_owner" },
      ),
    ).rejects.toThrow("INSUFFICIENT_STOCK");
    await testPool.query(`DELETE FROM "Product" WHERE id = $1`, [zeroP]);
  });

  it("vente anonyme", async () => {
    const sale = await createPosSale(
      orgA,
      {
        lines: [{ productB, quantity: 1 }],
        paymentMethod: "CARD",
        customerId: null,
        idempotencyKey: `${PREFIX}_anon`,
      },
      { id: "u_owner" },
    );
    expect(sale.customerId).toBeNull();
    expect(sale.customerName).toBe("Passage");
  });

  it("cliente associée", async () => {
    const sale = await createPosSale(
      orgA,
      {
        lines: [{ productB, quantity: 1 }],
        paymentMethod: "CARD",
        customerId,
        idempotencyKey: `${PREFIX}_cust`,
      },
      { id: "u_owner" },
    );
    expect(sale.customerId).toBe(customerId);
  });

  it("remise", async () => {
    const sale = await createPosSale(
      orgA,
      {
        lines: [{ productB, quantity: 1 }],
        paymentMethod: "CARD",
        discountTotal: 20,
        idempotencyKey: `${PREFIX}_disc`,
      },
      { id: "u_owner" },
    );
    expect(sale.discountTotal).toBe(20);
    expect(sale.total).toBe(160);
  });

  it("audit POS_DISCOUNT_APPLIED", async () => {
    const { rows } = await testPool.query(
      `SELECT action FROM "AuditLog"
       WHERE "organizationId" = $1 AND action = 'POS_DISCOUNT_APPLIED'`,
      [orgA],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("idempotence — même clé → même vente", async () => {
    const a = await createPosSale(
      orgA,
      {
        lines: [{ productB, quantity: 1 }],
        paymentMethod: "CARD",
        idempotencyKey: `${PREFIX}_idem`,
      },
      { id: "u_owner" },
    );
    const b = await createPosSale(
      orgA,
      {
        lines: [{ productB, quantity: 1 }],
        paymentMethod: "CARD",
        idempotencyKey: `${PREFIX}_idem`,
      },
      { id: "u_owner" },
    );
    expect(a.id).toBe(b.id);
  });

  it("audit POS_SALE_CREATED + POS_PAYMENT_COMPLETED", async () => {
    const { rows } = await testPool.query(
      `SELECT action FROM "AuditLog"
       WHERE "organizationId" = $1 AND "entityType" = 'PosSale' AND "entityId" = $2`,
      [orgA, saleId],
    );
    expect(rows.some((r: { action: string }) => r.action === "POS_SALE_CREATED")).toBe(true);
    expect(rows.some((r: { action: string }) => r.action === "POS_PAYMENT_COMPLETED")).toBe(
      true,
    );
  });

  it("liste ventes org", async () => {
    const list = await listPosSales(orgA, { limit: 20 });
    expect(list.some((s) => s.id === saleId)).toBe(true);
  });

  it("isolation tenant — org B ne lit pas la vente A", async () => {
    expect(await getPosSaleById(orgB, saleId)).toBeNull();
  });

  it("refund + stock restauré + audit", async () => {
    const before = await testPool.query<{ stock: string }>(
      `SELECT stock::text FROM "Product" WHERE id = $1`,
      [productId],
    );
    const stockBefore = parseFloat(before.rows[0].stock);

    const sale = await createPosSale(
      orgA,
      {
        lines: [{ productId, quantity: 1 }],
        paymentMethod: "CARD",
        idempotencyKey: `${PREFIX}_refund_target`,
      },
      { id: "u_owner" },
    );
    const mid = await testPool.query<{ stock: string }>(
      `SELECT stock::text FROM "Product" WHERE id = $1`,
      [productId],
    );
    expect(parseFloat(mid.rows[0].stock)).toBe(stockBefore - 1);

    const refunded = await refundPosSale(orgA, sale.id, { id: "u_owner", name: "Owner" });
    expect(refunded.status).toBe("REFUNDED");

    const after = await testPool.query<{ stock: string }>(
      `SELECT stock::text FROM "Product" WHERE id = $1`,
      [productId],
    );
    expect(parseFloat(after.rows[0].stock)).toBe(stockBefore);

    const returnMov = await testPool.query(
      `SELECT type::text FROM "InventoryMovement"
       WHERE "referenceId" = $1 AND type = 'RETURN'`,
      [sale.id],
    );
    expect(returnMov.rows.length).toBeGreaterThanOrEqual(1);

    const audits = await testPool.query(
      `SELECT action FROM "AuditLog"
       WHERE "entityId" = $1 AND action = 'POS_REFUND_CREATED'`,
      [sale.id],
    );
    expect(audits.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("analytics POS — PosSale COMPLETED visible en agrégat", async () => {
    const { rows } = await testPool.query<{ n: string; rev: string }>(
      `SELECT COUNT(*)::text AS n, COALESCE(SUM(total),0)::text AS rev
       FROM "PosSale"
       WHERE "organizationId" = $1 AND status = 'COMPLETED'`,
      [orgA],
    );
    expect(parseInt(rows[0].n, 10)).toBeGreaterThanOrEqual(1);
    expect(parseFloat(rows[0].rev)).toBeGreaterThan(0);
  });

  it("ONLINE interdit", async () => {
    await expect(
      createPosSale(
        orgA,
        {
          lines: [{ productB, quantity: 1 }],
          // @ts-expect-error test runtime guard
          paymentMethod: "ONLINE",
          idempotencyKey: `${PREFIX}_online`,
        },
        { id: "u_owner" },
      ),
    ).rejects.toThrow("ONLINE_NOT_ALLOWED");
  });

  it("panier vide rejeté", async () => {
    await expect(
      createPosSale(
        orgA,
        {
          lines: [],
          paymentMethod: "CARD",
          idempotencyKey: `${PREFIX}_empty`,
        },
        { id: "u_owner" },
      ),
    ).rejects.toThrow("EMPTY_CART");
  });

  it("concurrence stock — une seule vente réussit sur stock=1", async () => {
    const p = testId(`${PREFIX}_race`);
    await testPool.query(
      `INSERT INTO "Product" (
        id, "organizationId", name, sku, category, unit,
        "purchasePrice", "salePrice", stock, sellable, active, "updatedAt"
      ) VALUES ($1,$2,'Race','SKU-R','VENTE'::"ProductCategory",'UNIT'::"ProductUnit",
        10,100,1,true,true,NOW())`,
      [p, orgA],
    );

    const results = await Promise.allSettled([
      createPosSale(
        orgA,
        {
          lines: [{ productId: p, quantity: 1 }],
          paymentMethod: "CARD",
          idempotencyKey: `${PREFIX}_race_a`,
        },
        { id: "u_owner" },
      ),
      createPosSale(
        orgA,
        {
          lines: [{ productId: p, quantity: 1 }],
          paymentMethod: "CARD",
          idempotencyKey: `${PREFIX}_race_b`,
        },
        { id: "u_owner" },
      ),
    ]);

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.filter((r) => r.status === "rejected").length;
    expect(ok).toBe(1);
    expect(fail).toBe(1);

    const stock = await testPool.query<{ stock: string }>(
      `SELECT stock::text FROM "Product" WHERE id = $1`,
      [p],
    );
    expect(parseFloat(stock.rows[0].stock)).toBe(0);
  });
});
