import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createPayments,
  getAppointmentPaymentSummary,
  refundPayment,
} from "@/lib/db/finance";
import {
  cleanupTestPrefix,
  getSeedOrgId,
  insertTestAppointment,
  testId,
  testPool,
} from "../helpers/db";

async function ensureOpenCash(orgId: string, userId: string) {
  const { openCashRegister } = await import("@/lib/db/finance");
  try {
    await openCashRegister(orgId, { openingFloat: 500 }, userId);
  } catch (e) {
    if (!(e instanceof Error && e.message === "ALREADY_OPEN")) throw e;
  }
}

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_fin";

run("Finance — paiement multi-méthodes + caisse", () => {
  let orgId: string;
  let aptId: string;

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    await cleanupTestPrefix(PREFIX);
    await ensureOpenCash(orgId, "u_cashier");
    aptId = await insertTestAppointment({
      organizationId: orgId,
      status: "COMPLETED",
      price: 450,
    });
  });

  afterAll(async () => {
    await cleanupTestPrefix(PREFIX);
    await testPool.query(`DELETE FROM "Payment" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [aptId]);
  });

  it("450 MAD = CASH 200 + CARD 250 — caisse +200 uniquement", async () => {
    const payKey = testId(`test:${PREFIX}:pay`);
    await createPayments(
      orgId,
      {
        appointmentId: aptId,
        idempotencyKey: payKey,
        items: [
          { method: "CASH", amount: 200 },
          { method: "CARD", amount: 250 },
        ],
      },
      "u_cashier",
    );

    const summary = await getAppointmentPaymentSummary(orgId, aptId);
    expect(summary?.netPaid).toBe(450);
    expect(summary?.remaining).toBeLessThanOrEqual(0.01);

    const { rows: cashRows } = await testPool.query<{ total: string }>(
      `SELECT COALESCE(SUM(crt.amount), 0)::text AS total
       FROM "CashRegisterTransaction" crt
       JOIN "Payment" p ON p.id = crt."paymentId"
       WHERE p."appointmentId" = $1 AND crt.type = 'SALE' AND p.method = 'CASH'`,
      [aptId],
    );
    const cashTotal = parseFloat(cashRows[0]?.total ?? "0");
    expect(cashTotal).toBe(200);
    expect(cashTotal).not.toBe(450);
  });
});

run("Remboursement — payment original intact", () => {
  let orgId: string;
  let paymentId: string;

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    await ensureOpenCash(orgId, "u_cashier");
    const aptId = await insertTestAppointment({
      organizationId: orgId,
      status: "COMPLETED",
      price: 450,
    });
    const { payments } = await createPayments(
      orgId,
      {
        appointmentId: aptId,
        idempotencyKey: testId(`test:${PREFIX}:refund_apt`),
        items: [{ method: "CARD", amount: 450 }],
      },
      "u_owner",
    );
    paymentId = payments[0].id;
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "Payment" WHERE id = $1 OR "parentPaymentId" = $1`, [
      paymentId,
    ]);
  });

  it("REFUND -450 sans modifier le paiement original", async () => {
    const before = await testPool.query<{ amount: string; kind: string }>(
      `SELECT amount::text, kind::text FROM "Payment" WHERE id = $1`,
      [paymentId],
    );
    expect(parseFloat(before.rows[0].amount)).toBe(450);
    expect(before.rows[0].kind).toBe("PAYMENT");

    await refundPayment(
      orgId,
      paymentId,
      { amount: 450, method: "CARD", reason: "Test remboursement" },
      "u_owner",
    );

    const after = await testPool.query<{ amount: string; kind: string }>(
      `SELECT amount::text, kind::text FROM "Payment" WHERE id = $1`,
      [paymentId],
    );
    expect(parseFloat(after.rows[0].amount)).toBe(450);
    expect(after.rows[0].kind).toBe("PAYMENT");

    const refunds = await testPool.query<{ amount: string; kind: string }>(
      `SELECT amount::text, kind::text FROM "Payment"
       WHERE "parentPaymentId" = $1 AND kind = 'REFUND'`,
      [paymentId],
    );
    expect(refunds.rows.length).toBe(1);
    expect(parseFloat(refunds.rows[0].amount)).toBe(450);
  });
});
