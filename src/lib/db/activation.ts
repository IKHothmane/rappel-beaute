import { createHash, randomBytes } from "crypto";
import { hashPassword } from "@/lib/auth/crypto";
import { writeAuditLog } from "@/lib/db/audit";
import { pool } from "@/lib/db/pool";

/** Borne le coût de scrypt sur une entrée hostile. */
const MAX_PASSWORD_LENGTH = 200;

/** Marqueur des jetons stockés hachés : les jetons déjà émis restent en clair et continuent de fonctionner. */
const HASHED_PREFIX = "sha256:";

/**
 * Forme stockée d'un jeton de réinitialisation. Seul le haché est conservé en base :
 * une fuite de la table ne donne pas de lien utilisable. Aucune migration : la colonne `token`
 * est un texte unique, et les lignes antérieures (clair, émises aussi par la création d'institut)
 * restent reconnues par `activateAccount`.
 */
export function hashActivationToken(token: string): string {
  return `${HASHED_PREFIX}${createHash("sha256").update(token).digest("hex")}`;
}

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
    [`act_${randomBytes(6).toString("hex")}`, user.id, hashActivationToken(token), expires],
  );
  return token;
}

export async function activateAccount(token: string, password: string): Promise<{ email: string }> {
  // Un haché copié depuis la base ne doit jamais être accepté comme jeton.
  if (
    typeof token !== "string" ||
    !token ||
    token.startsWith(HASHED_PREFIX) ||
    typeof password !== "string" ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new Error("TOKEN_INVALID");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Haché (jetons récents) ou clair (jetons émis avant ce changement).
    const { rows } = await client.query<{
      id: string;
      userId: string;
      organizationId: string;
      email: string;
      userStatus: string;
      expiresAt: Date;
      usedAt: Date | null;
    }>(
      `SELECT t.id, t."userId", u."organizationId", u.email, u.status AS "userStatus",
              t."expiresAt", t."usedAt"
       FROM "ActivationToken" t
       JOIN "User" u ON u.id = t."userId"
       WHERE t.token = ANY($1::text[])
       FOR UPDATE`,
      [[hashActivationToken(token), token]],
    );

    const row = rows[0];
    if (!row || row.usedAt) throw new Error("TOKEN_INVALID");
    if (row.expiresAt.getTime() < Date.now()) throw new Error("TOKEN_EXPIRED");
    // Un jeton ne réactive jamais un compte désactivé.
    if (row.userStatus === "DISABLED") throw new Error("TOKEN_INVALID");

    const passwordHash = hashPassword(password);
    const { rowCount } = await client.query(
      `UPDATE "User"
       SET "passwordHash" = $1,
           "sessionVersion" = "sessionVersion" + 1,
           "updatedAt" = NOW()
       WHERE id = $2 AND status <> 'DISABLED'`,
      [passwordHash, row.userId],
    );
    if (!rowCount) throw new Error("TOKEN_INVALID");

    // Ce jeton et tout autre jeton en attente du même compte sont consommés.
    await client.query(
      `UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL`,
      [row.userId],
    );

    await writeAuditLog({
      organizationId: row.organizationId,
      actorId: row.userId,
      entityType: "User",
      entityId: row.userId,
      action: "PASSWORD_RESET_BY_TOKEN",
      after: { sessionsInvalidated: true },
      client,
    });

    await client.query("COMMIT");
    return { email: row.email };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => null);
    throw e;
  } finally {
    client.release();
  }
}
