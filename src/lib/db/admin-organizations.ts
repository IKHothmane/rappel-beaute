import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { newPlatformId } from "@/lib/db/platform-users";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { getPlanByCode } from "@/lib/subscriptions/plans";
import { changeSubscriptionPlan } from "@/lib/db/admin-subscriptions";
import { addMonths } from "@/lib/subscriptions/subscription-service";
import type { PlanCode } from "@/types/subscription";
import {
  type CreateOrganizationInput,
  type OrganizationDetail,
  type OrganizationListItem,
  type OrganizationStatus,
  type PlatformDashboardStats,
} from "@/types/platform";
import type { SubscriptionStatus } from "@/types/subscription";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function actorName(actor: PlatformSessionUser) {
  return `${actor.firstName} ${actor.lastName}`.trim();
}

async function seedOrgDefaults(client: PoolClient, organizationId: string) {
  await client.query(
    `INSERT INTO "ReactivationSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,
    [newId("rset"), organizationId],
  );
  await client.query(
    `INSERT INTO "ReviewSettings" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,
    [newId("rvset"), organizationId],
  );
  await client.query(
    `INSERT INTO "LoyaltyProgram" (id, "organizationId", "updatedAt")
     VALUES ($1, $2, NOW()) ON CONFLICT ("organizationId") DO NOTHING`,
    [newId("loy"), organizationId],
  );
}

export async function getPlatformDashboardStats(): Promise<PlatformDashboardStats> {
  const { rows: orgRows } = await pool.query<{ total: string; active: string; month: string }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', NOW()))::text AS month
     FROM "Organization"`,
  );
  const { rows: userRows } = await pool.query<{ total: string; month: string }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', NOW()))::text AS month
     FROM "User"`,
  );
  const { rows: subRows } = await pool.query<{ mrr: string; active: string }>(
    `SELECT
      COALESCE(SUM("priceSnapshot") FILTER (WHERE status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')), 0)::text AS mrr,
      COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'TRIAL'))::text AS active
     FROM "Subscription" s
     WHERE s.id = (
       SELECT s2.id FROM "Subscription" s2
       WHERE s2."organizationId" = s."organizationId"
       ORDER BY s2."createdAt" DESC LIMIT 1
     )`,
  );
  const { rows: rdvRows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Appointment"
     WHERE "startAt" >= date_trunc('month', NOW())
       AND status NOT IN ('CANCELLED')`,
  );
  const { rows: custRows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Customer" WHERE status != 'ARCHIVED'`,
  );

  const mrr = parseFloat(subRows[0]?.mrr ?? "0");
  return {
    orgs: parseInt(orgRows[0]?.total ?? "0", 10),
    orgsActive: parseInt(orgRows[0]?.active ?? "0", 10),
    orgsDelta: parseInt(orgRows[0]?.month ?? "0", 10),
    users: parseInt(userRows[0]?.total ?? "0", 10),
    usersDelta: parseInt(userRows[0]?.month ?? "0", 10),
    mrr,
    arr: mrr * 12,
    activeSubs: parseInt(subRows[0]?.active ?? "0", 10),
    rdv: parseInt(rdvRows[0]?.c ?? "0", 10),
    customers: parseInt(custRows[0]?.c ?? "0", 10),
  };
}

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: OrganizationStatus;
  createdAt: Date;
  plan: PlanCode | null;
  subPrice: string | null;
  ownerFirst: string | null;
  ownerLast: string | null;
  ownerEmail: string | null;
};

function mapOrgRow(r: OrgRow): OrganizationListItem {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    city: r.city,
    phone: r.phone,
    email: r.email,
    status: r.status,
    plan: r.plan,
    ownerName:
      r.ownerFirst && r.ownerLast ? `${r.ownerFirst} ${r.ownerLast}`.trim() : null,
    ownerEmail: r.ownerEmail,
    createdAt: r.createdAt.toISOString(),
    mrr: r.subPrice ? parseFloat(r.subPrice) : 0,
  };
}

const ORG_SELECT = `
  SELECT
    o.id, o.name, o.slug, o.city, o.phone, o.email, o.status, o."createdAt",
    p.code AS plan, s."priceSnapshot"::text AS "subPrice",
    u."firstName" AS "ownerFirst", u."lastName" AS "ownerLast", u.email AS "ownerEmail"
  FROM "Organization" o
  LEFT JOIN LATERAL (
    SELECT "planId", "priceSnapshot" FROM "Subscription"
    WHERE "organizationId" = o.id
    ORDER BY "createdAt" DESC LIMIT 1
  ) s ON true
  LEFT JOIN "Plan" p ON p.id = s."planId"
  LEFT JOIN LATERAL (
    SELECT "firstName", "lastName", email FROM "User"
    WHERE "organizationId" = o.id AND role = 'OWNER'
    ORDER BY "createdAt" ASC LIMIT 1
  ) u ON true
`;

