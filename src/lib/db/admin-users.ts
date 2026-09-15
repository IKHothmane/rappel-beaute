import { Pool } from "pg";
import { hashPassword } from "@/lib/auth/crypto";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/db/audit";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import type {
  PlatformOrgUser,
  PlatformUsersKpis,
} from "@/types/platform";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ORG_ROLES = ["OWNER", "MANAGER", "STAFF", "CASHIER", "ACCOUNTANT"] as const;
export type OrgUserRole = (typeof ORG_ROLES)[number];

function actorName(actor: PlatformSessionUser) {
  return `${actor.firstName} ${actor.lastName}`.trim();
}

async function auditSensitive(
  actor: PlatformSessionUser,
  opts: {
    organizationId: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
  },
) {
  const name = actorName(actor);
  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: name,
    organizationId: opts.organizationId,
    entityType: "User",
    entityId: opts.entityId,
    action: opts.action,
    before: opts.before,
    after: opts.after,
  });
  await writeAuditLog({
    organizationId: opts.organizationId,
    actorId: actor.id,
    actorName: `Super Admin · ${name}`,
    entityType: "User",
    entityId: opts.entityId,
    action: opts.action,
    before: opts.before,
    after: opts.after,
  }).catch(() => null);
}

export function isOrgUserRole(role: string): role is OrgUserRole {
  return (ORG_ROLES as readonly string[]).includes(role);
}

export async function getPlatformUsersKpis(): Promise<PlatformUsersKpis> {
  const { rows } = await pool.query<{
    total: string;
    active: string;
    disabled: string;
    month: string;
  }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE status = 'DISABLED')::text AS disabled,
      COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', NOW()))::text AS month
     FROM "User"`,
  );
  const { rows: platform } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "PlatformUser" WHERE status = 'ACTIVE'`,
  );
  const total = parseInt(rows[0]?.total ?? "0", 10) + parseInt(platform[0]?.c ?? "0", 10);
  const active = parseInt(rows[0]?.active ?? "0", 10) + parseInt(platform[0]?.c ?? "0", 10);
  return {
    total,
    active,
    disabled: parseInt(rows[0]?.disabled ?? "0", 10),
    thisMonth: parseInt(rows[0]?.month ?? "0", 10),
  };
}

export async function listPlatformWideUsers(opts?: {
  search?: string;
  role?: string;
  status?: string;
  organizationId?: string;
  limit?: number;
}): Promise<PlatformOrgUser[]> {
  const limit = Math.min(opts?.limit ?? 200, 500);
  const params: unknown[] = [];
  const conds: string[] = [];

  if (opts?.search?.trim()) {
    params.push(`%${opts.search.trim().toLowerCase()}%`);
    conds.push(
      `(LOWER(u.email) LIKE $${params.length}
        OR LOWER(u."firstName") LIKE $${params.length}
        OR LOWER(u."lastName") LIKE $${params.length}
        OR LOWER(o.name) LIKE $${params.length})`,
    );
  }
  if (opts?.role && opts.role !== "SUPER_ADMIN") {
    params.push(opts.role);
    conds.push(`u.role = $${params.length}::"UserRole"`);
  }
  if (opts?.status) {
    params.push(opts.status);
    conds.push(`u.status = $${params.length}::"OrgUserStatus"`);
  }
  if (opts?.organizationId) {
    params.push(opts.organizationId);
    conds.push(`u."organizationId" = $${params.length}`);
  }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  params.push(limit);

  const includeOrgUsers = opts?.role !== "SUPER_ADMIN";
  const includePlatform =
    !opts?.organizationId &&
    (!opts?.role || opts.role === "SUPER_ADMIN") &&
    (!opts?.status || opts.status === "ACTIVE");

  const orgUsers: PlatformOrgUser[] = [];
  if (includeOrgUsers) {
    const { rows } = await pool.query<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      status: string;
      organizationId: string;
      organizationName: string;
      createdAt: Date;
      mustChangePassword: boolean;
      lastLoginAt: Date | null;
    }>(
      `SELECT u.id, u.email, u."firstName", u."lastName", u.role::text, u.status::text,
              u."organizationId", o.name AS "organizationName", u."createdAt",
              u."mustChangePassword", login."createdAt" AS "lastLoginAt"
       FROM "User" u
       JOIN "Organization" o ON o.id = u."organizationId"
       LEFT JOIN LATERAL (
         SELECT a."createdAt" FROM "AuditLog" a
         WHERE a."entityId" = u.id AND a.action = 'LOGIN'
         ORDER BY a."createdAt" DESC LIMIT 1
       ) login ON true
       ${where}
       ORDER BY o.name, u."lastName", u."firstName"
       LIMIT $${params.length}`,
      params,
    );

    for (const r of rows) {
      orgUsers.push({
        id: r.id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role,
        status: r.status,
        organizationId: r.organizationId,
        organizationName: r.organizationName,
        createdAt: r.createdAt.toISOString(),
        mustChangePassword: Boolean(r.mustChangePassword),
        accountKind: "ORG",
        lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
      });
    }
  }

  const platformUsers: PlatformOrgUser[] = [];
  if (includePlatform) {
    const pParams: unknown[] = [];
    const pConds: string[] = [`status = 'ACTIVE'`];
    if (opts?.search?.trim()) {
      pParams.push(`%${opts.search.trim().toLowerCase()}%`);
      pConds.push(
        `(LOWER(email) LIKE $${pParams.length}
          OR LOWER("firstName") LIKE $${pParams.length}
          OR LOWER("lastName") LIKE $${pParams.length})`,
      );
    }
    pParams.push(Math.min(50, limit));
    const { rows: pRows } = await pool.query<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      status: string;
      createdAt: Date;
    }>(
      `SELECT id, email, "firstName", "lastName", role::text, status::text, "createdAt"
       FROM "PlatformUser"
       WHERE ${pConds.join(" AND ")}
       ORDER BY "lastName", "firstName"
       LIMIT $${pParams.length}`,
      pParams,
    );
    for (const r of pRows) {
      platformUsers.push({
        id: r.id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role,
        status: r.status,
        organizationId: null,
        organizationName: null,
        createdAt: r.createdAt.toISOString(),
        mustChangePassword: false,
        accountKind: "PLATFORM",
        lastLoginAt: null,
      });
    }
  }

  return [...platformUsers, ...orgUsers].slice(0, limit);
}

