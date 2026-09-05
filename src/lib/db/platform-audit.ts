import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export async function writePlatformAuditLog(opts: {
  platformUserId?: string | null;
  platformUserName?: string | null;
  organizationId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  client?: PoolClient;
}): Promise<void> {
  const c = opts.client ?? pool;
  await c.query(
    `INSERT INTO "PlatformAuditLog" (
      id, "platformUserId", "platformUserName", "organizationId",
      "entityType", "entityId", action, "before", "after"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
    [
      newId("paud"),
      opts.platformUserId ?? null,
      opts.platformUserName ?? null,
      opts.organizationId ?? null,
      opts.entityType,
      opts.entityId,
      opts.action,
      opts.before != null ? JSON.stringify(opts.before) : null,
      opts.after != null ? JSON.stringify(opts.after) : null,
    ],
  );
}

export async function listPlatformAuditLogs(opts: {
  limit?: number;
  organizationId?: string;
}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const params: unknown[] = [];
  let where = "";
  if (opts.organizationId) {
    params.push(opts.organizationId);
    where = `WHERE a."organizationId" = $1`;
  }
  params.push(limit);

  const { rows } = await pool.query<{
    id: string;
    platformUserName: string | null;
    organizationId: string | null;
    organizationName: string | null;
    entityType: string;
    entityId: string;
    action: string;
    before: unknown;
    after: unknown;
    createdAt: Date;
  }>(
    `SELECT a.id, a."platformUserName", a."organizationId", o.name AS "organizationName",
            a."entityType", a."entityId", a.action, a."before", a."after", a."createdAt"
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
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    before: r.before,
    after: r.after,
    createdAt: r.createdAt.toISOString(),
  }));
}