export async function listOrganizations(opts?: {
  search?: string;
  status?: OrganizationStatus;
  plan?: PlanCode;
}): Promise<OrganizationListItem[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (opts?.search) {
    params.push(`%${opts.search.trim()}%`);
    clauses.push(
      `(o.name ILIKE $${params.length} OR o.slug ILIKE $${params.length} OR u.email ILIKE $${params.length})`,
    );
  }
  if (opts?.status) {
    params.push(opts.status);
    clauses.push(`o.status = $${params.length}`);
  }
  if (opts?.plan) {
    params.push(opts.plan);
    clauses.push(`p.code = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query<OrgRow>(
    `${ORG_SELECT} ${where} ORDER BY o."createdAt" DESC`,
    params,
  );
  return rows.map(mapOrgRow);
}

export async function getOrganizationById(id: string): Promise<OrganizationDetail | null> {
  const { rows } = await pool.query<
    OrgRow & { address: string | null; ownerPhone: string | null }
  >(
    `SELECT
      o.id, o.name, o.slug, o.city, o.phone, o.email, o.status, o.address, o."createdAt",
      p.code AS plan, s."priceSnapshot"::text AS "subPrice",
      u."firstName" AS "ownerFirst", u."lastName" AS "ownerLast", u.email AS "ownerEmail",
      u.phone AS "ownerPhone"
    FROM "Organization" o
    LEFT JOIN LATERAL (
      SELECT "planId", "priceSnapshot" FROM "Subscription"
      WHERE "organizationId" = o.id ORDER BY "createdAt" DESC LIMIT 1
    ) s ON true
    LEFT JOIN "Plan" p ON p.id = s."planId"
    LEFT JOIN LATERAL (
      SELECT "firstName", "lastName", email, phone FROM "User"
      WHERE "organizationId" = o.id AND role = 'OWNER'
      ORDER BY "createdAt" ASC LIMIT 1
    ) u ON true
    WHERE o.id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;

  const { rows: stats } = await pool.query<{
    customers: string;
    appointments: string;
    revenue: string;
    products: string;
    staff: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::text FROM "Customer" WHERE "organizationId" = $1 AND status != 'ARCHIVED') AS customers,
      (SELECT COUNT(*)::text FROM "Appointment" WHERE "organizationId" = $1 AND status NOT IN ('CANCELLED')) AS appointments,
      (SELECT COALESCE(SUM(amount),0)::text FROM "Payment" WHERE "organizationId" = $1 AND status = 'COMPLETED') AS revenue,
      (SELECT COUNT(*)::text FROM "Product" WHERE "organizationId" = $1 AND active = true) AS products,
      (SELECT COUNT(*)::text FROM "Staff" WHERE "organizationId" = $1 AND status = 'ACTIVE') AS staff`,
    [id],
  );

  const { rows: subRows } = await pool.query<{
    id: string;
    planCode: PlanCode;
    priceSnapshot: string;
    status: SubscriptionStatus;
    startedAt: Date;
    currentPeriodEnd: Date;
  }>(
    `SELECT s.id, p.code AS "planCode", s."priceSnapshot"::text, s.status,
            s."startedAt", s."currentPeriodEnd"
     FROM "Subscription" s
     JOIN "Plan" p ON p.id = s."planId"
     WHERE s."organizationId" = $1
     ORDER BY s."createdAt" DESC LIMIT 1`,
    [id],
  );
  const sub = subRows[0];

  const base = mapOrgRow(r);
  return {
    ...base,
    address: r.address ?? null,
    ownerPhone: r.ownerPhone ?? null,
    stats: {
      customers: parseInt(stats[0]?.customers ?? "0", 10),
      appointments: parseInt(stats[0]?.appointments ?? "0", 10),
      revenue: parseFloat(stats[0]?.revenue ?? "0"),
      products: parseInt(stats[0]?.products ?? "0", 10),
      staff: parseInt(stats[0]?.staff ?? "0", 10),
    },
    subscription: sub
      ? {
          id: sub.id,
          plan: sub.planCode,
          price: parseFloat(sub.priceSnapshot),
          status: sub.status,
          startAt: sub.startedAt.toISOString(),
          renewAt: sub.currentPeriodEnd.toISOString(),
        }
      : null,
  };
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const params: unknown[] = [slug.trim().toLowerCase()];
  let sql = `SELECT 1 FROM "Organization" WHERE LOWER(slug) = $1`;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND id != $2`;
  }
  sql += ` LIMIT 1`;
  const { rows } = await pool.query(sql, params);
  return rows.length > 0;
}

export type CreateOrganizationResult = {
  organizationId: string;
  ownerUserId: string;
  subscriptionId: string;
  activationToken: string;
  activationUrl: string;
};

export async function createOrganization(
  actor: PlatformSessionUser,
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (await slugExists(slug)) throw new Error("SLUG_TAKEN");

  const plan = await getPlanByCode(input.plan);
  if (!plan || !plan.active) throw new Error("PLAN_NOT_FOUND");

  const orgId = newId("org");
  const ownerId = newId("u");
  const subId = newId("sub");
  const tokenId = newId("act");
  const activationToken = randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const periodEnd = addMonths(now, 1);
  const ownerEmail = input.owner.email.trim().toLowerCase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: emailCheck } = await client.query(
      `SELECT id FROM "User" WHERE LOWER(email) = $1 LIMIT 1`,
      [ownerEmail],
    );
    if (emailCheck.length > 0) throw new Error("OWNER_EMAIL_TAKEN");

    await client.query(
      `INSERT INTO "Organization" (
        id, name, slug, address, city, phone, email, status, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',NOW())`,
      [
        orgId,
        input.name.trim(),
        slug,
        input.address?.trim() || null,
        input.city?.trim() || null,
        input.phone.trim(),
        input.email.trim().toLowerCase(),
      ],
    );

    await client.query(
      `INSERT INTO "User" (
        id, "organizationId", email, "firstName", "lastName", phone, role, status, "passwordHash", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,'OWNER','ACTIVE',NULL,NOW())`,
      [
        ownerId,
        orgId,
        ownerEmail,
        input.owner.firstName.trim(),
        input.owner.lastName.trim(),
        input.owner.phone?.trim() || null,
      ],
    );

    await client.query(
      `INSERT INTO "Subscription" (
        id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
        "startedAt", "currentPeriodStart", "currentPeriodEnd", "updatedAt"
      ) VALUES ($1,$2,$3,'ACTIVE',$4,$5,$6,$6,$7,NOW())`,
      [subId, orgId, plan.id, plan.price, plan.currency, now, periodEnd],
    );

    await client.query(
      `INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt")
       VALUES ($1,$2,$3,$4)`,
      [tokenId, ownerId, activationToken, tokenExpires],
    );

    await seedOrgDefaults(client, orgId);

    await writePlatformAuditLog({
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      organizationId: orgId,
      entityType: "Organization",
      entityId: orgId,
      action: "ORGANIZATION_CREATED",
      after: {
        name: input.name,
        slug,
        plan: input.plan,
        ownerEmail,
      },
      client,
    });

    await writePlatformAuditLog({
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      organizationId: orgId,
      entityType: "User",
      entityId: ownerId,
      action: "OWNER_CREATED",
      after: { email: ownerEmail, role: "OWNER" },
      client,
    });

    await client.query("COMMIT");

    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    return {
      organizationId: orgId,
      ownerUserId: ownerId,
      subscriptionId: subId,
      activationToken,
      activationUrl: `${baseUrl}/activate/?token=${activationToken}&__host=app`,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateOrganization(
  actor: PlatformSessionUser,
  id: string,
  patch: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string | null;
    city?: string | null;
  },
) {
  const before = await getOrganizationById(id);
  if (!before) throw new Error("NOT_FOUND");

  await pool.query(
    `UPDATE "Organization" SET
      name = COALESCE($2, name),
      phone = COALESCE($3, phone),
      email = COALESCE($4, email),
      address = COALESCE($5, address),
      city = COALESCE($6, city),
      "updatedAt" = NOW()
     WHERE id = $1`,
    [
      id,
      patch.name?.trim(),
      patch.phone?.trim(),
      patch.email?.trim()?.toLowerCase(),
      patch.address,
      patch.city,
    ],
  );

  const after = await getOrganizationById(id);
  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: id,
    entityType: "Organization",
    entityId: id,
    action: "ORGANIZATION_UPDATED",
    before: { name: before.name, phone: before.phone, email: before.email },
    after: { name: after?.name, phone: after?.phone, email: after?.email },
  });
}

