import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  assertCustomerInOrg,
  createCustomerNote,
  deleteCustomerNote,
  getCustomer360Stats,
  getCustomerTimeline,
  listCustomerNotes,
  updateCustomerNote,
} from "@/lib/db/customer-360";
import { getCustomerById } from "@/lib/db/customers";
import { canReadFeature, getFeatureAccess } from "@/lib/rbac";
import {
  ensureSecondOrg,
  getSeedOrgId,
  insertTestAppointment,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

describe("41.21 — Cliente 360° (unit)", () => {
  it("RBAC customers — OWNER write, STAFF limited, CASHIER read", () => {
    expect(canReadFeature("OWNER", "customers")).toBe(true);
    expect(getFeatureAccess("STAFF", "customers")).toBe("limited");
    expect(getFeatureAccess("CASHIER", "customers")).toBe("read");
    expect(getFeatureAccess("ACCOUNTANT", "customers")).toBe("read");
  });
});

run("41.21 — Cliente 360° PostgreSQL", () => {
  let orgA: string;
  let orgB: string;
  let customerId: string;
  let noteId: string;

  beforeAll(async () => {
    orgA = await getSeedOrgId();
    orgB = await ensureSecondOrg();
    customerId = testId("c360");

    await testPool.query(
      `INSERT INTO "Customer" (
        id, "organizationId", "firstName", "lastName", phone, status,
        "marketingWhatsapp", "updatedAt"
      ) VALUES ($1,$2,'Nadia','360','0661987654','ACTIVE',true,NOW())`,
      [customerId, orgA],
    );

    // RDV COMPLETED pour LTV / visites
    const end = new Date(Date.now() - 2 * 86_400_000);
    const start = new Date(end.getTime() - 3600_000);
    const aptId = await insertTestAppointment({
      organizationId: orgA,
      customerId,
      status: "COMPLETED",
      startAt: start,
      endAt: end,
      price: 450,
    });

    await testPool.query(
      `INSERT INTO "Payment" (
        id, "organizationId", "customerId", "appointmentId",
        amount, method, kind, status, "paidAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,450,'CASH'::"PaymentMethod",'PAYMENT'::"PaymentKind",
        'COMPLETED'::"PaymentStatus",NOW(),NOW()
      )`,
      [testId("pay360"), orgA, customerId, aptId],
    );

    // NO_SHOW + CANCELLED pour compteurs
    await insertTestAppointment({
      organizationId: orgA,
      customerId,
      status: "NO_SHOW",
      startAt: new Date(Date.now() - 10 * 86_400_000),
      price: 200,
    });
    await insertTestAppointment({
      organizationId: orgA,
      customerId,
      status: "CANCELLED",
      startAt: new Date(Date.now() - 12 * 86_400_000),
      price: 150,
    });
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "CustomerNote" WHERE "customerId" = $1`, [customerId]);
    await testPool.query(`DELETE FROM "Payment" WHERE "customerId" = $1`, [customerId]);
    await testPool.query(`DELETE FROM "Appointment" WHERE "customerId" = $1`, [customerId]);
    await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
  });

  it("isolation — org B ne voit pas la cliente A", async () => {
    expect(await getCustomerById(customerId, orgB)).toBeNull();
    expect(await assertCustomerInOrg(customerId, orgB)).toBe(false);
    expect(await getCustomer360Stats(customerId, orgB)).toBeNull();
    expect(await getCustomerTimeline(customerId, orgB)).toBeNull();
  });

  it("cliente inexistante → null / 404 path", async () => {
    expect(await getCustomerById("cust_does_not_exist", orgA)).toBeNull();
    expect(await getCustomer360Stats("cust_does_not_exist", orgA)).toBeNull();
  });

  it("calcul LTV (paiements nets)", async () => {
    const stats = await getCustomer360Stats(customerId, orgA);
    expect(stats).toBeTruthy();
    expect(stats!.lifetimeNetRevenue).toBe(450);
  });

  it("calcul visites + panier moyen", async () => {
    const stats = await getCustomer360Stats(customerId, orgA);
    expect(stats!.visits).toBeGreaterThanOrEqual(1);
    expect(stats!.averageTicket).toBe(450);
    expect(stats!.noShowCount).toBeGreaterThanOrEqual(1);
    expect(stats!.cancellationCount).toBeGreaterThanOrEqual(1);
    expect(stats!.lastVisitAt).toBeTruthy();
  });

  it("timeline réelle non vide", async () => {
    const timeline = await getCustomerTimeline(customerId, orgA);
    expect(timeline).toBeTruthy();
    expect(timeline!.length).toBeGreaterThan(0);
    expect(timeline!.some((e) => e.kind === "APPOINTMENT")).toBe(true);
    expect(timeline!.some((e) => e.kind === "PAYMENT")).toBe(true);
  });

  it("notes CRUD + audit", async () => {
    const created = await createCustomerNote(
      customerId,
      orgA,
      { content: "Préfère cabine calme" },
      { id: "u_owner", name: "Owner" },
    );
    expect(created?.content).toBe("Préfère cabine calme");
    noteId = created!.id;

    const listed = await listCustomerNotes(customerId, orgA);
    expect(listed!.some((n) => n.id === noteId)).toBe(true);

    const updated = await updateCustomerNote(
      noteId,
      customerId,
      orgA,
      { content: "Préfère cabine 2" },
      { id: "u_owner", name: "Owner" },
    );
    expect(updated?.content).toBe("Préfère cabine 2");

    const { rows: audits } = await testPool.query<{ action: string }>(
      `SELECT action FROM "AuditLog"
       WHERE "organizationId" = $1 AND "entityType" = 'CustomerNote' AND "entityId" = $2
       ORDER BY "createdAt"`,
      [orgA, noteId],
    );
    expect(audits.some((a) => a.action === "CREATE")).toBe(true);
    expect(audits.some((a) => a.action === "UPDATE")).toBe(true);

    const deleted = await deleteCustomerNote(noteId, customerId, orgA, {
      id: "u_owner",
      name: "Owner",
    });
    expect(deleted).toBe(true);

    const after = await listCustomerNotes(customerId, orgA);
    expect(after!.some((n) => n.id === noteId)).toBe(false);

    const { rows: delAudits } = await testPool.query<{ action: string }>(
      `SELECT action FROM "AuditLog"
       WHERE "entityType" = 'CustomerNote' AND "entityId" = $1 AND action = 'DELETE'`,
      [noteId],
    );
    expect(delAudits.length).toBeGreaterThanOrEqual(1);
  });

  it("impossible de modifier une note d'un autre institut", async () => {
    const n = await createCustomerNote(
      customerId,
      orgA,
      { content: "Note isolée" },
      { id: "u_owner" },
    );
    const patched = await updateCustomerNote(
      n!.id,
      customerId,
      orgB,
      { content: "Hack" },
      { id: "u_owner" },
    );
    expect(patched).toBeNull();

    const deleted = await deleteCustomerNote(n!.id, customerId, orgB, {
      id: "u_owner",
    });
    expect(deleted).toBe(false);

    await deleteCustomerNote(n!.id, customerId, orgA, { id: "u_owner" });
  });

  it("cliente soft-deleted → invisible", async () => {
    const ghost = testId("c360del");
    await testPool.query(
      `INSERT INTO "Customer" (
        id, "organizationId", "firstName", "lastName", phone, status,
        "deletedAt", "updatedAt"
      ) VALUES ($1,$2,'Ghost','Del','0661000001','ARCHIVED',NOW(),NOW())`,
      [ghost, orgA],
    );
    expect(await getCustomerById(ghost, orgA)).toBeNull();
    expect(await getCustomer360Stats(ghost, orgA)).toBeNull();
    await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [ghost]);
  });
});
