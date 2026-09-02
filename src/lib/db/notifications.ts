import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import type { AppRole } from "@/lib/rbac";
import {
  buildNotificationHref,
  rolesForNotificationType,
  severityForType,
  type NotificationFilterCategory,
  typesForCategory,
} from "@/lib/notifications/permissions";
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationSeverity,
  NotificationType,
} from "@/types/notifications";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function buildIdempotencyKey(eventKey: string, entityId: string | null, userId: string): string {
  return `notification:${eventKey}:${entityId ?? "none"}:${userId}`;
}

function mapRow(row: {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  metadata: unknown;
  createdAt: Date;
}): NotificationItem {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    severity: row.severity,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt?.toISOString() ?? null,
    metadata,
    createdAt: row.createdAt.toISOString(),
    href: buildNotificationHref(row.entityType, row.entityId, metadata),
  };
}

export async function listUsersByRoles(
  organizationId: string,
  roles: AppRole[],
  client?: PoolClient,
): Promise<{ id: string; role: AppRole }[]> {
  if (!roles.length) return [];
  const c = client ?? pool;
  const { rows } = await c.query<{ id: string; role: AppRole }>(
    `SELECT id, role::text AS role FROM "User"
     WHERE "organizationId" = $1 AND role = ANY($2::"UserRole"[])`,
    [organizationId, roles],
  );
  return rows;
}

export async function resolveUserIdForStaff(
  organizationId: string,
  staffId: string,
  client?: PoolClient,
): Promise<string | null> {
  const c = client ?? pool;
  const { rows: staffRows } = await c.query<{
    email: string | null;
    firstName: string;
    lastName: string;
  }>(
    `SELECT email, "firstName", "lastName" FROM "Staff"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [staffId, organizationId],
  );
  const staff = staffRows[0];
  if (!staff) return null;

  if (staff.email) {
    const byEmail = await c.query<{ id: string }>(
      `SELECT id FROM "User"
       WHERE "organizationId" = $1 AND lower(email) = lower($2) LIMIT 1`,
      [organizationId, staff.email],
    );
    if (byEmail.rows[0]) return byEmail.rows[0].id;
  }

  const byName = await c.query<{ id: string }>(
    `SELECT id FROM "User"
     WHERE "organizationId" = $1
       AND lower("firstName") = lower($2)
       AND lower("lastName") = lower($3)
     LIMIT 1`,
    [organizationId, staff.firstName, staff.lastName],
  );
  return byName.rows[0]?.id ?? null;
}

export type EmitNotificationInput = {
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  eventKey: string;
  entityType?: string | null;
  entityId?: string | null;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown> | null;
  recipientUserIds?: string[];
  recipientRoles?: AppRole[];
  alsoStaffId?: string | null;
  client?: PoolClient;
};

/** Crée une notification idempotente pour un utilisateur */
export async function createNotificationForUser(
  input: {
    organizationId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    eventKey: string;
    entityType?: string | null;
    entityId?: string | null;
    severity?: NotificationSeverity;
    metadata?: Record<string, unknown> | null;
    client?: PoolClient;
  },
): Promise<{ created: boolean; id: string | null }> {
  const c = input.client ?? pool;
  const idempotencyKey = buildIdempotencyKey(input.eventKey, input.entityId ?? null, input.userId);
  const id = newId("ntf");
  const severity = input.severity ?? severityForType(input.type);

  const result = await c.query<{ id: string }>(
    `INSERT INTO "Notification" (
      id, "organizationId", "userId", type, title, message, severity,
      "entityType", "entityId", "idempotencyKey", metadata
    ) VALUES (
      $1,$2,$3,$4::"NotificationType",$5,$6,$7::"NotificationSeverity",
      $8,$9,$10,$11::jsonb
    )
    ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING
    RETURNING id`,
    [
      id,
      input.organizationId,
      input.userId,
      input.type,
      input.title,
      input.message,
      severity,
      input.entityType ?? null,
      input.entityId ?? null,
      idempotencyKey,
      input.metadata != null ? JSON.stringify(input.metadata) : null,
    ],
  );

  if (result.rows[0]) {
    return { created: true, id: result.rows[0].id };
  }

  const existing = await c.query<{ id: string }>(
    `SELECT id FROM "Notification"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [input.organizationId, idempotencyKey],
  );
  return { created: false, id: existing.rows[0]?.id ?? null };
}

