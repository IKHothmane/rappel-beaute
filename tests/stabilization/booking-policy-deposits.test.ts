import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  getOrCreateBookingPolicy,
  noShowRiskLevel,
  resolveDepositRequirement,
  sumDepositPaid,
  updateBookingPolicy,
} from "@/lib/db/booking-policy";
import { createPayments } from "@/lib/db/finance";
import { getAppointmentById } from "@/lib/db/appointments";
import {
  ensureSecondOrg,
  getSeedOrgId,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("41.17 — Acompte & anti-no-show", () => {
  let orgA: string;
  let orgB: string;
  let userId: string;
  let customerId: string;
  let serviceId: string;
  let staffId: string;
  const aptIds: string[] = [];

  beforeAll(async () => {
    orgA = await getSeedOrgId();
    orgB = await ensureSecondOrg();

    const { rows: users } = await testPool.query<{ id: string }>(
      `SELECT id FROM "User" WHERE "organizationId" = $1 LIMIT 1`,
      [orgA],
    );
    userId = users[0]?.id ?? "";

    const { rows: cust } = await testPool.query<{ id: string }>(
      `SELECT id FROM "Customer" WHERE "organizationId" = $1 AND "deletedAt" IS NULL LIMIT 1`,
      [orgA],
    );
    customerId = cust[0]?.id ?? "";

    const { rows: svc } = await testPool.query<{ id: string }>(
      `SELECT id FROM "Service" WHERE "organizationId" = $1 AND active = true LIMIT 1`,
      [orgA],
    );
    serviceId = svc[0]?.id ?? "";

    const { rows: st } = await testPool.query<{ id: string }>(
      `SELECT id FROM "Staff" WHERE "organizationId" = $1 LIMIT 1`,
      [orgA],
    );
    staffId = st[0]?.id ?? "";

    expect(userId && customerId && serviceId && staffId).toBeTruthy();

    // Ensure policy table exists / defaults
    await getOrCreateBookingPolicy(orgA);
    await updateBookingPolicy(
      orgA,
      {
        depositsEnabled: true,
        defaultMode: "FIXED",
        defaultFixedAmount: 100,
        confirmDeadlineHours: 48,
        noShowWarnAt: 1,
        noShowRequireDepositAt: 2,
        noShowStrictAt: 3,
      },
      { id: userId, name: "Test" },
    );
  });

  afterAll(async () => {
    for (const id of aptIds) {
      await testPool.query(`DELETE FROM "Payment" WHERE "appointmentId" = $1`, [id]);
      await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [id]);
    }
  });

  it("calcule un acompte et crée un RDV AWAITING sans Payment", async () => {
    const req = await resolveDepositRequirement({
      organizationId: orgA,
      customerId,
      serviceDeposit: 100,
      price: 500,
    });
    expect(req.amount).toBe(100);
    expect(req.state).toBe("AWAITING");

    const aptId = testId("apt_dep");
    aptIds.push(aptId);
    const start = new Date(Date.now() + 3 * 24 * 3600_000);
    const end = new Date(start.getTime() + 60 * 60_000);

    await testPool.query(
      `INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId",
        "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
        status, source, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,500,100,'AWAITING'::"DepositState",$8,
        'PENDING'::"AppointmentStatus",'ONLINE_BOOKING'::"AppointmentSource",NOW()
      )`,
      [aptId, orgA, customerId, serviceId, staffId, start, end, req.dueAt],
    );

    const paid = await sumDepositPaid(orgA, aptId);
    expect(paid).toBe(0);

    const fromB = await getAppointmentById(aptId, orgB);
    expect(fromB).toBeNull();
  });

  it("DEPOSIT complet → PAID + CONFIRMED ; isolation org B", async () => {
    const aptId = aptIds[0];
    expect(aptId).toBeTruthy();

    await createPayments(
      orgA,
      {
        appointmentId: aptId,
        items: [{ amount: 100, method: "TRANSFER", kind: "DEPOSIT" }],
        idempotencyKey: testId("idem_dep"),
      },
      userId,
    );

    const apt = await getAppointmentById(aptId, orgA);
    expect(apt?.depositState).toBe("PAID");
    expect(apt?.status).toBe("CONFIRMED");

    const cross = await sumDepositPaid(orgB, aptId);
    expect(cross).toBe(0);
  });

  it("noShowRiskLevel respecte les seuils", () => {
    const policy = {
      depositsEnabled: true,
      defaultMode: "FIXED" as const,
      defaultFixedAmount: 100,
      defaultPercent: null,
      confirmDeadlineHours: 24,
      lateCancelHours: 24,
      onCustomerLateCancel: "KEEP" as const,
      onNoShow: "KEEP" as const,
      onInstituteCancel: "REFUND" as const,
      noShowWarnAt: 1,
      noShowRequireDepositAt: 2,
      noShowStrictAt: 3,
    };
    expect(noShowRiskLevel(0, policy)).toBe("NONE");
    expect(noShowRiskLevel(1, policy)).toBe("WARN");
    expect(noShowRiskLevel(2, policy)).toBe("REQUIRE_DEPOSIT");
    expect(noShowRiskLevel(3, policy)).toBe("STRICT");
  });
});
