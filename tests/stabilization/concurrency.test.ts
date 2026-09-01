import { describe, expect, it, afterEach } from "vitest";
import { isExclusionViolation } from "@/lib/db/appointments";
import {
  getSeedOrgId,
  insertTestAppointment,
  isExclusionError,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Concurrence — EXCLUDE PostgreSQL", () => {
  const created: string[] = [];

  afterEach(async () => {
    if (created.length) {
      await testPool.query(`DELETE FROM "Appointment" WHERE id = ANY($1::text[])`, [created]);
      created.length = 0;
    }
  });

  it("deux réservations simultanées même employée → 1 succès, 1 conflit", async () => {
    const orgId = await getSeedOrgId();
    const start = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    start.setMinutes(30, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const slot = { organizationId: orgId, staffId: "e2", resourceId: "r2", start, end };

    const insertOne = async () => {
      const id = testId("test_conc");
      await testPool.query(
        `INSERT INTO "Appointment" (
          id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
          "startAt", "endAt", price, status, "updatedAt"
        ) VALUES ($1,$2,'c1','s1',$3,$4,$5,$6,450,'CONFIRMED',NOW())`,
        [id, slot.organizationId, slot.staffId, slot.resourceId, slot.start, slot.end],
      );
      return id;
    };

    const results = await Promise.allSettled([insertOne(), insertOne()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>[];
    const rejected = results.filter((r) => r.status === "rejected");

    created.push(...fulfilled.map((r) => r.value));

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(isExclusionError(rejected[0]?.reason)).toBe(true);
    expect(isExclusionViolation(rejected[0]?.reason)).toBe(true);
  });

  it("createAppointmentRow chevauchement → exclusion si INSERT direct", async () => {
    const orgId = await getSeedOrgId();
    const start = new Date(Date.now() + 15 * 24 * 3600 * 1000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);

    const first = await insertTestAppointment({
      organizationId: orgId,
      staffId: "e1",
      resourceId: "r1",
      startAt: start,
      endAt: end,
      status: "CONFIRMED",
    });
    created.push(first);

    let conflict = false;
    try {
      const second = await insertTestAppointment({
        organizationId: orgId,
        staffId: "e1",
        resourceId: "r1",
        startAt: start,
        endAt: end,
        status: "CONFIRMED",
      });
      created.push(second);
    } catch (e) {
      conflict = isExclusionError(e);
    }
    expect(conflict).toBe(true);
  });
});
