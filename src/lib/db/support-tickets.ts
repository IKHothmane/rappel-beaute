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
  | "OTHER"
  | "LOGIN"
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "APPOINTMENTS"
  | "CUSTOMERS"
  | "STOCK"
  | "MARKETING"
  | "WHATSAPP"
  | "AI";

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SupportMessageSenderType = "INSTITUT" | "PLATFORM";

export type SupportTicketRow = {
  id: string;
  ticketNumber: number;
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
  firstResponseAt: Date | null;
  satisfactionRating: number | null;
  satisfactionComment: string | null;
  satisfactionAt: Date | null;
  organizationName?: string;
  planCode?: string | null;
  createdByName?: string;
  createdByEmail?: string | null;
  assignedToName?: string | null;
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
  isInternal: boolean;
  createdAt: Date;
  senderName?: string | null;
};

export type PlatformAssignee = {
  id: string;
  name: string;
  email: string;
  role: string;
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
  "LOGIN",
  "SUBSCRIPTION",
  "PAYMENT",
  "APPOINTMENTS",
  "CUSTOMERS",
  "STOCK",
  "MARKETING",
  "WHATSAPP",
  "AI",
]);

const STATUSES = new Set<SupportTicketStatus>([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
]);

const PRIORITIES = new Set<SupportTicketPriority>(["LOW", "NORMAL", "HIGH", "URGENT"]);

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

export function parsePriority(raw: unknown): SupportTicketPriority | null {
  const v = String(raw ?? "").toUpperCase();
  return PRIORITIES.has(v as SupportTicketPriority)
    ? (v as SupportTicketPriority)
    : null;
}

export function formatTicketRef(ticketNumber: number | null | undefined, id?: string) {
  if (ticketNumber != null && ticketNumber > 0) return `#RB-${ticketNumber}`;
  if (id) return `#${id.slice(-6).toUpperCase()}`;
  return "#RB-????";
}

const TICKET_SELECT = `
  t.*,
  COALESCE(t."ticketNumber", 0) AS "ticketNumber",
  o.name AS "organizationName",
  (SELECT pl.code FROM "Subscription" s
    JOIN "Plan" pl ON pl.id = s."planId"
    WHERE s."organizationId" = t."organizationId" AND s.status = 'ACTIVE'
    ORDER BY s."updatedAt" DESC LIMIT 1) AS "planCode",
  u."firstName" || ' ' || u."lastName" AS "createdByName",
  u.email AS "createdByEmail",
  CASE WHEN ap.id IS NOT NULL
    THEN ap."firstName" || ' ' || ap."lastName"
    ELSE NULL END AS "assignedToName",
  (SELECT LEFT(m.message, 120) FROM "SupportMessage" m
    WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
    ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessagePreview",
  (SELECT m."createdAt" FROM "SupportMessage" m
    WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
    ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessageAt",
  (SELECT m."senderType"::text FROM "SupportMessage" m
    WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
    ORDER BY m."createdAt" DESC LIMIT 1) AS "lastSenderType"
`;

export async function listOrgSupportTickets(
  organizationId: string,
): Promise<SupportTicketRow[]> {
  const { rows } = await pool.query<SupportTicketRow>(
    `SELECT t.*,
       COALESCE(t."ticketNumber", 0) AS "ticketNumber",
       (SELECT LEFT(m.message, 120) FROM "SupportMessage" m
         WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
         ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessagePreview",
       (SELECT m."createdAt" FROM "SupportMessage" m
         WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
         ORDER BY m."createdAt" DESC LIMIT 1) AS "lastMessageAt",
       (SELECT m."senderType"::text FROM "SupportMessage" m
         WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
         ORDER BY m."createdAt" DESC LIMIT 1) AS "lastSenderType"
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
       COALESCE(t."ticketNumber", 0) AS "ticketNumber",
       u."firstName" || ' ' || u."lastName" AS "createdByName",
       u.email AS "createdByEmail"
     FROM "SupportTicket" t
     JOIN "User" u ON u.id = t."createdByUserId"
     WHERE t.id = $1 AND t."organizationId" = $2
     LIMIT 1`,
    [ticketId, organizationId],
  );
  return rows[0] ?? null;
}

