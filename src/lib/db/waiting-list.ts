import { randomBytes } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import type {
  CreateWaitingListInput,
  WaitingListEntry,
  WaitingListStatus,
} from "@/types/waiting-list";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function mapRow(r: Record<string, unknown>): WaitingListEntry {
  const preferredDate = r.preferredDate as Date | string;
  const dateStr =
    preferredDate instanceof Date
      ? preferredDate.toISOString().slice(0, 10)
      : String(preferredDate).slice(0, 10);
  return {
    id: String(r.id),
    organizationId: String(r.organizationId),
    customerId: String(r.customerId),
    customerName: `${r.customerFirstName ?? ""} ${r.customerLastName ?? ""}`.trim(),
    customerPhone: String(r.customerPhone ?? ""),
    serviceId: String(r.serviceId),
    serviceName: String(r.serviceName ?? ""),
    staffId: (r.staffId as string) ?? null,
    staffName: r.staffFirstName
      ? `${r.staffFirstName} ${r.staffLastName ?? ""}`.trim()
      : null,
    preferredDate: dateStr,
    preferredTimeFrom: (r.preferredTimeFrom as string) ?? null,
    preferredTimeTo: (r.preferredTimeTo as string) ?? null,
    status: r.status as WaitingListStatus,
    notes: (r.notes as string) ?? null,
    notifiedAt: r.notifiedAt
      ? new Date(r.notifiedAt as Date).toISOString()
      : null,
    expiresAt: r.expiresAt ? new Date(r.expiresAt as Date).toISOString() : null,
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

const SELECT = `
  SELECT w.*,
    c."firstName" AS "customerFirstName",
    c."lastName" AS "customerLastName",
    c.phone AS "customerPhone",
    s.name AS "serviceName",
    st."firstName" AS "staffFirstName",
    st."lastName" AS "staffLastName"
  FROM "WaitingListEntry" w
  JOIN "Customer" c ON c.id = w."customerId"
  JOIN "Service" s ON s.id = w."serviceId"
  LEFT JOIN "Staff" st ON st.id = w."staffId"
`;

export async function listWaitingListEntries(
  organizationId: string,
  filters?: { status?: WaitingListStatus; serviceId?: string },
): Promise<WaitingListEntry[]> {
  await expireWaitingListEntries(organizationId);
  const params: unknown[] = [organizationId];
  const conds = [`w."organizationId" = $1`];
  let i = 2;
  if (filters?.status) {
    conds.push(`w.status = $${i++}::"WaitingListStatus"`);
    params.push(filters.status);
  }
  if (filters?.serviceId) {
    conds.push(`w."serviceId" = $${i++}`);
    params.push(filters.serviceId);
  }
  const { rows } = await pool.query(
    `${SELECT} WHERE ${conds.join(" AND ")}
     ORDER BY w."preferredDate" ASC, w."createdAt" ASC
     LIMIT 200`,
    params,
  );
  return rows.map((r) => mapRow(r as Record<string, unknown>));
}

export async function createWaitingListEntry(
  organizationId: string,
  input: CreateWaitingListInput,
  actor: { id: string; name?: string | null },
): Promise<WaitingListEntry> {
  const cust = await pool.query(
    `SELECT id FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [input.customerId, organizationId],
  );
  if (!cust.rows[0]) throw new Error("CUSTOMER_NOT_FOUND");

  const svc = await pool.query(
    `SELECT id FROM "Service" WHERE id = $1 AND "organizationId" = $2 AND active = true`,
    [input.serviceId, organizationId],
  );
  if (!svc.rows[0]) throw new Error("SERVICE_NOT_FOUND");

  if (input.staffId) {
    const st = await pool.query(
      `SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [input.staffId, organizationId],
    );
    if (!st.rows[0]) throw new Error("STAFF_NOT_FOUND");
  }

  const id = newId("wle");
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt)
    : new Date(Date.now() + 14 * 24 * 3600_000);

  await pool.query(
    `INSERT INTO "WaitingListEntry" (
      id, "organizationId", "customerId", "serviceId", "staffId",
      "preferredDate", "preferredTimeFrom", "preferredTimeTo",
      status, notes, "expiresAt", "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6::date,$7,$8,'WAITING'::"WaitingListStatus",$9,$10,NOW()
    )`,
    [
      id,
      organizationId,
      input.customerId,
      input.serviceId,
      input.staffId ?? null,
      input.preferredDate.slice(0, 10),
      input.preferredTimeFrom ?? null,
      input.preferredTimeTo ?? null,
      input.notes?.trim() || null,
      expiresAt,
    ],
  );

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name ?? undefined,
    entityType: "WaitingListEntry",
    entityId: id,
    action: "CREATE",
    after: { serviceId: input.serviceId, customerId: input.customerId },
  }).catch(() => undefined);

  const { rows } = await pool.query(`${SELECT} WHERE w.id = $1`, [id]);
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function updateWaitingListStatus(
  organizationId: string,
  entryId: string,
  status: WaitingListStatus,
  actor: { id: string; name?: string | null },
): Promise<WaitingListEntry | null> {
  const { rowCount } = await pool.query(
    `UPDATE "WaitingListEntry"
     SET status = $1::"WaitingListStatus",
         "notifiedAt" = CASE
           WHEN $1 = 'NOTIFIED' THEN COALESCE("notifiedAt", NOW())
           ELSE "notifiedAt"
         END,
         "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,
    [status, entryId, organizationId],
  );
  if (!rowCount) return null;

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name ?? undefined,
    entityType: "WaitingListEntry",
    entityId: entryId,
    action: "UPDATE",
    after: { status },
  }).catch(() => undefined);

  const { rows } = await pool.query(
    `${SELECT} WHERE w.id = $1 AND w."organizationId" = $2`,
    [entryId, organizationId],
  );
  return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function expireWaitingListEntries(organizationId: string): Promise<number> {
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE "WaitingListEntry"
     SET status = 'EXPIRED'::"WaitingListStatus", "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "expiresAt" IS NOT NULL
       AND "expiresAt" < NOW()
     RETURNING id`,
    [organizationId],
  );
  return rows.length;
}

