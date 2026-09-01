import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getAppointmentById } from "@/lib/db/appointments";
import { getCustomerById } from "@/lib/db/customers";
import { getInvoiceById } from "@/lib/db/invoices";
import {
  ensureSecondOrg,
  getSeedOrgId,
  insertTestAppointment,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Multi-tenant — isolation organizationId", () => {
  let orgA: string;
  let orgB: string;
  let aptId: string;

  beforeAll(async () => {
    orgA = await getSeedOrgId();
    orgB = await ensureSecondOrg();
    aptId = await insertTestAppointment({ organizationId: orgA });
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [aptId]);
  });

  it("Institut A ne peut pas lire un RDV de l'institut A via org B", async () => {
    const fromA = await getAppointmentById(aptId, orgA);
    const fromB = await getAppointmentById(aptId, orgB);
    expect(fromA).not.toBeNull();
    expect(fromB).toBeNull();
  });

  it("Institut B ne peut pas lire une cliente seed de l'institut A", async () => {
    const customer = await getCustomerById("c1", orgB);
    expect(customer).toBeNull();
  });

  it("Facture liée au RDV est invisible depuis org B", async () => {
    const { rows } = await testPool.query<{ id: string }>(
      `SELECT id FROM "Invoice" WHERE "appointmentId" = $1 AND "organizationId" = $2 LIMIT 1`,
      [aptId, orgA],
    );
    if (!rows[0]) return;
    const invoice = await getInvoiceById(orgB, rows[0].id);
    expect(invoice).toBeNull();
  });

  it("INSERT cross-tenant avec organizationId explicite reste isolé", async () => {
    const custId = testId("test_cust_b");
    await testPool.query(
      `INSERT INTO "Customer" (
        id, "organizationId", "firstName", "lastName", phone, status, "updatedAt"
      ) VALUES ($1,$2,'Test','B','+212600000099','ACTIVE',NOW())`,
      [custId, orgB],
    );
    const cross = await getCustomerById(custId, orgA);
    expect(cross).toBeNull();
    await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [custId]);
  });
});