export async function listTicketMessages(
  ticketId: string,
  opts?: { includeInternal?: boolean },
): Promise<SupportMessageRow[]> {
  const includeInternal = opts?.includeInternal ?? false;
  const { rows } = await pool.query<SupportMessageRow>(
    `SELECT m.*,
       COALESCE(m."isInternal", false) AS "isInternal",
       CASE
         WHEN m."senderType" = 'INSTITUT' THEN COALESCE(u."firstName" || ' ' || u."lastName", 'Institut')
         ELSE COALESCE(p."firstName" || ' ' || p."lastName", 'Support')
       END AS "senderName"
     FROM "SupportMessage" m
     LEFT JOIN "User" u ON u.id = m."senderUserId"
     LEFT JOIN "PlatformUser" p ON p.id = m."senderPlatformUserId"
     WHERE m."ticketId" = $1
       AND ($2::boolean OR COALESCE(m."isInternal", false) = false)
     ORDER BY m."createdAt" ASC`,
    [ticketId, includeInternal],
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
        id, "ticketId", "senderType", "senderUserId", message, "isInternal"
      ) VALUES ($1,$2,'INSTITUT'::"SupportMessageSenderType",$3,$4,false)`,
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
      id, "ticketId", "senderType", "senderUserId", message, "isInternal"
    ) VALUES ($1,$2,'INSTITUT'::"SupportMessageSenderType",$3,$4,false)`,
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
  total: number;
  open: number;
  inProgress: number;
  waitingCustomer: number;
  resolved: number;
  closed: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  avgSatisfaction: number | null;
};

export type AdminSupportAttention = {
  urgentOpen: number;
  highOpen: number;
  waitingCustomer: number;
  staleNoReply: number;
};

export type AdminSupportFilters = {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  organizationId?: string;
  assignedToPlatformUserId?: string | null;
  search?: string;
  attention?: "urgent" | "high" | "waiting" | "stale";
};

