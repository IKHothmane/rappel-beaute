import { Pool } from "pg";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/crypto";
import type { AppSessionUser, SessionUser } from "@/lib/auth/types";
import type { AppRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/db/audit";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type UserRow = {
  id: string;
  email: string;
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

export type UserSessionState = {
  status: "ACTIVE" | "DISABLED";
  mustChangePassword: boolean;
  sessionVersion: number;
};

export async function getUserSessionState(userId: string): Promise<UserSessionState | null> {
  const { rows } = await pool.query<{
    status: "ACTIVE" | "DISABLED";
    mustChangePassword: boolean;
    sessionVersion: number;
  }>(
    `SELECT status, "mustChangePassword", "sessionVersion"
     FROM "User" WHERE id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    status: row.status,
    mustChangePassword: Boolean(row.mustChangePassword),
    sessionVersion: Number(row.sessionVersion) || 0,
  };
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase();

  const { rows: platformRows } = await pool.query(
    `SELECT id FROM "PlatformUser" WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized],
  );
  if (platformRows.length > 0) return null;

  const { rows } = await pool.query<UserRow>(
    `SELECT
      u.id,
      u.email,
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
    WHERE LOWER(u.email) = $1
    LIMIT 2`,
    [normalized],
  );

  if (rows.length !== 1) return null;
  const user = rows[0];
  if (user.userStatus !== "ACTIVE") return null;
  if (user.orgStatus !== "ACTIVE") return null;
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    orgName: user.orgName,
    orgSlug: user.orgSlug,
    scope: "app",
    accountType: "ORGANIZATION",
    mustChangePassword: Boolean(user.mustChangePassword),
    sessionVersion: Number(user.sessionVersion) || 0,
  };
}

export async function setUserPasswordHash(userId: string, passwordHash: string) {
  await pool.query(`UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2`, [
    passwordHash,
    userId,
  ]);
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
  const passwordHash = hashPassword(temporaryPassword);

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
 * Changement obligatoire (ou volontaire) du mot de passe par l'utilisateur connecté.
 */
export async function changeOwnPassword(opts: {
  userId: string;
  organizationId: string;
  newPassword: string;
}): Promise<AppSessionUser> {
  if (opts.newPassword.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const { rows } = await pool.query<{
    id: string;
    email: string;
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
      u.id, u.email, u."firstName", u."lastName", u.role, u."passwordHash",
      u."organizationId", u."mustChangePassword", u."sessionVersion",
      o.name AS "orgName", o.slug AS "orgSlug"
     FROM "User" u
     JOIN "Organization" o ON o.id = u."organizationId"
     WHERE u.id = $1 AND u."organizationId" = $2 AND u.status = 'ACTIVE'`,
    [opts.userId, opts.organizationId],
  );

  const user = rows[0];
  if (!user) throw new Error("USER_NOT_FOUND");

  // Interdit de réutiliser le mot de passe temporaire (ou l'actuel)
  if (user.passwordHash && verifyPassword(opts.newPassword, user.passwordHash)) {
    throw new Error("PASSWORD_REUSE");
  }

  const passwordHash = hashPassword(opts.newPassword);
  const { rows: updated } = await pool.query<{ sessionVersion: number }>(
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
    after: { mustChangePassword: false },
  }).catch(() => null);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    orgName: user.orgName,
    orgSlug: user.orgSlug,
    scope: "app",
    accountType: "ORGANIZATION",
    mustChangePassword: false,
    sessionVersion: Number(updated[0]?.sessionVersion) || user.sessionVersion + 1,
  };
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
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    role: r.role,
    status: r.status,
    mustChangePassword: Boolean(r.mustChangePassword),
    createdAt: r.createdAt.toISOString(),
  }));
}
