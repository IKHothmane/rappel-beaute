import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createWaitingListEntry,
  listWaitingListEntries,
  notifyWaitingListOnCancellation,
  updateWaitingListStatus,
} from "@/lib/db/waiting-list";
import {
  ensureSecondOrg,
  getSeedOrgId,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("41.18 — Liste d'attente", () => {
  let orgA: string;
  let orgB: string;
  let userId: string;
  let customerId: string;
  let serviceId: string;
  let staffId: string;
  const entryIds: string[] = [];
  const aptIds: string[] = [];

  beforeAll(async () => {
    orgA = await getSeedOrgId();
    orgB = await ensureSecondOrg();
    const { rows: u } = await testPool.query<{ id: string }>(
      `SELECT id FROM "User" WHERE "organizationId" = $1 LIMIT 1`,
      [orgA],
    );
    userId = u[0]?.id ?? "";
    const { rows: c } = await testPool.query<{ id: string }>(
      `SELECT id FROM "Customer" WHERE "organizationId" = $1 AND "deletedAt" IS NULL LIMIT 1`,
      [orgA],
    );
    customerId = c[0]?.id ?? "";
    const { rows: s } = await testPool.query<{ id: string }>(
      `SELECT id FROM "Service" WHERE "organizationId" = $1 AND active LIMIT 1`,
      [orgA],
    );
    serviceId = s[0]?.id ?? "";
    const { rows: st } = await testPool.query<{ id: string }>(
      `SELECT id FROM "Staff" WHERE "organizationId" = $1 LIMIT 1`,
      [orgA],
    );
    staffId = st[0]?.id ?? "";
    expect(userId && customerId && serviceId && staffId).toBeTruthy();
  });

  afterAll(async () => {
    for (const id of entryIds) {
      await testPool.query(`DELETE FROM "WaitingListEntry" WHERE id = $1`, [id]);
    }
    for (const id of aptIds) {
      await testPool.query(`DELETE FROM "WhatsAppTask" WHERE "appointmentId" = $1`, [id]);
      await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [id]);
    }
  });

  it("crée une entrée et isole par organizationId", async () => {
    const day = new Date(Date.now() + 5 * 24 * 3600_000).toISOString().slice(0, 10);
    const entry = await createWaitingListEntry(
      orgA,
      {
        customerId,
        serviceId,
        preferredDate: day,
        preferredTimeFrom: "10:00",
        preferredTimeTo: "18:00",
      },
      { id: userId, name: "Test" },
    );
    entryIds.push(entry.id);
    expect(entry.status).toBe("WAITING");

    const listB = await listWaitingListEntries(orgB);
    expect(listB.some((e) => e.id === entry.id)).toBe(false);
  });

  it("à l'annulation, notifie et crée WhatsAppTask WAITING_LIST", async () => {
    const entry = entryIds[0];
    expect(entry).toBeTruthy();

    const { rows: pref } = await testPool.query<{ preferredDate: Date }>(
      `SELECT "preferredDate" FROM "WaitingListEntry" WHERE id = $1`,
      [entry],
    );
    const day = pref[0].preferredDate;
    const startAt = new Date(
      `${day.toISOString().slice(0, 10)}T14:00:00+01:00`,
    );
    const endAt = new Date(startAt.getTime() + 60 * 60_000);
    const aptId = testId("apt_wl");
    aptIds.push(aptId);

    await testPool.query(
      `INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId",
        "startAt", "endAt", price, status, source, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,400,'CONFIRMED'::"AppointmentStatus",
        'MANUAL'::"AppointmentSource",NOW()
      )`,
      [aptId, orgA, customerId, serviceId, staffId, startAt, endAt],
    );

    const res = await notifyWaitingListOnCancellation({
      organizationId: orgA,
      appointmentId: aptId,
      serviceId,
      staffId,
      startAt,
      actor: { id: userId, name: "Test" },
    });
    expect(res.notified).toBeGreaterThanOrEqual(1);

    const updated = await updateWaitingListStatus(orgA, entry, "NOTIFIED", {
      id: userId,
    });
    // already NOTIFIED by notify — idempotent-ish
    expect(updated?.status).toBe("NOTIFIED");

    const { rows: tasks } = await testPool.query<{ type: string }>(
      `SELECT type::text FROM "WhatsAppTask"
       WHERE "organizationId" = $1 AND "appointmentId" = $2
         AND type = 'WAITING_LIST'`,
      [orgA, aptId],
    );
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });
});
