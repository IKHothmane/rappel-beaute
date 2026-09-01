import { Pool } from "pg";
import { hashPassword } from "@/lib/auth/crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function activateAccount(token: string, password: string): Promise<{ email: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      userId: string;
      email: string;
      expiresAt: Date;
      usedAt: Date | null;
    }>(
      `SELECT t."userId", u.email, t."expiresAt", t."usedAt"
       FROM "ActivationToken" t
       JOIN "User" u ON u.id = t."userId"
       WHERE t.token = $1
       FOR UPDATE`,
      [token],
    );

    const row = rows[0];
    if (!row || row.usedAt) throw new Error("TOKEN_INVALID");
    if (row.expiresAt.getTime() < Date.now()) throw new Error("TOKEN_EXPIRED");

    const passwordHash = hashPassword(password);
    await client.query(
      `UPDATE "User" SET "passwordHash" = $1, status = 'ACTIVE', "updatedAt" = NOW() WHERE id = $2`,
      [passwordHash, row.userId],
    );
    await client.query(
      `UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE token = $1`,
      [token],
    );

    await client.query("COMMIT");
    return { email: row.email };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
