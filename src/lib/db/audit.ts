import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export async function writeAuditLog(opts: {
  organizationId: string;
  actorId?: string | null;
  actorName?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  client?: PoolClient;
}): Promise<void> {
  const c = opts.client ?? pool;
  await c.query(
    `INSERT INTO "AuditLog" (
      id, "organizationId", "actorId", "actorName", "entityType", "entityId",
      action, "before", "after"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
    [
      newId("aud"),
      opts.organizationId,
      opts.actorId ?? null,
      opts.actorName ?? null,
      opts.entityType,
      opts.entityId,
      opts.action,
      opts.before != null ? JSON.stringify(opts.before) : null,
      opts.after != null ? JSON.stringify(opts.after) : null,
    ],
  );
}