/** Émet une notification métier vers les bons destinataires (RBAC serveur) */
export async function emitNotification(input: EmitNotificationInput): Promise<number> {
  const userIds = new Set<string>(input.recipientUserIds ?? []);

  const roles = input.recipientRoles ?? rolesForNotificationType(input.type);
  const users = await listUsersByRoles(input.organizationId, roles, input.client);
  for (const u of users) userIds.add(u.id);

  if (input.alsoStaffId) {
    const staffUserId = await resolveUserIdForStaff(
      input.organizationId,
      input.alsoStaffId,
      input.client,
    );
    if (staffUserId) userIds.add(staffUserId);
  }

  let created = 0;
  for (const userId of Array.from(userIds)) {
    const result = await createNotificationForUser({
      organizationId: input.organizationId,
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      eventKey: input.eventKey,
      entityType: input.entityType,
      entityId: input.entityId,
      severity: input.severity,
      metadata: input.metadata,
      client: input.client,
    });
    if (result.created) created++;
  }
  return created;
}

export async function listNotifications(
  organizationId: string,
  userId: string,
  opts: {
    page?: number;
    limit?: number;
    category?: NotificationFilterCategory;
  },
): Promise<NotificationListResponse> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;
  const category = opts.category ?? "all";

  const conditions = [`n."organizationId" = $1`, `n."userId" = $2`];
  const params: unknown[] = [organizationId, userId];
  let i = 3;

  if (category === "unread") {
    conditions.push(`n."readAt" IS NULL`);
  } else {
    const types = typesForCategory(category);
    if (types?.length) {
      conditions.push(`n.type = ANY($${i}::"NotificationType"[])`);
      params.push(types);
      i++;
    }
  }

  const where = conditions.join(" AND ");

  const { rows: filteredCount } = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM "Notification" n WHERE ${where}`,
    params,
  );

  const { rows: unreadRows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Notification"
     WHERE "organizationId" = $1 AND "userId" = $2 AND "readAt" IS NULL`,
    [organizationId, userId],
  );

  const { rows } = await pool.query(
    `SELECT
      n.id, n."organizationId", n."userId", n.type::text AS type, n.title, n.message,
      n.severity::text AS severity, n."entityType", n."entityId", n."readAt", n.metadata, n."createdAt"
     FROM "Notification" n
     WHERE ${where}
     ORDER BY n."createdAt" DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset],
  );

  const total = parseInt(filteredCount[0]?.total ?? "0", 10);
  const unreadCount = parseInt(unreadRows[0]?.c ?? "0", 10);

  return {
    data: rows.map((r) => mapRow(r as Parameters<typeof mapRow>[0])),
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getUnreadNotificationCount(
  organizationId: string,
  userId: string,
): Promise<number> {
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Notification"
     WHERE "organizationId" = $1 AND "userId" = $2 AND "readAt" IS NULL`,
    [organizationId, userId],
  );
  return parseInt(rows[0]?.c ?? "0", 10);
}

export async function markNotificationRead(
  organizationId: string,
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE "Notification"
     SET "readAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3 AND "readAt" IS NULL`,
    [notificationId, organizationId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(
  organizationId: string,
  userId: string,
): Promise<number> {
  const result = await pool.query(
    `UPDATE "Notification"
     SET "readAt" = NOW()
     WHERE "organizationId" = $1 AND "userId" = $2 AND "readAt" IS NULL`,
    [organizationId, userId],
  );
  return result.rowCount ?? 0;
}

export async function getNotificationForUser(
  organizationId: string,
  userId: string,
  notificationId: string,
): Promise<NotificationItem | null> {
  const { rows } = await pool.query(
    `SELECT
      id, "organizationId", "userId", type::text AS type, title, message,
      severity::text AS severity, "entityType", "entityId", "readAt", metadata, "createdAt"
     FROM "Notification"
     WHERE id = $1 AND "organizationId" = $2 AND "userId" = $3`,
    [notificationId, organizationId, userId],
  );
  const row = rows[0];
  if (!row) return null;
  return mapRow(row as Parameters<typeof mapRow>[0]);
}

export { buildIdempotencyKey };