function formatDurationMinutes(mins: number | null): string {
  if (mins == null || Number.isNaN(mins)) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2, "0")}`;
}

export { formatDurationMinutes };

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
  const open = map.OPEN ?? 0;
  const inProgress = map.IN_PROGRESS ?? 0;
  const waitingCustomer = map.WAITING_CUSTOMER ?? 0;
  const resolved = map.RESOLVED ?? 0;
  const closed = map.CLOSED ?? 0;

  const { rows: sla } = await pool.query<{
    avgResponse: string | null;
    avgResolve: string | null;
    avgSat: string | null;
  }>(
    `SELECT
       AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60)
         FILTER (WHERE "firstResponseAt" IS NOT NULL)::text AS "avgResponse",
       AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60)
         FILTER (WHERE "resolvedAt" IS NOT NULL)::text AS "avgResolve",
       AVG("satisfactionRating") FILTER (WHERE "satisfactionRating" IS NOT NULL)::text AS "avgSat"
     FROM "SupportTicket"`,
  );

  return {
    total: open + inProgress + waitingCustomer + resolved + closed,
    open,
    inProgress,
    waitingCustomer,
    resolved: resolved + closed,
    closed,
    avgFirstResponseMinutes: sla[0]?.avgResponse ? Number(sla[0].avgResponse) : null,
    avgResolutionMinutes: sla[0]?.avgResolve ? Number(sla[0].avgResolve) : null,
    avgSatisfaction: sla[0]?.avgSat ? Number(Number(sla[0].avgSat).toFixed(1)) : null,
  };
}

export async function adminSupportAttention(): Promise<AdminSupportAttention> {
  const { rows } = await pool.query<{
    urgentOpen: string;
    highOpen: string;
    waitingCustomer: string;
    staleNoReply: string;
  }>(
    `SELECT
      COUNT(*) FILTER (
        WHERE priority = 'URGENT' AND status IN ('OPEN','IN_PROGRESS')
      )::text AS "urgentOpen",
      COUNT(*) FILTER (
        WHERE priority = 'HIGH' AND status IN ('OPEN','IN_PROGRESS')
      )::text AS "highOpen",
      COUNT(*) FILTER (WHERE status = 'WAITING_CUSTOMER')::text AS "waitingCustomer",
      COUNT(*) FILTER (
        WHERE status IN ('OPEN','IN_PROGRESS')
          AND (
            SELECT m."createdAt" FROM "SupportMessage" m
            WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
            ORDER BY m."createdAt" DESC LIMIT 1
          ) < NOW() - INTERVAL '2 hours'
          AND (
            SELECT m."senderType"::text FROM "SupportMessage" m
            WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
            ORDER BY m."createdAt" DESC LIMIT 1
          ) = 'INSTITUT'
      )::text AS "staleNoReply"
     FROM "SupportTicket" t`,
  );
  const r = rows[0];
  return {
    urgentOpen: Number(r?.urgentOpen ?? 0),
    highOpen: Number(r?.highOpen ?? 0),
    waitingCustomer: Number(r?.waitingCustomer ?? 0),
    staleNoReply: Number(r?.staleNoReply ?? 0),
  };
}

export async function adminListSupportTickets(
  filters?: AdminSupportFilters,
): Promise<SupportTicketRow[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (filters?.status) {
    params.push(filters.status);
    clauses.push(`t.status = $${params.length}::"SupportTicketStatus"`);
  }
  if (filters?.priority) {
    params.push(filters.priority);
    clauses.push(`t.priority = $${params.length}::"SupportTicketPriority"`);
  }
  if (filters?.category) {
    params.push(filters.category);
    clauses.push(`t.category = $${params.length}::"SupportTicketCategory"`);
  }
  if (filters?.organizationId) {
    params.push(filters.organizationId);
    clauses.push(`t."organizationId" = $${params.length}`);
  }
  if (filters?.assignedToPlatformUserId === null) {
    clauses.push(`t."assignedToPlatformUserId" IS NULL`);
  } else if (filters?.assignedToPlatformUserId) {
    params.push(filters.assignedToPlatformUserId);
    clauses.push(`t."assignedToPlatformUserId" = $${params.length}`);
  }
  if (filters?.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    const i = params.length;
    clauses.push(
      `(t.subject ILIKE $${i} OR o.name ILIKE $${i} OR CAST(t."ticketNumber" AS text) ILIKE $${i}
        OR u."firstName" || ' ' || u."lastName" ILIKE $${i} OR u.email ILIKE $${i})`,
    );
  }
  if (filters?.attention === "urgent") {
    clauses.push(`t.priority = 'URGENT' AND t.status IN ('OPEN','IN_PROGRESS')`);
  } else if (filters?.attention === "high") {
    clauses.push(`t.priority = 'HIGH' AND t.status IN ('OPEN','IN_PROGRESS')`);
  } else if (filters?.attention === "waiting") {
    clauses.push(`t.status = 'WAITING_CUSTOMER'`);
  } else if (filters?.attention === "stale") {
    clauses.push(`t.status IN ('OPEN','IN_PROGRESS')
      AND (SELECT m."createdAt" FROM "SupportMessage" m
           WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
           ORDER BY m."createdAt" DESC LIMIT 1) < NOW() - INTERVAL '2 hours'
      AND (SELECT m."senderType"::text FROM "SupportMessage" m
           WHERE m."ticketId" = t.id AND COALESCE(m."isInternal", false) = false
           ORDER BY m."createdAt" DESC LIMIT 1) = 'INSTITUT'`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query<SupportTicketRow>(
    `SELECT ${TICKET_SELECT}
     FROM "SupportTicket" t
     JOIN "Organization" o ON o.id = t."organizationId"
     JOIN "User" u ON u.id = t."createdByUserId"
     LEFT JOIN "PlatformUser" ap ON ap.id = t."assignedToPlatformUserId"
     ${where}
     ORDER BY
       CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
       t."updatedAt" DESC
     LIMIT 300`,
    params,
  );
  return rows;
}

export async function adminGetSupportTicket(
  ticketId: string,
): Promise<SupportTicketRow | null> {
  const { rows } = await pool.query<SupportTicketRow>(
    `SELECT ${TICKET_SELECT}
     FROM "SupportTicket" t
     JOIN "Organization" o ON o.id = t."organizationId"
     JOIN "User" u ON u.id = t."createdByUserId"
     LEFT JOIN "PlatformUser" ap ON ap.id = t."assignedToPlatformUserId"
     WHERE t.id = $1
     LIMIT 1`,
    [ticketId],
  );
  return rows[0] ?? null;
}

export async function listPlatformAssignees(): Promise<PlatformAssignee[]> {
  const { rows } = await pool.query<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }>(
    `SELECT id, "firstName", "lastName", email, role::text AS role
     FROM "PlatformUser"
     WHERE status = 'ACTIVE'
     ORDER BY "firstName", "lastName"`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`.trim(),
    email: r.email,
    role: r.role,
  }));
}

