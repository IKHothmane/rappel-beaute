import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createInventoryMovement } from "@/lib/db/inventory";
import { getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_stock";

run("Stock — ledger reconstruit le cache Product.stock", () => {
  const productId = testId(PREFIX);
  let orgId: string;
  const baseline = 0;
  const keys: string[] = [];

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    await testPool.query(
      `INSERT INTO "Product" (
        id, "organizationId", name, sku, category, unit,
        "purchasePrice", "salePrice", stock, "minStock",
        consumable, sellable, active, "updatedAt"
      ) VALUES (
        $1, $2, 'Produit ledger', $3, 'CONSOMMABLE'::"ProductCategory", 'UNIT'::"ProductUnit",
        10, 20, 0, 0, true, true, true, NOW()
      )`,
      [productId, orgId, `SKU-${productId.slice(-8)}`],
    );
  });

  afterAll(async () => {
    if (keys.length) {
      await testPool.query(`DELETE FROM "InventoryMovement" WHERE "idempotencyKey" = ANY($1::text[])`, [
        keys,
      ]);
    }
    await testPool.query(`DELETE FROM "Product" WHERE id = $1`, [productId]);
  });

  it("Purchase +30, conso -5, vente -2, perte -1, ajustement -2", async () => {
    const moves = [
      { type: "PURCHASE" as const, qty: 30 },
      { type: "SERVICE_CONSUMPTION" as const, qty: 5 },
      { type: "SALE" as const, qty: 2 },
      { type: "LOSS" as const, qty: 1 },
      { type: "ADJUSTMENT_OUT" as const, qty: 2 },
    ];

    for (const m of moves) {
      const key = `test:${PREFIX}:${m.type}:${testId("k")}`;
      keys.push(key);
      await createInventoryMovement(
        orgId,
        {
          productId,
          type: m.type,
          quantity: m.qty,
          reason: `Test ${m.type}`,
          idempotencyKey: key,
        },
        "u_owner",
      );
    }

    const { rows } = await testPool.query<{ stock: string }>(
      `SELECT stock::text FROM "Product" WHERE id = $1`,
      [productId],
    );
    const cacheStock = parseFloat(rows[0].stock);

    const { rows: ledgerRows } = await testPool.query<{ delta: string }>(
      `SELECT COALESCE(SUM(quantity), 0)::text AS delta
       FROM "InventoryMovement"
       WHERE "productId" = $1 AND "idempotencyKey" = ANY($2::text[])`,
      [productId, keys],
    );
    const delta = parseFloat(ledgerRows[0]?.delta ?? "0");

    expect(cacheStock).toBe(Math.round((baseline + delta) * 1000) / 1000);
    expect(delta).toBe(30 - 5 - 2 - 1 - 2);
  });

  it("idempotence — même clé ne double pas le mouvement", async () => {
    const key = `test:${PREFIX}:dup:${testId("k")}`;
    keys.push(key);
    const input = {
      productId,
      type: "ADJUSTMENT_IN" as const,
      quantity: 3,
      reason: "Test idempotence",
      idempotencyKey: key,
    };
    const first = await createInventoryMovement(orgId, input, "u_owner");
    const second = await createInventoryMovement(orgId, input, "u_owner");
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
  });
});
