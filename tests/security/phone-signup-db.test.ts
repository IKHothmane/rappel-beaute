import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool, type PoolClient } from "pg";
import { randomBytes, randomInt } from "crypto";

const context = vi.hoisted(() => ({ client: null as PoolClient | null }));
vi.mock("@/lib/db/pool", () => ({ pool: {
  query: (sql: string, values?: unknown[]) => context.client!.query(sql, values),
  connect: async () => ({
    query: (sql: string, values?: unknown[]) => /^(BEGIN|COMMIT|ROLLBACK)$/.test(sql) ? Promise.resolve({ rows: [] }) : context.client!.query(sql, values),
    release: () => {},
  }),
} }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));

import { createPublicSignup } from "@/lib/db/public-signup";
import { authenticateUser, changeOwnPassword } from "@/lib/db/users";

// Opt-in: all fixtures stay in one outer transaction and are always rolled back.
describe.skipIf(process.env.RUN_PHONE_SIGNUP_DB_TEST !== "1")("Phone signup database round trip", () => {
  let database: Pool;
  beforeAll(async () => {
    database = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8000 });
    context.client = await database.connect();
    await context.client.query("BEGIN");
  });
  afterAll(async () => {
    if (context.client) { await context.client.query("ROLLBACK"); context.client.release(); context.client = null; }
    await database?.end();
  });
  it("creates an email-free owner, logs in by phone and changes the temporary password", async () => {
    const phone = `09${randomInt(10000000, 99999999)}`;
    const account = await createPublicSignup({ personName: "Test Phone Signup", institut: `test_phone_${randomBytes(5).toString("hex")}`, phone, city: "Casablanca", address: "", website: null });
    expect(account.email).toBeNull();
    const user = await authenticateUser(phone, account.temporaryPassword);
    expect(user).toMatchObject({ scope: "app", email: "", loginPhone: phone, mustChangePassword: true });
    if (!user || user.scope !== "app") throw new Error("Expected institute session");
    const password = `Updated${randomBytes(10).toString("hex")}`;
    const updated = await changeOwnPassword({ userId: user.id, organizationId: user.organizationId, newPassword: password });
    expect(updated).toMatchObject({ loginPhone: phone, mustChangePassword: false });
    expect(await authenticateUser(phone, account.temporaryPassword)).toBeNull();
    expect(await authenticateUser(phone, password)).toMatchObject({ id: user.id, mustChangePassword: false });
    await expect(createPublicSignup({ personName: "Duplicate", institut: "Duplicate", phone, city: "Casablanca", address: "", website: null })).rejects.toMatchObject({ code: "PHONE_TAKEN" });
  });
});
