import { createHash, randomBytes } from "crypto";
import { hashPasswordAsync } from "@/lib/auth/crypto";
import { writeAuditLog } from "@/lib/db/audit";
import { pool } from "@/lib/db/pool";
import { bindPublicInstitute } from "@/lib/db/tenant-context";

/** Borne le coût de scrypt sur une entrée hostile. */
const MAX_PASSWORD_LENGTH = 200;

/** Marqueur des jetons stockés hachés : les jetons déjà émis restent en clair et continuent de fonctionner. */
const HASHED_PREFIX = "sha256:";

/**
 * Forme stockée d'un jeton de réinitialisation. Seul le haché est conservé en base :
 * une fuite de la table ne donne pas de lien utilisable. Les lignes antérieures (jetons en clair) restent
 * reconnues par `activateAccount` le temps de la transition : la fonction de purge planifiée
 * (app_purge_expired_auth_data, migration 20261120100000) les remplace sur place par leur haché sans invalider
 * les liens en attente, et supprime les jetons expirés. La branche « clair » pourra alors être retirée.
 */
export function hashActivationToken(token: string): string {
  return `${HASHED_PREFIX}${createHash("sha256").update(token).digest("hex")}`;
}

/**
 * Lien d'activation existant, réutilisé pour la réinitialisation. null si compte inconnu.
 * Un nouveau jeton invalide les précédents du même compte : la ligne du compte est verrouillée, les jetons
 * encore ouverts sont consommés et le nouveau est inséré dans la même transaction (deux demandes simultanées
 * ne laissent jamais deux liens valides).
 */
export async function issuePasswordResetToken(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Même normalisation que l'unicité globale (LOWER(BTRIM(email))). Si plusieurs comptes partagent cet
    // e-mail (doublons historiques), on n'émet rien : le lien pourrait ouvrir le mauvais compte.
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM "User" WHERE LOWER(BTRIM(email)) = $1 AND status = 'ACTIVE' LIMIT 2 FOR UPDATE`,
      [normalized],
    );
    const user = rows.length === 1 ? rows[0] : undefined;
    if (!user) {
      await client.query("ROLLBACK");
      if (rows.length > 1) console.warn("[password-reset] e-mail partagé par plusieurs comptes : aucun lien émis");
      return null;
    }

    await client.query(`UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL`, [
      user.id,
    ]);
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await client.query(
      `INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt")
       VALUES ($1, $2, $3, $4)`,
      [`act_${randomBytes(6).toString("hex")}`, user.id, hashActivationToken(token), expires],
    );
    await client.query("COMMIT");
    return token;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
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

  // Le rôle public n'écrit l'audit de l'institut (AuditLog) que si l'institut est annoncé AVANT l'emprunt de la
  // connexion : on lit donc l'institut du jeton d'abord (lecture seule), sans rien révéler s'il est inconnu.
  const { rows: owner } = await pool.query<{ organizationId: string }>(
    `SELECT u."organizationId" FROM "ActivationToken" t JOIN "User" u ON u.id = t."userId" WHERE t.token = ANY($1::text[]) LIMIT 1`,
    [[hashActivationToken(token), token]],
  );
  if (owner[0]) bindPublicInstitute(owner[0].organizationId);

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

    const passwordHash = await hashPasswordAsync(password);
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