export async function getPlatformWideUser(
  id: string,
): Promise<PlatformOrgUser | null> {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    organizationId: string;
    organizationName: string;
    createdAt: Date;
    mustChangePassword: boolean;
    lastLoginAt: Date | null;
  }>(
    `SELECT u.id, u.email, u."firstName", u."lastName", u.role::text, u.status::text,
            u."organizationId", o.name AS "organizationName", u."createdAt",
            u."mustChangePassword", login."createdAt" AS "lastLoginAt"
     FROM "User" u
     JOIN "Organization" o ON o.id = u."organizationId"
     LEFT JOIN LATERAL (
       SELECT a."createdAt" FROM "AuditLog" a
       WHERE a."entityId" = u.id AND a.action = 'LOGIN'
       ORDER BY a."createdAt" DESC LIMIT 1
     ) login ON true
     WHERE u.id = $1`,
    [id],
  );
  const r = rows[0];
  if (r) {
    return {
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      status: r.status,
      organizationId: r.organizationId,
      organizationName: r.organizationName,
      createdAt: r.createdAt.toISOString(),
      mustChangePassword: Boolean(r.mustChangePassword),
      accountKind: "ORG",
      lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
    };
  }

  const { rows: pRows } = await pool.query<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    createdAt: Date;
  }>(
    `SELECT id, email, "firstName", "lastName", role::text, status::text, "createdAt"
     FROM "PlatformUser" WHERE id = $1`,
    [id],
  );
  const p = pRows[0];
  if (!p) return null;
  return {
    id: p.id,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    role: p.role,
    status: p.status,
    organizationId: null,
    organizationName: null,
    createdAt: p.createdAt.toISOString(),
    mustChangePassword: false,
    accountKind: "PLATFORM",
    lastLoginAt: null,
  };
}

export async function setPlatformWideUserStatus(
  actor: PlatformSessionUser,
  userId: string,
  status: "ACTIVE" | "DISABLED",
  opts?: { asDelete?: boolean },
) {
  const user = await getPlatformWideUser(userId);
  if (!user || user.accountKind !== "ORG" || !user.organizationId) {
    throw new Error("NOT_FOUND");
  }

  await pool.query(
    `UPDATE "User" SET status = $2::"OrgUserStatus", "updatedAt" = NOW() WHERE id = $1`,
    [userId, status],
  );

  if (status === "DISABLED") {
    await pool.query(
      `UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW() WHERE id = $1`,
      [userId],
    );
  }

  const action =
    status === "DISABLED"
      ? opts?.asDelete
        ? "USER_DELETED"
        : "USER_DISABLED"
      : "USER_REACTIVATED";

  await auditSensitive(actor, {
    organizationId: user.organizationId,
    entityId: userId,
    action,
    before: { status: user.status, email: user.email },
    after: { status, email: user.email, softDeleted: Boolean(opts?.asDelete) },
  });
}

