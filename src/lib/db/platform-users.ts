import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import {
  burnPasswordCheck,
  checkPasswordUniform,
  hashPasswordAsync,
  passwordNeedsRehash,
  verifyPasswordAsync,
} from "@/lib/auth/crypto";
import { logger } from "@/lib/logger";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { pool } from "@/lib/db/pool";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { withTransaction } from "@/lib/db/transaction";

type PlatformUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN";
  status: "ACTIVE" | "DISABLED";
  passwordHash: string | null;
  sessionVersion: number | null;
};

export const PLATFORM_MIN_PASSWORD_LENGTH = 8;
export const PLATFORM_MAX_PASSWORD_LENGTH = 200;

function toSession(user: PlatformUserRow): PlatformSessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    scope: "platform",
    accountType: "PLATFORM",
    sessionVersion: Number(user.sessionVersion ?? 0),
  };
}

export async function authenticatePlatformUser(
  email: string,
  password: string,
): Promise<PlatformSessionUser | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<PlatformUserRow>(
    `SELECT id, email, "firstName", "lastName", role, status, "passwordHash", "sessionVersion"
     FROM "PlatformUser"
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalized],
  );

  const user = rows[0];
  // Compte absent, désactivé ou sans mot de passe : vérification factice de même coût (aucune différence de durée).
  if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
    await burnPasswordCheck(password);
    return null;
  }
  if (!(await checkPasswordUniform(password, user.passwordHash))) return null;

  // Re-hachage transparent (coût relevé), sans toucher à sessionVersion ; n'échoue jamais la connexion.
  try {
    if (passwordNeedsRehash(user.passwordHash)) {
      const upgraded = await hashPasswordAsync(password);
      await pool.query(`UPDATE "PlatformUser" SET "passwordHash" = $1 WHERE id = $2 AND "passwordHash" = $3`, [
        upgraded,
        user.id,
        user.passwordHash,
      ]);
    }
  } catch (error) {
    logger.warn("re-hachage du mot de passe plateforme ignoré", {
      route: "db/platform-users",
      error: error instanceof Error ? error.name : "unknown",
    });
  }

  return toSession(user);
}

/**
 * État courant d'un administrateur actif (null si absent ou désactivé). Une seule requête :
 * statut, rôle et version de session servent à valider le jeton signé.
 */
export async function getPlatformUserById(id: string): Promise<PlatformSessionUser | null> {
  const { rows } = await pool.query<PlatformUserRow>(
    `SELECT id, email, "firstName", "lastName", role, status, "passwordHash", "sessionVersion"
     FROM "PlatformUser" WHERE id = $1 LIMIT 1`,
    [id],
  );
  const user = rows[0];
  if (!user || user.status !== "ACTIVE") return null;
  return toSession(user);
}

export function newPlatformId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

/**
 * Changement de mot de passe par l'administrateur lui-même. Vérification, nouveau hash,
 * révocation des autres sessions (sessionVersion + 1) et audit forment une seule transaction ;
 * la ligne est verrouillée, donc deux changements concurrents ne passent pas avec le même
 * mot de passe actuel. Retourne la nouvelle version pour ré-émettre le cookie de l'appelant.
 */
export async function changePlatformUserPassword(input: {
  id: string;
  currentPassword: string;
  newPassword: string;
  platformUserName: string;
}): Promise<{ sessionVersion: number }> {
  if (input.newPassword.length < PLATFORM_MIN_PASSWORD_LENGTH) throw new Error("WEAK_PASSWORD");
  if (
    input.newPassword.length > PLATFORM_MAX_PASSWORD_LENGTH ||
    input.currentPassword.length > PLATFORM_MAX_PASSWORD_LENGTH
  ) {
    throw new Error("PASSWORD_TOO_LONG");
  }
  const nextHash = await hashPasswordAsync(input.newPassword);

  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      passwordHash: string | null;
      status: "ACTIVE" | "DISABLED";
    }>(`SELECT "passwordHash", status FROM "PlatformUser" WHERE id = $1 FOR UPDATE`, [input.id]);
    const current = rows[0];
    if (!current || current.status !== "ACTIVE") throw new Error("NOT_FOUND");
    if (!current.passwordHash || !(await verifyPasswordAsync(input.currentPassword, current.passwordHash))) {
      throw new Error("BAD_PASSWORD");
    }

    const updated = await client.query<{ sessionVersion: number }>(
      `UPDATE "PlatformUser"
       SET "passwordHash" = $1, "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING "sessionVersion"`,
      [nextHash, input.id],
    );
    await writePlatformAuditLog({
      client,
      platformUserId: input.id,
      platformUserName: input.platformUserName,
      entityType: "PlatformUser",
      entityId: input.id,
      action: "UPDATE",
      after: { passwordChanged: true, otherSessionsRevoked: true },
    });
    return { sessionVersion: Number(updated.rows[0]?.sessionVersion ?? 0) };
  });
}

