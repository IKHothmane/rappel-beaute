import { describe, expect, it, afterAll } from "vitest";
import { getCustomerById, updateCustomer, createCustomer } from "@/lib/db/customers";
import { getSeedOrgId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Soft delete — entités archivées conservées", () => {
  let orgId: string;
  let customerId: string;

  afterAll(async () => {
    if (customerId) {
      await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
    }
  });

  it("Customer archivée : deletedAt défini, invisible via getCustomerById", async () => {
    orgId = await getSeedOrgId();
    const created = await createCustomer(orgId, {
      firstName: "Soft",
      lastName: "Delete",
      phone: `+2126${Math.floor(Math.random() * 1e8)}`,
    });
    customerId = created.id;

    await updateCustomer(customerId, orgId, { archived: true });

    const visible = await getCustomerById(customerId, orgId);
    expect(visible).toBeNull();

    const { rows } = await testPool.query<{ deletedAt: Date | null; status: string }>(
      `SELECT "deletedAt", status::text FROM "Customer" WHERE id = $1`,
      [customerId],
    );
    expect(rows[0].deletedAt).not.toBeNull();
    expect(rows[0].status).toBe("ARCHIVED");
  });

  it("Product utilise deletedAt — pas de DELETE physique", async () => {
    const { rows } = await testPool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'Product' AND column_name = 'deletedAt'`,
    );
    expect(rows.length).toBe(1);
  });
});