export async function setPlatformWideUserRole(
  actor: PlatformSessionUser,
  userId: string,
  role: OrgUserRole,
) {
  const user = await getPlatformWideUser(userId);
  if (!user || user.accountKind !== "ORG" || !user.organizationId) {
    throw new Error("NOT_FOUND");
  }

  await pool.query(
    `UPDATE "User" SET role = $2::"UserRole", "updatedAt" = NOW() WHERE id = $1`,
    [userId, role],
  );

  await auditSensitive(actor, {
    organizationId: user.organizationId,
    entityId: userId,
    action: "USER_ROLE_CHANGED",
    before: { role: user.role, email: user.email },
    after: { role, email: user.email },
  });
}

export async function updatePlatformWideUserProfile(
  actor: PlatformSessionUser,
  userId: string,
  input: { firstName?: string; lastName?: string; email?: string; phone?: string | null },
) {
  const user = await getPlatformWideUser(userId);
  if (!user || user.accountKind !== "ORG" || !user.organizationId) {
    throw new Error("NOT_FOUND");
  }

  const firstName = input.firstName?.trim() || user.firstName;
  const lastName = input.lastName?.trim() || user.lastName;
  const email = input.email?.trim().toLowerCase() || user.email;

  await pool.query(
    `UPDATE "User"
     SET "firstName" = $2, "lastName" = $3, email = $4,
         phone = COALESCE($5, phone), "updatedAt" = NOW()
     WHERE id = $1`,
    [userId, firstName, lastName, email, input.phone ?? null],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: user.organizationId,
    entityType: "User",
    entityId: userId,
    action: "USER_UPDATED",
    before: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    after: { firstName, lastName, email },
  });

  return getPlatformWideUser(userId);
}

export async function platformResetUserPassword(
  actor: PlatformSessionUser,
  userId: string,
): Promise<{ temporaryPassword: string; email: string; firstName: string; lastName: string }> {
  const user = await getPlatformWideUser(userId);
  if (!user || user.accountKind !== "ORG" || !user.organizationId) {
    throw new Error("NOT_FOUND");
  }
  if (user.status !== "ACTIVE") throw new Error("USER_DISABLED");

  /** Mot de passe temporaire fixe demandé pour le Super Admin. */
  const temporaryPassword = "Beauty2026!";
  const passwordHash = hashPassword(temporaryPassword);

  await pool.query(
    `UPDATE "User"
     SET "passwordHash" = $1,
         "mustChangePassword" = true,
         "sessionVersion" = "sessionVersion" + 1,
         "updatedAt" = NOW()
     WHERE id = $2`,
    [passwordHash, userId],
  );

  await auditSensitive(actor, {
    organizationId: user.organizationId,
    entityId: userId,
    action: "USER_PASSWORD_RESET",
    before: { email: user.email },
    after: { mustChangePassword: true, temporaryPasswordIssued: true },
  });

  return {
    temporaryPassword,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function invalidateUserSessions(
  actor: PlatformSessionUser,
  userId: string,
) {
  const user = await getPlatformWideUser(userId);
  if (!user || user.accountKind !== "ORG" || !user.organizationId) {
    throw new Error("NOT_FOUND");
  }

  await pool.query(
    `UPDATE "User"
     SET "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW()
     WHERE id = $1`,
    [userId],
  );

  await auditSensitive(actor, {
    organizationId: user.organizationId,
    entityId: userId,
    action: "USER_SESSIONS_INVALIDATED",
    before: { email: user.email },
    after: { sessionsInvalidated: true },
  });
}

export async function listOrganizationsForFilter(): Promise<
  { id: string; name: string }[]
> {
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM "Organization" WHERE status <> 'ARCHIVED' ORDER BY name`,
  );
  return rows;
}

export async function listUserActivity(opts: {
  userId?: string;
  organizationId?: string;
  limit?: number;
}) {
  const limit = Math.min(opts.limit ?? 40, 100);
  const params: unknown[] = [];
  const conds: string[] = [];

  if (opts.userId) {
    params.push(opts.userId);
    conds.push(`a."entityId" = $${params.length}`);
  }
  if (opts.organizationId) {
    params.push(opts.organizationId);
    conds.push(`a."organizationId" = $${params.length}`);
  }
  params.push(limit);
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string;
    platformUserName: string | null;
    organizationId: string | null;
    organizationName: string | null;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
  }>(
    `SELECT a.id, a."platformUserName", a."organizationId", o.name AS "organizationName",
            a.action, a."entityType", a."entityId", a."createdAt"
     FROM "PlatformAuditLog" a
     LEFT JOIN "Organization" o ON o.id = a."organizationId"
     ${where}
     ORDER BY a."createdAt" DESC
     LIMIT $${params.length}`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    platformUserName: r.platformUserName,
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    createdAt: r.createdAt.toISOString(),
  }));
}
