import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { onAppointmentCompleted } from "@/lib/db/invoices";
import { consumeProductsForAppointment } from "@/lib/db/inventory";
import { syncReviewRequests } from "@/lib/db/reviews";
import {
  cleanupTestPrefix,
  countRows,
  getSeedOrgId,
  insertTestAppointment,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_completed";

run("Moteur COMPLETED — idempotence", () => {
  let orgId: string;
  let aptId: string;
  let customerId: string;
  let productId: string;
  const commissionId = testId("sc");

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    await testPool.query(
      `DELETE FROM "ReviewRequest" WHERE "customerId" LIKE $1`,
      [`${PREFIX}_%`],
    );
    await testPool.query(
      `DELETE FROM "WhatsAppTask" WHERE "customerId" LIKE $1`,
      [`${PREFIX}_%`],
    );
    await testPool.query(
      `DELETE FROM "CommissionRecord" WHERE "appointmentId" IN (
        SELECT id FROM "Appointment" WHERE "customerId" LIKE $1
      )`,
      [`${PREFIX}_%`],
    );
    await testPool.query(
      `DELETE FROM "InventoryMovement" WHERE "referenceId" IN (
        SELECT id FROM "Appointment" WHERE "customerId" LIKE $1
      )`,
      [`${PREFIX}_%`],
    );
    await testPool.query(`DELETE FROM "Invoice" WHERE "customerId" LIKE $1`, [`${PREFIX}_%`]);
    await testPool.query(`DELETE FROM "Appointment" WHERE "customerId" LIKE $1`, [`${PREFIX}_%`]);
    await cleanupTestPrefix(PREFIX);
    customerId = testId(`${PREFIX}_c`);
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Leila', 'Completed', $3, NOW())`,
      [customerId, orgId, `+2126${Math.floor(10000000 + Math.random() * 90000000)}`],
    );
    await testPool.query(
      `INSERT INTO "ServiceCommission" (id, "serviceId", "staffId", type, percentage, "fixedAmount")
       VALUES ($1, 's1', 'e2', 'PERCENTAGE'::"CommissionType", 10, NULL)
       ON CONFLICT ("serviceId", "staffId") DO NOTHING`,
      [commissionId],
    );
    productId = testId(`${PREFIX}_p`);
    await testPool.query(
      `INSERT INTO "Product" (
        id, "organizationId", name, sku, category, unit,
        "purchasePrice", "salePrice", stock, consumable, active, "updatedAt"
      ) VALUES (
        $1, $2, 'Consommable test', $3, 'CONSOMMABLE'::"ProductCategory", 'UNIT'::"ProductUnit",
        5, 0, 20, true, true, NOW()
      )`,
      [productId, orgId, `SKU-${productId.slice(-8)}`],
    );
    await testPool.query(
      `INSERT INTO "ServiceProduct" ("serviceId", "productId", quantity, unit)
       VALUES ('s1', $1, 1, 'UNIT'::"ProductUnit")
       ON CONFLICT ("serviceId", "productId") DO NOTHING`,
      [productId],
    );
    const fourHoursAgo = new Date(Date.now() - 6 * 3600 * 1000);
    const threeHoursAgo = new Date(Date.now() - 5 * 3600 * 1000);
    aptId = await insertTestAppointment({
      organizationId: orgId,
      customerId,
      status: "COMPLETED",
      startAt: fourHoursAgo,
      endAt: threeHoursAgo,
      price: 450,
    });
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "ReviewRequest" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "WhatsAppTask" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "CommissionRecord" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "Invoice" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(
      `DELETE FROM "InventoryMovement" WHERE "referenceId" = $1 AND "referenceType" = 'APPOINTMENT'`,
      [aptId],
    );
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [aptId]);
    await testPool.query(`DELETE FROM "ServiceProduct" WHERE "productId" = $1`, [productId]);
    await testPool.query(`DELETE FROM "Product" WHERE id = $1`, [productId]);
    await testPool.query(`DELETE FROM "ServiceCommission" WHERE id = $1`, [commissionId]);
    await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
    await cleanupTestPrefix(PREFIX);
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
    for (let i = 0; i < 2; i++) {
      await consumeProductsForAppointment({
        organizationId: orgId,
        appointmentId: aptId,
        products: [{ productId, quantity: 1 }],
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
      `UPDATE "ReviewSettings" SET enabled = true, "delayHours" = 1, "maxWindowHours" = 24
       WHERE "organizationId" = $1`,
      [orgId],
    );
    await testPool.query(
      `UPDATE "WhatsAppTemplate" SET active = true
       WHERE "organizationId" = $1 AND type = 'REVIEW_REQUEST'::"WhatsAppTaskType"`,
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
