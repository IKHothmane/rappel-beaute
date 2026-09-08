import { randomBytes } from "crypto";
import { Pool } from "pg";
import { emitNotification } from "@/lib/db/notifications";
import { writeAuditLog } from "@/lib/db/audit";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type SupportTicketCategory =
  | "TECHNICAL"
  | "BILLING"
  | "ACCOUNT"
  | "FEATURE_REQUEST"
  | "BUG"
  | "OTHER";

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SupportMessageSenderType = "INSTITUT" | "PLATFORM";

export type SupportTicketRow = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignedToPlatformUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  organizationName?: string;
  planCode?: string | null;
  createdByName?: string;
  lastMessagePreview?: string | null;
  lastMessageAt?: Date | null;
  lastSenderType?: SupportMessageSenderType | null;
};

export type SupportMessageRow = {
  id: string;
  ticketId: string;
  senderType: SupportMessageSenderType;
  senderUserId: string | null;
  senderPlatformUserId: string | null;
  message: string;
  createdAt: Date;
  senderName?: string | null;
};

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

const CATEGORIES = new Set<SupportTicketCategory>([
  "TECHNICAL",
  "BILLING",
  "ACCOUNT",
  "FEATURE_REQUEST",
  "BUG",
  "OTHER",
]);

const STATUSES = new Set<SupportTicketStatus>([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
]);

export function parseCategory(raw: unknown): SupportTicketCategory | null {
  const v = String(raw ?? "").toUpperCase();
  return CATEGORIES.has(v as SupportTicketCategory)
    ? (v as SupportTicketCategory)
    : null;
}

export function parseStatus(raw: unknown): SupportTicketStatus | null {
  const v = String(raw ?? "").toUpperCase();
  return STATUSES.has(v as SupportTicketStatus) ? (v as SupportTicketStatus) : null;
}

export async function listOrgSupportTickets(
  organizationId: string,
): Promise<SupportTicketRow[]> {
  const { rows } = await pool.query<SupportTicketRow>(
    `SELECT t.*,
       (SELECT LEFT(m.message, 120) FROM "SupportMessage" m
         WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessagePreview",
       (SELECT m."createdAt" FROM "SupportMessage" m
         WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessageAt",
       (SELECT m."senderType"::text FROM "SupportMessage" m
         WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastSenderType"
     FROM "SupportTicket" t
     WHERE t."organizationId" = $1
     ORDER BY t."updatedAt" DESC`,
    [organizationId],
  );
  return rows;
}

export async function getOrgSupportTicket(
  organizationId: string,
  ticketId: string,
): Promise<SupportTicketRow | null> {
  const { rows } = await pool.query<SupportTicketRow>(
    `SELECT t.*,
       u."firstName" || ' ' || u."lastName" AS "createdByName"
     FROM "SupportTicket" t
     JOIN "User" u ON u.id = t."createdByUserId"
     WHERE t.id = $1 AND t."organizationId" = $2
     LIMIT 1`,
    [ticketId, organizationId],
  );
  return rows[0] ?? null;
}

export async function listTicketMessages(ticketId: string): Promise<SupportMessageRow[]> {
  const { rows } = await pool.query<SupportMessageRow>(
    `SELECT m.*,
       CASE
         WHEN m."senderType" = 'INSTITUT' THEN COALESCE(u."firstName" || ' ' || u."lastName", 'Institut')
         ELSE COALESCE(p."firstName" || ' ' || p."lastName", 'Support')
       END AS "senderName"
     FROM "SupportMessage" m
     LEFT JOIN "User" u ON u.id = m."senderUserId"
     LEFT JOIN "PlatformUser" p ON p.id = m."senderPlatformUserId"
     WHERE m."ticketId" = $1
     ORDER BY m."createdAt" ASC`,
    [ticketId],
  );
  return rows;
}