async function lockPlatformUser(client: PoolClient, userId: string) {
  const { rows } = await client.query<{ status: "ACTIVE" | "DISABLED"; email: string }>(
    `SELECT status, email FROM "PlatformUser" WHERE id = $1 FOR UPDATE`,
    [userId],
  );
  if (!rows[0]) throw new Error("NOT_FOUND");
  return rows[0];
}

function actorName(actor: PlatformSessionUser) {
  return `${actor.firstName} ${actor.lastName}`.trim();
}

/**
 * Active ou désactive un administrateur plateforme. La désactivation révoque ses sessions
 * (sessionVersion + 1) dans la même transaction que le statut et l'audit. Le dernier
 * administrateur actif ne peut pas être désactivé.
 */
export async function setPlatformUserStatus(
  actor: PlatformSessionUser,
  userId: string,
  status: "ACTIVE" | "DISABLED",
): Promise<void> {
  if (status !== "ACTIVE" && status !== "DISABLED") throw new Error("INVALID_INPUT");
  await withTransaction(async (client) => {
    const user = await lockPlatformUser(client, userId);
    if (user.status === status) return; // idempotent : ni version ni audit en double
    if (status === "DISABLED") {
      const { rows } = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM "PlatformUser" WHERE status = 'ACTIVE' AND id <> $1`,
        [userId],
      );
      if (Number(rows[0]?.n ?? 0) < 1) throw new Error("LAST_ADMIN");
    }
    await client.query(
      `UPDATE "PlatformUser"
       SET status = $2::"PlatformUserStatus",
           "sessionVersion" = "sessionVersion" + CASE WHEN $2::text = 'DISABLED' THEN 1 ELSE 0 END,
           "updatedAt" = NOW()
       WHERE id = $1`,
      [userId, status],
    );
    await writePlatformAuditLog({
      client,
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      entityType: "PlatformUser",
      entityId: userId,
      action: status === "DISABLED" ? "PLATFORM_USER_DISABLED" : "PLATFORM_USER_REACTIVATED",
      before: { status: user.status },
      after: { status },
    });
  });
}

/**
 * Réinitialisation du mot de passe d'un administrateur par un autre : nouveau hash et
 * révocation de toutes ses sessions, avec l'audit, dans une seule transaction.
 */
export async function resetPlatformUserPassword(
  actor: PlatformSessionUser,
  userId: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < PLATFORM_MIN_PASSWORD_LENGTH) throw new Error("WEAK_PASSWORD");
  if (newPassword.length > PLATFORM_MAX_PASSWORD_LENGTH) throw new Error("PASSWORD_TOO_LONG");
  const nextHash = await hashPasswordAsync(newPassword);
  await withTransaction(async (client) => {
    const user = await lockPlatformUser(client, userId);
    if (user.status !== "ACTIVE") throw new Error("USER_DISABLED");
    await client.query(
      `UPDATE "PlatformUser"
       SET "passwordHash" = $2, "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW()
       WHERE id = $1`,
      [userId, nextHash],
    );
    await writePlatformAuditLog({
      client,
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      entityType: "PlatformUser",
      entityId: userId,
      action: "PLATFORM_USER_PASSWORD_RESET",
      after: { passwordReset: true, sessionsRevoked: true },
    });
  });
}
