import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/crypto";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/db/audit";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import type {
  PlatformOrgUser,
  PlatformUsersKpis,
} from "@/types/platform";
import { pool } from "@/lib/db/pool";
import { emailOwner, isUserEmailUniqueViolation, lockEmailKey } from "@/lib/db/email-uniqueness";

const ORG_ROLES = ["OWNER", "MANAGER", "STAFF", "CASHIER", "ACCOUNTANT"] as const;
type OrgUserRole = (typeof ORG_ROLES)[number];

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
    /** Dans une transaction : les deux journaux sont écrits avec elle (tout ou rien). */
    client?: PoolClient;
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
    client: opts.client,
  });
  const orgAudit = writeAuditLog({
    organizationId: opts.organizationId,
    actorId: actor.id,
    actorName: `Super Admin · ${name}`,
    entityType: "User",
    entityId: opts.entityId,
    action: opts.action,
    before: opts.before,
    after: opts.after,
    client: opts.client,
  });
  // Hors transaction, l'échec du journal institut reste non bloquant (comportement historique).
  // Dans une transaction, une erreur doit faire échouer l'ensemble.
  if (opts.client) await orgAudit;
  else await orgAudit.catch(() => null);
}

/** Écritures liées + audits dans une transaction. */
async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
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
    inactive: string;
    onlineToday: string;
    watchlist: string;
  }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE u.status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE u.status = 'DISABLED')::text AS disabled,
      COUNT(*) FILTER (WHERE u."createdAt" >= date_trunc('month', NOW()))::text AS month,
      COUNT(*) FILTER (
        WHERE u.status = 'ACTIVE'
          AND (login."createdAt" IS NULL OR login."createdAt" < NOW() - INTERVAL '30 days')
      )::text AS inactive,
      COUNT(*) FILTER (
        WHERE u.status = 'ACTIVE'
          AND login."createdAt" >= date_trunc('day', NOW())
      )::text AS onlineToday,
      COUNT(*) FILTER (
        WHERE u.status = 'ACTIVE' AND u."mustChangePassword" = true
      )::text AS watchlist
     FROM "User" u
     LEFT JOIN LATERAL (
       SELECT a."createdAt" FROM "AuditLog" a
       WHERE a."entityId" = u.id AND a.action = 'LOGIN'
       ORDER BY a."createdAt" DESC LIMIT 1
     ) login ON true`,
  );
  const { rows: platform } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "PlatformUser" WHERE status = 'ACTIVE'`,
  );
  const { rows: orgs } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Organization" WHERE status = 'ACTIVE'`,
  );
  const { rows: roles } = await pool.query<{ role: string; c: string }>(
    `SELECT role::text AS role, COUNT(*)::text AS c FROM "User" GROUP BY role`,
  );
  const platformCount = parseInt(platform[0]?.c ?? "0", 10);
  const total = parseInt(rows[0]?.total ?? "0", 10) + platformCount;
  const active = parseInt(rows[0]?.active ?? "0", 10) + platformCount;
  const roleShare: Record<string, number> = {};
  for (const r of roles) {
    roleShare[r.role] = parseInt(r.c ?? "0", 10);
  }
  if (platformCount > 0) {
    roleShare.SUPER_ADMIN = (roleShare.SUPER_ADMIN ?? 0) + platformCount;
  }
  return {
    total,
    active,
    disabled: parseInt(rows[0]?.disabled ?? "0", 10),
    thisMonth: parseInt(rows[0]?.month ?? "0", 10),
    inactive: parseInt(rows[0]?.inactive ?? "0", 10),
    onlineToday: parseInt(rows[0]?.onlineToday ?? "0", 10),
    watchlist: parseInt(rows[0]?.watchlist ?? "0", 10),
    orgsCount: parseInt(orgs[0]?.c ?? "0", 10),
    roleShare,
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
        OR LOWER(COALESCE(u.phone, '')) LIKE $${params.length}
        OR LOWER(u.id) LIKE $${params.length}
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
      phone: string | null;
      role: string;
      status: string;
      organizationId: string;
      organizationName: string;
      organizationCity: string | null;
      createdAt: Date;
      mustChangePassword: boolean;
      sessionVersion: number;
      lastLoginAt: Date | null;
    }>(
      `SELECT u.id, u.email, u."firstName", u."lastName", u.phone, u.role::text, u.status::text,
              u."organizationId", o.name AS "organizationName", o.city AS "organizationCity",
              u."createdAt", u."mustChangePassword", u."sessionVersion",
              login."createdAt" AS "lastLoginAt"
       FROM "User" u
       JOIN "Organization" o ON o.id = u."organizationId"
       LEFT JOIN LATERAL (
         SELECT a."createdAt" FROM "AuditLog" a
         WHERE a."entityId" = u.id AND a.action = 'LOGIN'
         ORDER BY a."createdAt" DESC LIMIT 1
       ) login ON true
       ${where}
       ORDER BY COALESCE(login."createdAt", u."createdAt") DESC
       LIMIT $${params.length}`,
      params,
    );

    for (const r of rows) {
      orgUsers.push({
        id: r.id,
        email: r.email ?? "",
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone,
        role: r.role,
        status: r.status,
        organizationId: r.organizationId,
        organizationName: r.organizationName,
        organizationCity: r.organizationCity,
        createdAt: r.createdAt.toISOString(),
        mustChangePassword: Boolean(r.mustChangePassword),
        sessionVersion: r.sessionVersion ?? 0,
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
        email: r.email ?? "",
        firstName: r.firstName,
        lastName: r.lastName,
        phone: null,
        role: r.role,
        status: r.status,
        organizationId: null,
        organizationName: null,
        organizationCity: null,
        createdAt: r.createdAt.toISOString(),
        mustChangePassword: false,
        sessionVersion: 0,
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
    phone: string | null;
    role: string;
    status: string;
    organizationId: string;
    organizationName: string;
    organizationCity: string | null;
    createdAt: Date;
    mustChangePassword: boolean;
    sessionVersion: number;
    lastLoginAt: Date | null;
  }>(
    `SELECT u.id, u.email, u."firstName", u."lastName", u.phone, u.role::text, u.status::text,
            u."organizationId", o.name AS "organizationName", o.city AS "organizationCity",
            u."createdAt", u."mustChangePassword", u."sessionVersion",
            login."createdAt" AS "lastLoginAt"
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
      email: r.email ?? "",
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      role: r.role,
      status: r.status,
      organizationId: r.organizationId,
      organizationName: r.organizationName,
      organizationCity: r.organizationCity,
      createdAt: r.createdAt.toISOString(),
      mustChangePassword: Boolean(r.mustChangePassword),
      sessionVersion: r.sessionVersion ?? 0,
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
    phone: null,
    role: p.role,
    status: p.status,
    organizationId: null,
    organizationName: null,
    organizationCity: null,
    createdAt: p.createdAt.toISOString(),
    mustChangePassword: false,
    sessionVersion: 0,
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

  const action =
    status === "DISABLED"
      ? opts?.asDelete
        ? "USER_DELETED"
        : "USER_DISABLED"
      : "USER_REACTIVATED";
  const organizationId = user.organizationId;

  // Statut, révocation des sessions et audits : tout ou rien.
  await inTransaction(async (client) => {
    await client.query(
      `UPDATE "User"
       SET status = $2::"OrgUserStatus",
           "sessionVersion" = "sessionVersion" + CASE WHEN $2::text = 'DISABLED' THEN 1 ELSE 0 END,
           "updatedAt" = NOW()
       WHERE id = $1`,
      [userId, status],
    );

    await auditSensitive(actor, {
      organizationId,
      entityId: userId,
      action,
      before: { status: user.status, email: user.email },
      after: { status, email: user.email, softDeleted: Boolean(opts?.asDelete) },
      client,
    });
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

  const organizationId = user.organizationId;

  // Le rôle et la révocation des sessions (sessionVersion + 1) changent ensemble : une rétrogradation
  // coupe les jetons déjà émis (30 jours), et requireAppSession relit de toute façon le rôle en base.
  await inTransaction(async (client) => {
    await client.query(
      `UPDATE "User"
       SET role = $2::"UserRole",
           "sessionVersion" = "sessionVersion" + 1,
           "updatedAt" = NOW()
       WHERE id = $1`,
      [userId, role],
    );

    await auditSensitive(actor, {
      organizationId,
      entityId: userId,
      action: "USER_ROLE_CHANGED",
      before: { role: user.role, email: user.email },
      after: { role, email: user.email, sessionsInvalidated: true },
      client,
    });
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
  const emailChanged = email.trim().toLowerCase() !== (user.email ?? "").trim().toLowerCase();

  // Contrôle d'unicité (insensible à la casse, comptes institut et plateforme) et écriture dans la même
  // transaction ; une nouvelle adresse n'est jamais vérifiée (emailVerifiedAt remis à NULL).
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (emailChanged) {
      await lockEmailKey(client, email);
      if ((await emailOwner(client, email, userId)) !== "free") throw new Error("EMAIL_TAKEN");
    }
    await client.query(
      `UPDATE "User"
       SET "firstName" = $2, "lastName" = $3, email = $4,
           phone = COALESCE($5, phone), "updatedAt" = NOW()${emailChanged ? `, "emailVerifiedAt" = NULL` : ""}
       WHERE id = $1`,
      [userId, firstName, lastName, email, input.phone ?? null],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    // Index d'unicité globale de l'e-mail (migration en attente) : erreur métier générique.
    if (isUserEmailUniqueViolation(error)) throw new Error("EMAIL_TAKEN");
    throw error;
  } finally {
    client.release();
  }

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

export async function createPlatformAdmin(
  actor: PlatformSessionUser,
  input: { email: string; password: string; firstName: string; lastName: string },
): Promise<{ id: string; email: string; firstName: string; lastName: string }> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const password = input.password;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("EMAIL_INVALID");
  if (password.length < 8) throw new Error("PASSWORD_SHORT");
  if (firstName.length < 1 || lastName.length < 1) throw new Error("NAME_REQUIRED");

  const id = `pu_${randomBytes(8).toString("hex")}`;
  const passwordHash = hashPassword(password);
  // Adresse réservée sous verrou (même clé que les parcours d'inscription et de changement d'adresse), contrôle
  // « instituts + plateforme », insertion et audit dans UNE transaction : pas de doublon avec un e-mail d'institut.
  await inTransaction(async (client) => {
    await lockEmailKey(client, email);
    if ((await emailOwner(client, email)) !== "free") throw new Error("EMAIL_TAKEN");
    await client.query(
      `INSERT INTO "PlatformUser" (
        id, email, "firstName", "lastName", role, status, "passwordHash", "updatedAt"
      ) VALUES ($1, $2, $3, $4, 'SUPER_ADMIN', 'ACTIVE', $5, NOW())`,
      [id, email, firstName, lastName, passwordHash],
    );
    await writePlatformAuditLog({
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      entityType: "PlatformUser",
      entityId: id,
      action: "PLATFORM_ADMIN_CREATED",
      after: { email, firstName, lastName, role: "SUPER_ADMIN" },
      client,
    });
  });

  return { id, email, firstName, lastName };
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

  // Mot de passe temporaire aléatoire, affiché une seule fois (jamais une valeur fixe présente dans le code).
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = hashPassword(temporaryPassword);
  const organizationId = user.organizationId;

  await inTransaction(async (client) => {
    await client.query(
      `UPDATE "User"
       SET "passwordHash" = $1,
           "mustChangePassword" = true,
           "sessionVersion" = "sessionVersion" + 1,
           "updatedAt" = NOW()
       WHERE id = $2`,
      [passwordHash, userId],
    );

    await auditSensitive(actor, {
      organizationId,
      entityId: userId,
      action: "USER_PASSWORD_RESET",
      before: { email: user.email },
      after: { mustChangePassword: true, temporaryPasswordIssued: true },
      client,
    });
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

  const organizationId = user.organizationId;
  await inTransaction(async (client) => {
    await client.query(
      `UPDATE "User"
       SET "sessionVersion" = "sessionVersion" + 1, "updatedAt" = NOW()
       WHERE id = $1`,
      [userId],
    );

    await auditSensitive(actor, {
      organizationId,
      entityId: userId,
      action: "USER_SESSIONS_INVALIDATED",
      before: { email: user.email },
      after: { sessionsInvalidated: true },
      client,
    });
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
    conds.push(
      `(a."organizationId" = $${params.length} OR (a."organizationId" IS NULL AND a."organizationIdSnapshot" = $${params.length}))`,
    );
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