export async function adminUpdateSupportTicket(input: {
  ticketId: string;
  platformUserId: string;
  platformUserName: string;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
  assignedToPlatformUserId?: string | null;
}): Promise<SupportTicketRow> {
  const existing = await adminGetSupportTicket(input.ticketId);
  if (!existing) throw new Error("NOT_FOUND");

  const status = input.status ?? existing.status;
  const priority = input.priority ?? existing.priority;
  const category = input.category ?? existing.category;
  const assignee =
    input.assignedToPlatformUserId !== undefined
      ? input.assignedToPlatformUserId
      : existing.assignedToPlatformUserId;

  await pool.query(
    `UPDATE "SupportTicket"
     SET status = $1::"SupportTicketStatus",
         priority = $2::"SupportTicketPriority",
         category = $3::"SupportTicketCategory",
         "assignedToPlatformUserId" = $4,
         "resolvedAt" = CASE
           WHEN $1 IN ('RESOLVED','CLOSED') THEN COALESCE("resolvedAt", NOW())
           ELSE NULL
         END,
         "updatedAt" = NOW()
     WHERE id = $5`,
    [status, priority, category, assignee, input.ticketId],
  );

  await writePlatformAuditLog({
    platformUserId: input.platformUserId,
    platformUserName: input.platformUserName,
    organizationId: existing.organizationId,
    entityType: "SupportTicket",
    entityId: input.ticketId,
    action: "UPDATE",
    before: {
      status: existing.status,
      priority: existing.priority,
      category: existing.category,
      assignedToPlatformUserId: existing.assignedToPlatformUserId,
    },
    after: { status, priority, category, assignedToPlatformUserId: assignee },
  }).catch(() => undefined);

  return (await adminGetSupportTicket(input.ticketId))!;
}

export async function addPlatformSupportMessage(input: {
  ticketId: string;
  platformUserId: string;
  platformUserName: string;
  message: string;
  isInternal?: boolean;
  setStatus?: SupportTicketStatus;
}): Promise<SupportMessageRow> {
  const ticket = await adminGetSupportTicket(input.ticketId);
  if (!ticket) throw new Error("NOT_FOUND");
  if (ticket.status === "CLOSED" && !input.isInternal) throw new Error("TICKET_CLOSED");

  const body = input.message.trim().slice(0, 5000);
  if (!body) throw new Error("INVALID_INPUT");

  const isInternal = Boolean(input.isInternal);
  const id = newId("smsg");
  await pool.query(
    `INSERT INTO "SupportMessage" (
      id, "ticketId", "senderType", "senderPlatformUserId", message, "isInternal"
    ) VALUES ($1,$2,'PLATFORM'::"SupportMessageSenderType",$3,$4,$5)`,
    [id, input.ticketId, input.platformUserId, body, isInternal],
  );

  if (!isInternal) {
    const nextStatus = input.setStatus ?? "WAITING_CUSTOMER";
    await pool.query(
      `UPDATE "SupportTicket"
       SET status = $1::"SupportTicketStatus",
           "assignedToPlatformUserId" = COALESCE("assignedToPlatformUserId", $2),
           "firstResponseAt" = COALESCE("firstResponseAt", NOW()),
           "updatedAt" = NOW(),
           "resolvedAt" = CASE
             WHEN $1 IN ('RESOLVED','CLOSED') THEN COALESCE("resolvedAt", NOW())
             ELSE "resolvedAt"
           END
       WHERE id = $3`,
      [nextStatus, input.platformUserId, input.ticketId],
    );

    await emitNotification({
      organizationId: ticket.organizationId,
      type: "SUPPORT_MESSAGE",
      eventKey: `support_reply_${id}`,
      title: `Ticket ${formatTicketRef(ticket.ticketNumber, ticket.id)}`,
      message: `Votre demande a reçu une réponse : « ${ticket.subject} »`,
      entityType: "SupportTicket",
      entityId: ticket.id,
      recipientUserIds: [ticket.createdByUserId],
      severity: "INFO",
    }).catch(() => undefined);
  } else {
    await pool.query(
      `UPDATE "SupportTicket" SET "updatedAt" = NOW() WHERE id = $1`,
      [input.ticketId],
    );
  }

  await writePlatformAuditLog({
    platformUserId: input.platformUserId,
    platformUserName: input.platformUserName,
    organizationId: ticket.organizationId,
    entityType: "SupportMessage",
    entityId: id,
    action: "CREATE",
    after: { ticketId: input.ticketId, isInternal },
  }).catch(() => undefined);

  const messages = await listTicketMessages(input.ticketId, { includeInternal: true });
  return messages.find((m) => m.id === id)!;
}

