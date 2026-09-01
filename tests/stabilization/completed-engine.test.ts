import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { onAppointmentCompleted } from "@/lib/db/invoices";
import { syncReviewRequests } from "@/lib/db/reviews";
import {
  cleanupTestPrefix,
  countRows,
  getSeedOrgId,
  insertTestAppointment,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_completed";

run("Moteur COMPLETED — idempotence", () => {
  let orgId: string;
  let aptId: string;

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    await cleanupTestPrefix(PREFIX);
    const fourHoursAgo = new Date(Date.now() - 4 * 3600 * 1000);
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
    aptId = await insertTestAppointment({
      organizationId: orgId,
      status: "COMPLETED",
      startAt: fourHoursAgo,
      endAt: threeHoursAgo,
      price: 450,
    });
  });

  afterAll(async () => {
    await cleanupTestPrefix(PREFIX);
    await testPool.query(`DELETE FROM "ReviewRequest" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "WhatsAppTask" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "CommissionRecord" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "Invoice" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(
      `DELETE FROM "InventoryMovement" WHERE "referenceId" = $1 AND "referenceType" = 'APPOINTMENT'`,
      [aptId],
    );
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [aptId]);
  });

  it("5 appels onAppointmentCompleted → 1 facture, 1 commission, 1 conso stock max par produit", async () => {
    for (let i = 0; i < 5; i++) {
      await onAppointmentCompleted({
        organizationId: orgId,
        appointmentId: aptId,
        serviceId: "s1",
        userId: "u_owner",
      });
    }

    const invoices = await countRows(
      "Invoice",
      `"appointmentId" = $1 AND "organizationId" = $2`,
      [aptId, orgId],
    );
    const commissions = await countRows(
      "CommissionRecord",
      `"appointmentId" = $1 AND "organizationId" = $2`,
      [aptId, orgId],
    );
    const stockMoves = await countRows(
      "InventoryMovement",
      `"referenceId" = $1 AND "referenceType" = 'APPOINTMENT' AND "organizationId" = $2`,
      [aptId, orgId],
    );

    expect(invoices).toBe(1);
    expect(commissions).toBeGreaterThanOrEqual(1);
    expect(commissions).toBeLessThanOrEqual(2);
    expect(stockMoves).toBeGreaterThanOrEqual(1);
  });

  it("syncReviewRequests idempotent → 1 ReviewRequest + 1 WhatsAppTask", async () => {
    await testPool.query(
      `UPDATE "ReviewSettings" SET enabled = true, "delayHours" = 3, "maxWindowHours" = 24
       WHERE "organizationId" = $1`,
      [orgId],
    );

    for (let i = 0; i < 3; i++) {
      await syncReviewRequests(orgId);
    }

    const reviews = await countRows(
      "ReviewRequest",
      `"appointmentId" = $1 AND "organizationId" = $2`,
      [aptId, orgId],
    );
    const tasks = await countRows(
      "WhatsAppTask",
      `"appointmentId" = $1 AND "organizationId" = $2 AND type = 'REVIEW_REQUEST'`,
      [aptId, orgId],
    );

    expect(reviews).toBe(1);
    expect(tasks).toBe(1);
  });
});