export async function createSupportTicket(input: {
  organizationId: string;
  createdByUserId: string;
  actorName: string;
  subject: string;
  category: SupportTicketCategory;
  message: string;
  priority?: SupportTicketPriority;
}): Promise<{ ticket: SupportTicketRow; message: SupportMessageRow }> {
  const subject = input.subject.trim().slice(0, 200);
  const body = input.message.trim().slice(0, 5000);
  if (!subject || !body) throw new Error("INVALID_INPUT");

  const ticketId = newId("stk");
  const messageId = newId("smsg");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "SupportTicket" (
        id, "organizationId", "createdByUserId", subject, category, status, priority
      ) VALUES ($1,$2,$3,$4,$5::"SupportTicketCategory",'OPEN'::"SupportTicketStatus",$6::"SupportTicketPriority")`,
      [
        ticketId,
        input.organizationId,
        input.createdByUserId,
        subject,
        input.category,
        input.priority ?? "NORMAL",
      ],
    );
    await client.query(
      `INSERT INTO "SupportMessage" (
        id, "ticketId", "senderType", "senderUserId", message
      ) VALUES ($1,$2,'INSTITUT'::"SupportMessageSenderType",$3,$4)`,
      [messageId, ticketId, input.createdByUserId, body],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  await writeAuditLog({
    organizationId: input.organizationId,
    actorId: input.createdByUserId,
    actorName: input.actorName,
    entityType: "SupportTicket",
    entityId: ticketId,
    action: "CREATE",
    after: { subject, category: input.category },
  }).catch(() => undefined);

  const ticket = await getOrgSupportTicket(input.organizationId, ticketId);
  const messages = await listTicketMessages(ticketId);
  return { ticket: ticket!, message: messages[0]! };
}

export async function addOrgSupportMessage(input: {
  organizationId: string;
  ticketId: string;
  userId: string;
  actorName: string;
  message: string;
}): Promise<SupportMessageRow> {
  const ticket = await getOrgSupportTicket(input.organizationId, input.ticketId);
  if (!ticket) throw new Error("NOT_FOUND");
  if (ticket.status === "CLOSED") throw new Error("TICKET_CLOSED");

  const body = input.message.trim().slice(0, 5000);
  if (!body) throw new Error("INVALID_INPUT");

  const id = newId("smsg");
  await pool.query(
    `INSERT INTO "SupportMessage" (
      id, "ticketId", "senderType", "senderUserId", message
    ) VALUES ($1,$2,'INSTITUT'::"SupportMessageSenderType",$3,$4)`,
    [id, input.ticketId, input.userId, body],
  );

  const nextStatus: SupportTicketStatus =
    ticket.status === "WAITING_CUSTOMER" || ticket.status === "RESOLVED"
      ? "OPEN"
      : ticket.status;

  await pool.query(
    `UPDATE "SupportTicket"
     SET status = $1::"SupportTicketStatus",
         "updatedAt" = NOW(),
         "resolvedAt" = CASE WHEN $1 IN ('RESOLVED','CLOSED') THEN "resolvedAt" ELSE NULL END
     WHERE id = $2 AND "organizationId" = $3`,
    [nextStatus, input.ticketId, input.organizationId],
  );

  await writeAuditLog({
    organizationId: input.organizationId,
    actorId: input.userId,
    actorName: input.actorName,
    entityType: "SupportMessage",
    entityId: id,
    action: "CREATE",
    after: { ticketId: input.ticketId },
  }).catch(() => undefined);

  const messages = await listTicketMessages(input.ticketId);
  return messages.find((m) => m.id === id)!;
}

export type AdminSupportKpis = {
  open: number;
  inProgress: number;
  waitingCustomer: number;
  resolved: number;
};

export async function adminSupportKpis(): Promise<AdminSupportKpis> {
  const { rows } = await pool.query<{ status: SupportTicketStatus; n: string }>(
    `SELECT status::text AS status, COUNT(*)::text AS n
     FROM "SupportTicket"
     GROUP BY status`,
  );
  const map = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<
    string,
    number
  >;
  return {
    open: map.OPEN ?? 0,
    inProgress: map.IN_PROGRESS ?? 0,
    waitingCustomer: map.WAITING_CUSTOMER ?? 0,
    resolved: (map.RESOLVED ?? 0) + (map.CLOSED ?? 0),
  };
}

export async function adminListSupportTickets(filters?: {
  status?: SupportTicketStatus;
}): Promise<SupportTicketRow[]> {
  const params: unknown[] = [];
  let where = "";
  if (filters?.status) {
    params.push(filters.status);
    where = `WHERE t.status = $1::"SupportTicketStatus"`;
  }
  const { rows } = await pool.query<SupportTicketRow>(
    `SELECT t.*,
       o.name AS "organizationName",
       (SELECT pl.code FROM "Subscription" s
         JOIN "Plan" pl ON pl.id = s."planId"
         WHERE s."organizationId" = t."organizationId" AND s.status = 'ACTIVE'
         ORDER BY s."updatedAt" DESC LIMIT 1) AS "planCode",
       u."firstName" || ' ' || u."lastName" AS "createdByName",
       (SELECT LEFT(m.message, 120) FROM "SupportMessage" m
         WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessagePreview",
       (SELECT m."createdAt" FROM "SupportMessage" m
         WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessageAt",
       (SELECT m."senderType"::text FROM "SupportMessage" m
         WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC LIMIT 1) AS "lastSenderType"
     FROM "SupportTicket" t
     JOIN "Organization" o ON o.id = t."organizationId"
     JOIN "User" u ON u.id = t."createdByUserId"
     ${where}
     ORDER BY t."updatedAt" DESC
     LIMIT 200`,
    params,
  );
  return rows;
}

export async function adminGetSupportTicket(
  ticketId: string,
): Promise<SupportTicketRow | null> {
  const { rows } = await pool.query<SupportTicketRow>(
    `SELECT t.*,
       o.name AS "organizationName",
       (SELECT pl.code FROM "Subscription" s
         JOIN "Plan" pl ON pl.id = s."planId"
         WHERE s."organizationId" = t."organizationId" AND s.status = 'ACTIVE'
         ORDER BY s."updatedAt" DESC LIMIT 1) AS "planCode",
       u."firstName" || ' ' || u."lastName" AS "createdByName"
     FROM "SupportTicket" t
     JOIN "Organization" o ON o.id = t."organizationId"
     JOIN "User" u ON u.id = t."createdByUserId"
     WHERE t.id = $1
     LIMIT 1`,
    [ticketId],
  );
  return rows[0] ?? null;
}

export async function adminUpdateSupportTicket(input: {
  ticketId: string;
  platformUserId: string;
  platformUserName: string;
  status?: SupportTicketStatus;
  assignedToPlatformUserId?: string | null;
}): Promise<SupportTicketRow> {
  const existing = await adminGetSupportTicket(input.ticketId);
  if (!existing) throw new Error("NOT_FOUND");

  const status = input.status ?? existing.status;
  const assignee =
    input.assignedToPlatformUserId !== undefined
      ? input.assignedToPlatformUserId
      : existing.assignedToPlatformUserId;

  await pool.query(
    `UPDATE "SupportTicket"
     SET status = $1::"SupportTicketStatus",
         "assignedToPlatformUserId" = $2,
         "resolvedAt" = CASE
           WHEN $1 IN ('RESOLVED','CLOSED') THEN COALESCE("resolvedAt", NOW())
           ELSE NULL
         END,
         "updatedAt" = NOW()
     WHERE id = $3`,
    [status, assignee, input.ticketId],
  );

  await writePlatformAuditLog({
    platformUserId: input.platformUserId,
    platformUserName: input.platformUserName,
    organizationId: existing.organizationId,
    entityType: "SupportTicket",
    entityId: input.ticketId,
    action: "UPDATE",
    before: { status: existing.status, assignedToPlatformUserId: existing.assignedToPlatformUserId },
    after: { status, assignedToPlatformUserId: assignee },
  }).catch(() => undefined);

  return (await adminGetSupportTicket(input.ticketId))!;
}

export async function addPlatformSupportMessage(input: {
  ticketId: string;
  platformUserId: string;
  platformUserName: string;
  message: string;
}): Promise<SupportMessageRow> {
  const ticket = await adminGetSupportTicket(input.ticketId);
  if (!ticket) throw new Error("NOT_FOUND");
  if (ticket.status === "CLOSED") throw new Error("TICKET_CLOSED");

  const body = input.message.trim().slice(0, 5000);
  if (!body) throw new Error("INVALID_INPUT");

  const id = newId("smsg");
  await pool.query(
    `INSERT INTO "SupportMessage" (
      id, "ticketId", "senderType", "senderPlatformUserId", message
    ) VALUES ($1,$2,'PLATFORM'::"SupportMessageSenderType",$3,$4)`,
    [id, input.ticketId, input.platformUserId, body],
  );

  await pool.query(
    `UPDATE "SupportTicket"
     SET status = 'WAITING_CUSTOMER'::"SupportTicketStatus",
         "assignedToPlatformUserId" = COALESCE("assignedToPlatformUserId", $2),
         "updatedAt" = NOW()
     WHERE id = $1`,
    [input.ticketId, input.platformUserId],
  );

  await writePlatformAuditLog({
    platformUserId: input.platformUserId,
    platformUserName: input.platformUserName,
    organizationId: ticket.organizationId,
    entityType: "SupportMessage",
    entityId: id,
    action: "CREATE",
    after: { ticketId: input.ticketId },
  }).catch(() => undefined);

  await emitNotification({
    organizationId: ticket.organizationId,
    type: "SUPPORT_MESSAGE",
    eventKey: `support_reply_${id}`,
    title: "Réponse du support",
    message: `Réponse sur « ${ticket.subject} »`,
    entityType: "SupportTicket",
    entityId: ticket.id,
    recipientUserIds: [ticket.createdByUserId],
    severity: "INFO",
  }).catch(() => undefined);

  const messages = await listTicketMessages(input.ticketId);
  return messages.find((m) => m.id === id)!;
}
