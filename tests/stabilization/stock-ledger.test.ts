import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createInventoryMovement } from "@/lib/db/inventory";
import { getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_stock";

run("Stock — ledger reconstruit le cache Product.stock", () => {
  const productId = "p1";
  let orgId: string;
  let baseline: number;
  const keys: string[] = [];

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    const { rows } = await testPool.query<{ stock: string }>(
      `SELECT stock::text FROM "Product" WHERE id = $1 AND "organizationId" = $2`,
      [productId, orgId],
    );
    baseline = parseFloat(rows[0]?.stock ?? "0");
  });

  afterAll(async () => {
    if (keys.length) {
      await testPool.query(`DELETE FROM "InventoryMovement" WHERE "idempotencyKey" = ANY($1::text[])`, [
        keys,
      ]);
    }
    await testPool.query(`UPDATE "Product" SET stock = $1 WHERE id = $2`, [baseline, productId]);
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
