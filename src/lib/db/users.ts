import { pool } from "@/lib/db/pool";
import { looksLikeEmail, normalizeLoginIdentifier, normalizeLoginPhone } from "@/lib/auth/login-identifier";
import { phoneLoginEnabled } from "@/lib/auth/env";
import {
  burnPasswordCheck,
  checkPasswordUniform,
  generateTemporaryPassword,
  hashPasswordAsync,
  passwordNeedsRehash,
  verifyPasswordAsync,
} from "@/lib/auth/crypto";
import { logger } from "@/lib/logger";
import type { AppSessionUser, SessionUser } from "@/lib/auth/types";
import type { AppRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/db/audit";

/** Borne le coût de scrypt sur une entrée hostile. */
export const MAX_PASSWORD_LENGTH = 200;

type UserRow = {
  id: string;
  email: string | null;
  loginPhone: string | null;
  firstName: string;
  lastName: string;
  role: AppRole;
  passwordHash: string | null;
  organizationId: string;
  orgName: string;
  orgSlug: string;
  userStatus: "ACTIVE" | "DISABLED";
  orgStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  mustChangePassword: boolean;
  sessionVersion: number;
};

type UserSessionState = {
  status: "ACTIVE" | "DISABLED";
  mustChangePassword: boolean;
  sessionVersion: number;
  /** Rôle courant en base : prime sur celui du jeton (valable 30 jours). */
  role: AppRole;
  orgStatus?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
};

/**
 * État courant d'un compte institut. `organizationId` (institut porté par le jeton) restreint la lecture à cet
 * institut : un jeton dont l'institut ne correspond plus à la base ne trouve aucune ligne et vaut une session
 * invalide. Une chaîne vide ne correspond à aucun institut (échec fermé).
 */
export async function getUserSessionState(
  userId: string,
  organizationId?: string,
): Promise<UserSessionState | null> {
  const scoped = organizationId !== undefined;
  const { rows } = await pool.query<{
    status: "ACTIVE" | "DISABLED";
    mustChangePassword: boolean;
    sessionVersion: number;
    role: AppRole;
    orgStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  }>(
    `SELECT u.status, u."mustChangePassword", u."sessionVersion", u.role, o.status AS "orgStatus"
     FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
     WHERE u.id = $1${scoped ? ` AND u."organizationId" = $2` : ""}`,
    scoped ? [userId, organizationId] : [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    status: row.status,
    mustChangePassword: Boolean(row.mustChangePassword),
    sessionVersion: Number(row.sessionVersion) || 0,
    role: row.role,
    orgStatus: row.orgStatus,
  };
}

/**
 * Re-hachage transparent : un haché au format historique ou de coût inférieur est remplacé par le haché courant
 * dès que le mot de passe vient d'être vérifié. Comparaison-échange sur l'ancien haché (un changement de mot de
 * passe concurrent n'est jamais écrasé), sans toucher à sessionVersion : aucune session n'est déconnectée.
 * Ne fait jamais échouer la connexion.
 */
async function upgradePasswordHash(userId: string, oldHash: string, plain: string): Promise<void> {
  try {
    if (!passwordNeedsRehash(oldHash)) return;
    const next = await hashPasswordAsync(plain);
    await pool.query(`UPDATE "User" SET "passwordHash" = $1 WHERE id = $2 AND "passwordHash" = $3`, [
      next,
      userId,
      oldHash,
    ]);
  } catch (error) {
    logger.warn("re-hachage du mot de passe ignoré", {
      route: "db/users",
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  if (typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) return null;
  const normalized = normalizeLoginIdentifier(email);
  // Téléphone désactivé (AUTH_PHONE_LOGIN_ENABLED faux) : loginPhone n'est jamais interrogé et un identifiant qui
  // n'est pas une adresse e-mail est refusé avec le même coût qu'un autre refus.
  const phoneAllowed = phoneLoginEnabled();
  if (!phoneAllowed && !looksLikeEmail(normalized)) {
    await burnPasswordCheck(password);
    return null;
  }
  const phone = phoneAllowed ? normalizeLoginPhone(email) : null;

  const { rows: platformRows } = await pool.query(
    `SELECT id FROM "PlatformUser" WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized],
  );
  if (platformRows.length > 0) {
    // Le compte plateforme est vérifié par authenticatePlatformUser : même coût ici pour ne pas le trahir.
    await burnPasswordCheck(password);
    return null;
  }

  const { rows } = await pool.query<UserRow>(
    `SELECT
      u.id,
      u.email,
      u."loginPhone",
      u."firstName",
      u."lastName",
      u.role,
      u."passwordHash",
      u."organizationId",
      u.status AS "userStatus",
      u."mustChangePassword",
      u."sessionVersion",
      o.name AS "orgName",
      o.slug AS "orgSlug",
      o.status AS "orgStatus"
    FROM "User" u
    JOIN "Organization" o ON o.id = u."organizationId"
    WHERE LOWER(u.email) = $1 OR ($2::text IS NOT NULL AND u."loginPhone" = $2)
    LIMIT 2`,
    [normalized, phone],
  );

  // Compte absent, ambigu, désactivé, institut inactif ou sans mot de passe : opérations factices de même coût
  // qu'un refus réel (une de classe historique et une de classe courante, voir checkPasswordUniform).
  const user = rows.length === 1 ? rows[0] : undefined;
  if (!user || user.userStatus !== "ACTIVE" || user.orgStatus !== "ACTIVE" || !user.passwordHash) {
    await burnPasswordCheck(password);
    return null;
  }
  if (!(await checkPasswordUniform(password, user.passwordHash))) {
    return null;
  }
  await upgradePasswordHash(user.id, user.passwordHash, password);

  return {
    id: user.id,
    email: user.email ?? "",
    loginPhone: user.loginPhone ?? undefined,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    orgName: user.orgName,
    orgSlug: user.orgSlug,
    orgLogoUrl: null,
    scope: "app",
    accountType: "ORGANIZATION",
    mustChangePassword: Boolean(user.mustChangePassword),
    sessionVersion: Number(user.sessionVersion) || 0,
  };
}

/**
 * Reset admin : génère un MDP temporaire, invalidé l'ancien + toutes les sessions.
 * Le clair n'est jamais stocké — renvoyé une seule fois à l'appelant.
 */
export async function adminResetTemporaryPassword(opts: {
  organizationId: string;
  targetUserId: string;
  actor: { id: string; name?: string | null };
}): Promise<{ temporaryPassword: string; email: string; firstName: string; lastName: string }> {
  const { rows: existing } = await pool.query<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  }>(
    `SELECT id, email, "firstName", "lastName", status
     FROM "User"
     WHERE id = $1 AND "organizationId" = $2`,
    [opts.targetUserId, opts.organizationId],
  );

  const user = existing[0];
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.status !== "ACTIVE") throw new Error("USER_DISABLED");

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPasswordAsync(temporaryPassword);

  await pool.query(
    `UPDATE "User"
     SET "passwordHash" = $1,
         "mustChangePassword" = true,
         "sessionVersion" = "sessionVersion" + 1,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,
    [passwordHash, opts.targetUserId, opts.organizationId],
  );

  await writeAuditLog({
    organizationId: opts.organizationId,
    actorId: opts.actor.id,
    actorName: opts.actor.name,
    entityType: "User",
    entityId: user.id,
    action: "ADMIN_PASSWORD_RESET",
    after: {
      mustChangePassword: true,
      temporaryPasswordIssued: true,
    },
  }).catch(() => null);

  return {
    temporaryPassword,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

/**
 * Changement du mot de passe par l'utilisateur connecté.
 *
 * - `mustChangePassword = true` (mot de passe temporaire) : le mot de passe actuel n'est pas demandé.
 * - Sinon : `currentPassword` est obligatoire et vérifié (un cookie volé ne suffit pas à prendre le compte).
 *
 * Lecture verrouillée, mise à jour, `sessionVersion + 1` et audit dans une seule transaction.
 * La session renvoyée porte la nouvelle version : l'appelant ré-émet le cookie courant.
 */
export async function changeOwnPassword(opts: {
  userId: string;
  organizationId: string;
  newPassword: string;
  currentPassword?: string | null;
}): Promise<AppSessionUser> {
  if (typeof opts.newPassword !== "string" || opts.newPassword.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }
  if (opts.newPassword.length > MAX_PASSWORD_LENGTH) {
    throw new Error("PASSWORD_TOO_LONG");
  }

  // Calculé avant la transaction : le verrou de ligne n'est pas tenu pendant le hachage.
  const nextPasswordHash = await hashPasswordAsync(opts.newPassword);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{
      id: string;
      email: string | null;
      loginPhone: string | null;
      firstName: string;
      lastName: string;
      role: AppRole;
      passwordHash: string | null;
      organizationId: string;
      orgName: string;
      orgSlug: string;
      mustChangePassword: boolean;
      sessionVersion: number;
    }>(
      `SELECT
        u.id, u.email, u."loginPhone", u."firstName", u."lastName", u.role, u."passwordHash",
        u."organizationId", u."mustChangePassword", u."sessionVersion",
        o.name AS "orgName", o.slug AS "orgSlug"
       FROM "User" u
       JOIN "Organization" o ON o.id = u."organizationId"
       WHERE u.id = $1 AND u."organizationId" = $2 AND u.status = 'ACTIVE'
       FOR UPDATE OF u`,
      [opts.userId, opts.organizationId],
    );

    const user = rows[0];
    if (!user) throw new Error("USER_NOT_FOUND");

    const mustChange = Boolean(user.mustChangePassword);
    if (!mustChange) {
      const current = opts.currentPassword;
      if (typeof current !== "string" || current.length === 0) {
        throw new Error("CURRENT_PASSWORD_REQUIRED");
      }
      if (
        current.length > MAX_PASSWORD_LENGTH ||
        !user.passwordHash ||
        !(await verifyPasswordAsync(current, user.passwordHash))
      ) {
        throw new Error("CURRENT_PASSWORD_INVALID");
      }
    }

    // Interdit de réutiliser le mot de passe temporaire (ou l'actuel)
    if (user.passwordHash && (await verifyPasswordAsync(opts.newPassword, user.passwordHash))) {
      throw new Error("PASSWORD_REUSE");
    }

    const passwordHash = nextPasswordHash;
    const { rows: updated } = await client.query<{ sessionVersion: number }>(
      `UPDATE "User"
       SET "passwordHash" = $1,
           "mustChangePassword" = false,
           "sessionVersion" = "sessionVersion" + 1,
           "updatedAt" = NOW()
       WHERE id = $2
       RETURNING "sessionVersion"`,
      [passwordHash, opts.userId],
    );

    await writeAuditLog({
      organizationId: opts.organizationId,
      actorId: opts.userId,
      actorName: `${user.firstName} ${user.lastName}`.trim(),
      entityType: "User",
      entityId: opts.userId,
      action: "PASSWORD_CHANGED",
      after: { mustChangePassword: false, verifiedCurrentPassword: !mustChange },
      client,
    });

    await client.query("COMMIT");

    return {
      id: user.id,
      email: user.email ?? "",
      loginPhone: user.loginPhone ?? undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      orgName: user.orgName,
      orgSlug: user.orgSlug,
      orgLogoUrl: null,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: false,
      sessionVersion: Number(updated[0]?.sessionVersion) || user.sessionVersion + 1,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

export type OrgUserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: AppRole;
  status: "ACTIVE" | "DISABLED";
  mustChangePassword: boolean;
  createdAt: string;
};

/** Utilisateurs de l'organisation — organizationId toujours côté serveur / session */
export async function listUsersByOrganization(
  organizationId: string,
): Promise<OrgUserListItem[]> {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: AppRole;
    status: "ACTIVE" | "DISABLED";
    mustChangePassword: boolean;
    createdAt: Date;
  }>(
    `SELECT id, email, "firstName", "lastName", phone, role, status,
            "mustChangePassword", "createdAt"
     FROM "User"
     WHERE "organizationId" = $1
     ORDER BY
       CASE role
         WHEN 'OWNER' THEN 0
         WHEN 'MANAGER' THEN 1
         WHEN 'STAFF' THEN 2
         WHEN 'CASHIER' THEN 3
         ELSE 4
       END,
       "lastName",
       "firstName"`,
    [organizationId],
  );

  return rows.map((r) => ({
    id: r.id,
    email: r.email ?? "",
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    role: r.role,
    status: r.status,
    mustChangePassword: Boolean(r.mustChangePassword),
    createdAt: r.createdAt.toISOString(),
  }));
}
