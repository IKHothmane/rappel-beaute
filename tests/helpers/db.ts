import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";

export const testPool = new Pool({ connectionString: process.env.DATABASE_URL });

export function testId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export async function getSeedOrgId(slug = "institut-royal"): Promise<string> {
  const { rows } = await testPool.query<{ id: string }>(
    `SELECT id FROM "Organization" WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  if (!rows[0]) {
    throw new Error(`Organisation seed « ${slug} » introuvable — exécutez npm run db:seed`);
  }
  return rows[0].id;
}

export async function ensureSecondOrg(): Promise<string> {
  const id = "org_test_stabilization_b";
  await testPool.query(
    `INSERT INTO "Organization" (id, name, slug, "updatedAt")
     VALUES ($1, 'Institut Test B', 'institut-test-b', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [id],
  );
  return id;
}

export async function insertTestAppointment(opts: {
  organizationId: string;
  customerId?: string;
  serviceId?: string;
  staffId?: string;
  resourceId?: string | null;
  price?: number;
  status?: string;
  startAt?: Date;
  endAt?: Date;
}): Promise<string> {
  const id = testId("test_apt");
  const dayOffset = Math.floor(Math.random() * 200) + 30;
  const start =
    opts.startAt ??
    new Date(Date.now() + dayOffset * 24 * 3600 * 1000 + Math.random() * 3600 * 1000);
  const end = opts.endAt ?? new Date(start.getTime() + 60 * 60 * 1000);
  await testPool.query(
    `INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
      "startAt", "endAt", price, status, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::"AppointmentStatus",NOW())`,
    [
      id,
      opts.organizationId,
      opts.customerId ?? "c1",
      opts.serviceId ?? "s1",
      opts.staffId ?? "e2",
      opts.resourceId !== undefined ? opts.resourceId : "r2",
      start,
      end,
      opts.price ?? 450,
      opts.status ?? "CONFIRMED",
    ],
  );
  return id;
}

export async function countRows(
  table: string,
  where: string,
  params: unknown[],
): Promise<number> {
  const { rows } = await testPool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "${table}" WHERE ${where}`,
    params,
  );
  return parseInt(rows[0]?.c ?? "0", 10);
}

export async function cleanupAppointmentsOnDate(
  organizationId: string,
  date: string,
): Promise<void> {
  await testPool.query(
    `DELETE FROM "Appointment"
     WHERE "organizationId" = $1
       AND "startAt"::date = $2::date
       AND (id ~ '^apt_' OR source = 'ONLINE_BOOKING'::"AppointmentSource")`,
    [organizationId, date],
  );
}

export async function cleanupTestPrefix(prefix: string): Promise<void> {
  const like = `${prefix}_%`;
  const client = await testPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM "ReviewRequest" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "WhatsAppTask" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "CommissionAdjustment" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "CommissionRecord" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "GiftCardTransaction" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "GiftCard" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "LoyaltyTransaction" WHERE "idempotencyKey" LIKE $1`, [
      `test:${prefix}:%`,
    ]);
    await client.query(`DELETE FROM "InventoryMovement" WHERE "idempotencyKey" LIKE $1`, [
      `test:${prefix}:%`,
    ]);
    await client.query(`DELETE FROM "CashRegisterTransaction" WHERE "idempotencyKey" LIKE $1`, [
      like,
    ]);
    await client.query(`DELETE FROM "Payment" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "Invoice" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "Appointment" WHERE id LIKE $1`, [like]);
    await client.query(`DELETE FROM "AuditLog" WHERE "entityId" LIKE $1`, [like]);
    await client.query(`DELETE FROM "Customer" WHERE id LIKE $1`, [like]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export function isExclusionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23P01"
  );
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await testPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