/**
 * Après annulation d'un RDV : trouve les entrées WAITING compatibles
 * et prépare des WhatsAppTask WAITING_LIST (pas de booking auto).
 */
export async function notifyWaitingListOnCancellation(input: {
  organizationId: string;
  appointmentId: string;
  serviceId: string;
  staffId: string;
  startAt: Date;
  actor: { id: string; name?: string | null };
}): Promise<{ notified: number }> {
  await expireWaitingListEntries(input.organizationId);

  const day = input.startAt.toISOString().slice(0, 10);
  const time = input.startAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Casablanca",
  });

  const { rows } = await pool.query<{
    id: string;
    customerId: string;
    preferredTimeFrom: string | null;
    preferredTimeTo: string | null;
    staffId: string | null;
  }>(
    `SELECT id, "customerId", "preferredTimeFrom", "preferredTimeTo", "staffId"
     FROM "WaitingListEntry"
     WHERE "organizationId" = $1
       AND status = 'WAITING'::"WaitingListStatus"
       AND "serviceId" = $2
       AND "preferredDate" = $3::date
       AND ("staffId" IS NULL OR "staffId" = $4)
     ORDER BY "createdAt" ASC
     LIMIT 5`,
    [input.organizationId, input.serviceId, day, input.staffId],
  );

  const matches = rows.filter((r) => {
    if (r.preferredTimeFrom && time < r.preferredTimeFrom) return false;
    if (r.preferredTimeTo && time > r.preferredTimeTo) return false;
    return true;
  });

  if (!matches.length) return { notified: 0 };

  const { enqueueWaitingListOffer } = await import("@/lib/db/whatsapp");
  let notified = 0;

  for (const m of matches) {
    try {
      await enqueueWaitingListOffer({
        organizationId: input.organizationId,
        customerId: m.customerId,
        appointmentId: input.appointmentId,
        waitingListEntryId: m.id,
        serviceId: input.serviceId,
        startAt: input.startAt,
      });
      await updateWaitingListStatus(input.organizationId, m.id, "NOTIFIED", input.actor);
      notified += 1;
    } catch (e) {
      console.error("[notifyWaitingListOnCancellation]", e);
    }
  }

  return { notified };
}

export async function getWaitingListEntry(
  organizationId: string,
  entryId: string,
): Promise<WaitingListEntry | null> {
  const { rows } = await pool.query(
    `${SELECT} WHERE w.id = $1 AND w."organizationId" = $2`,
    [entryId, organizationId],
  );
  return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null;
}