export async function suspendOrganization(actor: PlatformSessionUser, id: string) {
  const org = await getOrganizationById(id);
  if (!org) throw new Error("NOT_FOUND");
  if (org.status === "SUSPENDED") return;

  await pool.query(
    `UPDATE "Organization" SET status = 'SUSPENDED', "updatedAt" = NOW() WHERE id = $1`,
    [id],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: id,
    entityType: "Organization",
    entityId: id,
    action: "ORGANIZATION_SUSPENDED",
    before: { status: org.status },
    after: { status: "SUSPENDED" },
  });
}

export async function reactivateOrganization(actor: PlatformSessionUser, id: string) {
  const org = await getOrganizationById(id);
  if (!org) throw new Error("NOT_FOUND");
  if (org.status === "ACTIVE") return;

  await pool.query(
    `UPDATE "Organization" SET status = 'ACTIVE', "updatedAt" = NOW() WHERE id = $1`,
    [id],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: id,
    entityType: "Organization",
    entityId: id,
    action: "ORGANIZATION_REACTIVATED",
    before: { status: org.status },
    after: { status: "ACTIVE" },
  });
}

export async function archiveOrganization(actor: PlatformSessionUser, id: string) {
  const org = await getOrganizationById(id);
  if (!org) throw new Error("NOT_FOUND");

  await pool.query(
    `UPDATE "Organization" SET status = 'ARCHIVED', "updatedAt" = NOW() WHERE id = $1`,
    [id],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: id,
    entityType: "Organization",
    entityId: id,
    action: "ORGANIZATION_ARCHIVED",
    before: { status: org.status },
    after: { status: "ARCHIVED" },
  });
}

