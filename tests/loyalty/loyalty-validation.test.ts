import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getSeedOrgId, testId, testPool, insertTestAppointment, cleanupTestPrefix } from "../helpers/db";
import { issueLoyaltyCard } from "@/lib/loyalty/cards";
import { validateLoyaltyVisit } from "@/lib/loyalty/validation";

describe("Loyalty Validation — Validation d'un passage", () => {
  const PREFIX = "test_lval";
  let orgId: string;
  let customerA: string;
  let customerB: string;
  let cardA: { id: string; publicToken: string };

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    customerA = testId(PREFIX + "_custA");
    customerB = testId(PREFIX + "_custB");

    const p1 = "+2126" + Math.floor(10000000 + Math.random() * 90000000);
    const p2 = "+2126" + Math.floor(10000000 + Math.random() * 90000000);
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Amina', 'Chraibi', $4, NOW()),
              ($3, $2, 'Salma', 'Tazi', $5, NOW())`,
      [customerA, orgId, customerB, p1, p2],
    );

    cardA = await issueLoyaltyCard(orgId, customerA);
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "LoyaltyVisitReward" WHERE "organizationId" = $1`, [orgId]);
    await testPool.query(`DELETE FROM "LoyaltyEvent" WHERE "organizationId" = $1`, [orgId]);
    await testPool.query(`DELETE FROM "LoyaltyCard" WHERE "organizationId" = $1`, [orgId]);
    await testPool.query(`DELETE FROM "Appointment" WHERE "customerId" LIKE $1`, [`${PREFIX}_%`]);
    await cleanupTestPrefix(PREFIX);
  });

  it("première validation d'un RDV terminé (+1 passage)", async () => {
    const apptId = await insertTestAppointment({
      organizationId: orgId,
      customerId: customerA,
      status: "COMPLETED",
      price: 300,
    });

    const result = await validateLoyaltyVisit(orgId, cardA.publicToken, apptId, "user_staff_1");
    expect(result.customerName).toContain("Amina");
    expect(result.amount).toBe(300);
    expect(result.visits).toBe(1);
  });

  it("double scan — deuxième tentative du même RDV (refus ALREADY_VALIDATED)", async () => {
    const apptId = await insertTestAppointment({
      organizationId: orgId,
      customerId: customerA,
      status: "COMPLETED",
      price: 200,
    });

    await validateLoyaltyVisit(orgId, cardA.publicToken, apptId, "user_staff_1");

    await expect(validateLoyaltyVisit(orgId, cardA.publicToken, apptId, "user_staff_2")).rejects.toThrow(
      "ALREADY_VALIDATED",
    );
  });

  it("rendez-vous non terminé (CONFIRMED / PENDING)", async () => {
    const apptId = await insertTestAppointment({
      organizationId: orgId,
      customerId: customerA,
      status: "CONFIRMED",
      price: 150,
    });

    await expect(validateLoyaltyVisit(orgId, cardA.publicToken, apptId, "user_staff_1")).rejects.toThrow(
      "APPOINTMENT_NOT_COMPLETED",
    );
  });

  it("rendez-vous d'une autre cliente (mismatch)", async () => {
    const apptIdOther = await insertTestAppointment({
      organizationId: orgId,
      customerId: customerB,
      status: "COMPLETED",
      price: 400,
    });

    await expect(validateLoyaltyVisit(orgId, cardA.publicToken, apptIdOther, "user_staff_1")).rejects.toThrow(
      "APPOINTMENT_MISMATCH",
    );
  });

  it("validation simultanée (concurrence 2 employés) -> 1 seul passage comptabilisé", async () => {
    const apptId = await insertTestAppointment({
      organizationId: orgId,
      customerId: customerA,
      status: "COMPLETED",
      price: 250,
    });

    const results = await Promise.allSettled([
      validateLoyaltyVisit(orgId, cardA.publicToken, apptId, "emp_1"),
      validateLoyaltyVisit(orgId, cardA.publicToken, apptId, "emp_2"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    if (rejected[0].status === "rejected") {
      expect((rejected[0].reason as Error).message).toBe("ALREADY_VALIDATED");
    }
  });
});