export async function adminCreateSupportTicket(input: {
  organizationId: string;
  createdByUserId: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  message: string;
  platformUserId: string;
  platformUserName: string;
  assignedToPlatformUserId?: string | null;
}): Promise<SupportTicketRow> {
  const subject = input.subject.trim().slice(0, 200);
  const body = input.message.trim().slice(0, 5000);
  if (!subject || !body) throw new Error("INVALID_INPUT");

  const { rows: userCheck } = await pool.query<{ id: string }>(
    `SELECT id FROM "User" WHERE id = $1 AND "organizationId" = $2 LIMIT 1`,
    [input.createdByUserId, input.organizationId],
  );
  if (!userCheck[0]) throw new Error("USER_NOT_IN_ORG");

  const ticketId = newId("stk");
  const messageId = newId("smsg");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "SupportTicket" (
        id, "organizationId", "createdByUserId", subject, category, status, priority,
        "assignedToPlatformUserId"
      ) VALUES (
        $1,$2,$3,$4,$5::"SupportTicketCategory",'OPEN'::"SupportTicketStatus",
        $6::"SupportTicketPriority",$7
      )`,
      [
        ticketId,
        input.organizationId,
        input.createdByUserId,
        subject,
        input.category,
        input.priority,
        input.assignedToPlatformUserId ?? input.platformUserId,
      ],
    );
    await client.query(
      `INSERT INTO "SupportMessage" (
        id, "ticketId", "senderType", "senderPlatformUserId", message, "isInternal"
      ) VALUES ($1,$2,'PLATFORM'::"SupportMessageSenderType",$3,$4,false)`,
      [messageId, ticketId, input.platformUserId, body],
    );
    await client.query(
      `UPDATE "SupportTicket"
       SET "firstResponseAt" = NOW(), status = 'IN_PROGRESS'::"SupportTicketStatus"
       WHERE id = $1`,
      [ticketId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  await writePlatformAuditLog({
    platformUserId: input.platformUserId,
    platformUserName: input.platformUserName,
    organizationId: input.organizationId,
    entityType: "SupportTicket",
    entityId: ticketId,
    action: "CREATE",
    after: { subject, category: input.category, priority: input.priority },
  }).catch(() => undefined);

  await emitNotification({
    organizationId: input.organizationId,
    type: "SUPPORT_MESSAGE",
    eventKey: `support_created_${ticketId}`,
    title: "Nouveau ticket support",
    message: `Un ticket a été ouvert : « ${subject} »`,
    entityType: "SupportTicket",
    entityId: ticketId,
    recipientUserIds: [input.createdByUserId],
    severity: "INFO",
  }).catch(() => undefined);

  return (await adminGetSupportTicket(ticketId))!;
}

export async function adminSetSatisfaction(input: {
  ticketId: string;
  rating: number;
  comment?: string;
}): Promise<SupportTicketRow> {
  if (input.rating < 1 || input.rating > 5) throw new Error("INVALID_INPUT");
  const existing = await adminGetSupportTicket(input.ticketId);
  if (!existing) throw new Error("NOT_FOUND");

  await pool.query(
    `UPDATE "SupportTicket"
     SET "satisfactionRating" = $1,
         "satisfactionComment" = $2,
         "satisfactionAt" = NOW(),
         "updatedAt" = NOW()
     WHERE id = $3`,
    [input.rating, input.comment?.trim().slice(0, 1000) ?? null, input.ticketId],
  );
  return (await adminGetSupportTicket(input.ticketId))!;
}

export type SupportAnalytics = {
  byDay: { date: string; label: string; count: number }[];
  byCategory: { category: SupportTicketCategory; count: number }[];
  byPriority: { priority: SupportTicketPriority; count: number; percent: number }[];
  responseByWeekday: { weekday: number; label: string; avgMinutes: number | null }[];
};

export async function adminSupportAnalytics(): Promise<SupportAnalytics> {
  const { rows: byDay } = await pool.query<{ d: string; n: string }>(
    `SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Africa/Casablanca'), 'YYYY-MM-DD') AS d,
            COUNT(*)::text AS n
     FROM "SupportTicket"
     WHERE "createdAt" >= NOW() - INTERVAL '30 days'
     GROUP BY 1
     ORDER BY 1`,
  );

  const { rows: byCat } = await pool.query<{ category: SupportTicketCategory; n: string }>(
    `SELECT category::text AS category, COUNT(*)::text AS n
     FROM "SupportTicket"
     GROUP BY category
     ORDER BY n DESC`,
  );

  const { rows: byPri } = await pool.query<{ priority: SupportTicketPriority; n: string }>(
    `SELECT priority::text AS priority, COUNT(*)::text AS n
     FROM "SupportTicket"
     GROUP BY priority`,
  );
  const priTotal = byPri.reduce((s, r) => s + Number(r.n), 0) || 1;

  const WEEKDAY = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const { rows: byWd } = await pool.query<{ dow: string; avg: string | null }>(
    `SELECT EXTRACT(DOW FROM "firstResponseAt" AT TIME ZONE 'Africa/Casablanca')::int AS dow,
            AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60)::text AS avg
     FROM "SupportTicket"
     WHERE "firstResponseAt" IS NOT NULL
       AND "createdAt" >= NOW() - INTERVAL '60 days'
     GROUP BY 1`,
  );

  return {
    byDay: byDay.map((r) => ({
      date: r.d,
      label: r.d.slice(5),
      count: Number(r.n),
    })),
    byCategory: byCat.map((r) => ({
      category: r.category,
      count: Number(r.n),
    })),
    byPriority: (["URGENT", "HIGH", "NORMAL", "LOW"] as SupportTicketPriority[]).map(
      (p) => {
        const count = Number(byPri.find((r) => r.priority === p)?.n ?? 0);
        return {
          priority: p,
          count,
          percent: Math.round((count / priTotal) * 1000) / 10,
        };
      },
    ),
    responseByWeekday: [1, 2, 3, 4, 5].map((dow) => {
      const row = byWd.find((r) => Number(r.dow) === dow);
      return {
        weekday: dow,
        label: WEEKDAY[dow],
        avgMinutes: row?.avg != null ? Number(row.avg) : null,
      };
    }),
  };
}

export async function listOrgUsersForSupport(organizationId: string) {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>(
    `SELECT id,
            "firstName" || ' ' || "lastName" AS name,
            email,
            role::text AS role
     FROM "User"
     WHERE "organizationId" = $1 AND status = 'ACTIVE'
     ORDER BY
       CASE role WHEN 'OWNER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,
       "firstName"`,
    [organizationId],
  );
  return rows;
}

export async function listOrgsForSupportPicker() {
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM "Organization"
     WHERE status != 'ARCHIVED'
     ORDER BY name
     LIMIT 500`,
  );
  return rows;
}

export function serializeTicket(t: SupportTicketRow) {
  return {
    ...t,
    ref: formatTicketRef(t.ticketNumber, t.id),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    firstResponseAt: t.firstResponseAt?.toISOString() ?? null,
    satisfactionAt: t.satisfactionAt?.toISOString() ?? null,
    lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
  };
}

export function serializeMessage(m: SupportMessageRow) {
  return {
    ...m,
    isInternal: Boolean(m.isInternal),
    createdAt: m.createdAt.toISOString(),
  };
}
