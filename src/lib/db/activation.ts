import { randomBytes } from "crypto";
import { Pool } from "pg";
import { hashPassword } from "@/lib/auth/crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Lien d'activation existant, réutilisé pour la réinitialisation. null si compte inconnu. */
export async function issuePasswordResetToken(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM "User" WHERE LOWER(email) = $1 AND status = 'ACTIVE' LIMIT 1`,
    [normalized],
  );
  const user = rows[0];
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt")
     VALUES ($1, $2, $3, $4)`,
    [`act_${randomBytes(6).toString("hex")}`, user.id, token, expires],
  );
  return token;
}

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