export async function listOrganizationUsers(organizationId: string) {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    status: string;
    createdAt: Date;
  }>(
    `SELECT id, email, "firstName", "lastName", phone, role, status, "createdAt"
     FROM "User" WHERE "organizationId" = $1 ORDER BY
       CASE role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,
       "lastName"`,
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
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function setOrganizationUserStatus(
  actor: PlatformSessionUser,
  organizationId: string,
  userId: string,
  status: "ACTIVE" | "DISABLED",
) {
  const { rows } = await pool.query<{ status: string; email: string }>(
    `SELECT status, email FROM "User" WHERE id = $1 AND "organizationId" = $2`,
    [userId, organizationId],
  );
  if (!rows[0]) throw new Error("NOT_FOUND");

  await pool.query(
    `UPDATE "User" SET status = $3, "updatedAt" = NOW() WHERE id = $1 AND "organizationId" = $2`,
    [userId, organizationId, status],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId,
    entityType: "User",
    entityId: userId,
    action: status === "DISABLED" ? "USER_DISABLED" : "USER_REACTIVATED",
    before: { status: rows[0].status, email: rows[0].email },
    after: { status, email: rows[0].email },
  });
}

export async function resetOwnerAccess(
  actor: PlatformSessionUser,
  organizationId: string,
): Promise<{ activationToken: string; activationUrl: string }> {
  const { rows } = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM "User"
     WHERE "organizationId" = $1 AND role = 'OWNER'
     ORDER BY "createdAt" ASC LIMIT 1`,
    [organizationId],
  );
  const owner = rows[0];
  if (!owner) throw new Error("OWNER_NOT_FOUND");

  const tokenId = newId("act");
  const activationToken = randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(`UPDATE "User" SET "passwordHash" = NULL, "updatedAt" = NOW() WHERE id = $1`, [
    owner.id,
  ]);
  await pool.query(`UPDATE "ActivationToken" SET "usedAt" = NOW() WHERE "userId" = $1 AND "usedAt" IS NULL`, [
    owner.id,
  ]);
  await pool.query(
    `INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt") VALUES ($1,$2,$3,$4)`,
    [tokenId, owner.id, activationToken, tokenExpires],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId,
    entityType: "User",
    entityId: owner.id,
    action: "OWNER_ACCESS_RESET",
    after: { email: owner.email },
  });

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return {
    activationToken,
    activationUrl: `${baseUrl}/activate/?token=${activationToken}&__host=app`,
  };
}

export async function updateSubscription(
  actor: PlatformSessionUser,
  organizationId: string,
  planCode: PlanCode,
) {
  const plan = await getPlanByCode(planCode);
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM "Subscription" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [organizationId],
  );
  if (!rows[0]) throw new Error("SUB_NOT_FOUND");

  await changeSubscriptionPlan(actor, rows[0].id, plan.id);
}

