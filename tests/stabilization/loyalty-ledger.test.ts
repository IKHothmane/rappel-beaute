import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { earnPointsFromPayment } from "@/lib/db/loyalty";
import { getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_loyalty";

run("Fidélité — ledger LoyaltyTransaction (jamais customer.points direct)", () => {
  let orgId: string;
  let paymentId: string;
  const idempotencyKey = `test:${PREFIX}:${testId("earn")}`;

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    paymentId = testId("test_pay_loy");
    await testPool.query(
      `INSERT INTO "Payment" (
        id, "organizationId", "customerId", amount, method, kind, status, "idempotencyKey", "paidAt", "updatedAt"
      ) VALUES ($1,$2,'c1',450,'CARD','PAYMENT','COMPLETED',$3,NOW(),NOW())`,
      [paymentId, orgId, idempotencyKey],
    );
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "LoyaltyTransaction" WHERE "idempotencyKey" = $1`, [
      `earn:payment:${paymentId}`,
    ]);
    await testPool.query(`DELETE FROM "Payment" WHERE id = $1`, [paymentId]);
  });

  it("EARN idempotent — 3 appels → 1 transaction", async () => {
    for (let i = 0; i < 3; i++) {
      await earnPointsFromPayment({
        organizationId: orgId,
        customerId: "c1",
        paymentId,
        amountMad: 450,
        userId: "u_owner",
      });
    }

    const { rows } = await testPool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [orgId, `earn:payment:${paymentId}`],
    );
    expect(parseInt(rows[0].c, 10)).toBe(1);

    const { rows: cols } = await testPool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'Customer' AND column_name = 'points'`,
    );
    expect(cols.length).toBe(0);
  });
});