export async function startSupportSession(
  actor: PlatformSessionUser,
  organizationId: string,
  reason?: string,
): Promise<{ sessionId: string }> {
  const org = await getOrganizationById(organizationId);
  if (!org) throw new Error("NOT_FOUND");

  const sessionId = newPlatformId("sup");
  await pool.query(
    `INSERT INTO "SupportSession" (id, "platformUserId", "organizationId", reason)
     VALUES ($1,$2,$3,$4)`,
    [sessionId, actor.id, organizationId, reason?.trim() || null],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId,
    entityType: "SupportSession",
    entityId: sessionId,
    action: "SUPPORT_SESSION_STARTED",
    after: { reason: reason ?? null, organizationName: org.name },
  });

  return { sessionId };
}

export async function endSupportSession(actor: PlatformSessionUser, sessionId: string) {
  const { rows } = await pool.query<{ organizationId: string }>(
    `UPDATE "SupportSession" SET "endedAt" = NOW()
     WHERE id = $1 AND "platformUserId" = $2 AND "endedAt" IS NULL
     RETURNING "organizationId"`,
    [sessionId, actor.id],
  );
  if (!rows[0]) throw new Error("NOT_FOUND");

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: rows[0].organizationId,
    entityType: "SupportSession",
    entityId: sessionId,
    action: "SUPPORT_SESSION_ENDED",
  });
}

export async function listAllOrganizationUsers(opts?: {
  search?: string;
  role?: string;
  limit?: number;
}): Promise<import("@/types/platform").PlatformOrgUser[]> {
  const limit = Math.min(opts?.limit ?? 200, 500);
  const params: unknown[] = [];
  const conds: string[] = [];

  if (opts?.search?.trim()) {
    params.push(`%${opts.search.trim().toLowerCase()}%`);
    conds.push(
      `(LOWER(u.email) LIKE $${params.length} OR LOWER(u."firstName") LIKE $${params.length} OR LOWER(u."lastName") LIKE $${params.length} OR LOWER(o.name) LIKE $${params.length})`,
    );
  }
  if (opts?.role) {
    params.push(opts.role);
    conds.push(`u.role = $${params.length}::"UserRole"`);
  }
  params.push(limit);

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
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
  }>(
    `SELECT u.id, u.email, u."firstName", u."lastName", u.role::text, u.status::text,
            u."organizationId", o.name AS "organizationName", u."createdAt"
     FROM "User" u
     JOIN "Organization" o ON o.id = u."organizationId"
     ${where}
     ORDER BY o.name, u."lastName", u."firstName"
     LIMIT $${params.length}`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    role: r.role,
    status: r.status,
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listSupportSessions(opts?: {
  openOnly?: boolean;
  limit?: number;
}): Promise<import("@/types/platform").SupportSessionListItem[]> {
  const limit = Math.min(opts?.limit ?? 50, 200);
  const params: unknown[] = [];
  let where = "";
  if (opts?.openOnly) {
    where = `WHERE ss."endedAt" IS NULL`;
  }
  params.push(limit);

  const { rows } = await pool.query<{
    id: string;
    organizationId: string;
    organizationName: string;
    platformUserName: string;
    reason: string | null;
    startedAt: Date;
    endedAt: Date | null;
  }>(
    `SELECT ss.id, ss."organizationId", o.name AS "organizationName",
            TRIM(CONCAT(pu."firstName", ' ', pu."lastName")) AS "platformUserName",
            ss.reason, ss."startedAt", ss."endedAt"
     FROM "SupportSession" ss
     JOIN "Organization" o ON o.id = ss."organizationId"
     JOIN "PlatformUser" pu ON pu.id = ss."platformUserId"
     ${where}
     ORDER BY ss."startedAt" DESC
     LIMIT $${params.length}`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    platformUserName: r.platformUserName,
    reason: r.reason,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt?.toISOString() ?? null,
    open: r.endedAt == null,
  }));
}

export async function getSupportSessionById(
  id: string,
): Promise<import("@/types/platform").SupportSessionListItem | null> {
  const { rows } = await pool.query<{
    id: string;
    organizationId: string;
    organizationName: string;
    platformUserName: string;
    reason: string | null;
    startedAt: Date;
    endedAt: Date | null;
  }>(
    `SELECT ss.id, ss."organizationId", o.name AS "organizationName",
            TRIM(CONCAT(pu."firstName", ' ', pu."lastName")) AS "platformUserName",
            ss.reason, ss."startedAt", ss."endedAt"
     FROM "SupportSession" ss
     JOIN "Organization" o ON o.id = ss."organizationId"
     JOIN "PlatformUser" pu ON pu.id = ss."platformUserId"
     WHERE ss.id = $1
     LIMIT 1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    platformUserName: r.platformUserName,
    reason: r.reason,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt?.toISOString() ?? null,
    open: r.endedAt == null,
  };
}
