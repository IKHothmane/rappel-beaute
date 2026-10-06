import { createHash, randomBytes } from "crypto";
import { pool } from "@/lib/db/pool";
import { isExclusionViolation } from "@/lib/db/appointments";
import {
  dispatchPublicBookingSideEffects,
  getPublicAvailabilitySlots,
  getPublicServices,
  insertOrganizationBooking,
  planPublicSlot,
} from "@/lib/db/public-booking";
import { businessParts } from "@/lib/time/business-timezone";
import { normalizePhone } from "@/lib/validation/customer";

const PROPOSAL_MS = 10 * 60 * 1000;
const AUTHORITY_KEYS = [
  "organizationId",
  "customerId",
  "employeeId",
  "staffId",
  "price",
  "startAt",
  "endAt",
  "appointmentId",
];

export type AssistantProposalView = {
  actionId: string;
  status: string;
  expiresAt: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  reference?: string;
  startAt?: string;
  endAt?: string;
  appointmentStatus?: string;
};

type ProposalPayload = {
  serviceId: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  phone: string;
  serviceName: string;
  price: number;
  reference?: string;
};

type ActionRow = {
  id: string;
  type?: string;
  status: string;
  payload: ProposalPayload;
  result: {
    reference?: string;
    startAt?: string;
    endAt?: string;
    price?: number;
    status?: string;
  } | null;
  expiresAt: Date;
  organizationId: string;
  widgetSessionId: string | null;
};

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function clientAuthorityKey(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  return AUTHORITY_KEYS.find((key) => Object.prototype.hasOwnProperty.call(raw, key)) ?? null;
}

function parseProposal(body: unknown): ProposalPayload | { error: string } {
  if (!body || typeof body !== "object") return { error: "Corps de requête invalide." };
  const raw = body as Record<string, unknown>;
  const serviceId = text(raw.serviceId, 80);
  const date = text(raw.date, 10);
  const time = text(raw.time, 5);
  const firstName = text(raw.firstName, 80);
  const lastName = text(raw.lastName, 80);
  const phone = normalizePhone(text(raw.phone, 20));
  if (!serviceId) return { error: "Service requis." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Date invalide." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Heure invalide." };
  if (!firstName) return { error: "Prénom requis." };
  if (!lastName) return { error: "Nom requis." };
  if (phone.length < 8) return { error: "Téléphone invalide." };
  return { serviceId, date, time, firstName, lastName, phone, serviceName: "", price: 0 };
}

function viewOf(row: ActionRow): AssistantProposalView {
  const executed = row.status === "EXECUTED" ? row.result : null;
  return {
    actionId: row.id,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    serviceName: row.payload.serviceName,
    date: row.payload.date,
    time: row.payload.time,
    price: executed?.price ?? row.payload.price,
    reference: executed?.reference,
    startAt: executed?.startAt,
    endAt: executed?.endAt,
    appointmentStatus: executed?.status,
  };
}

function samePayload(stored: ProposalPayload, next: ProposalPayload): boolean {
  return (
    stored.serviceId === next.serviceId &&
    stored.date === next.date &&
    stored.time === next.time &&
    stored.firstName === next.firstName &&
    stored.lastName === next.lastName &&
    stored.phone === next.phone
  );
}

async function loadAction(id: string): Promise<ActionRow | null> {
  const { rows } = await pool.query<ActionRow>(
    `SELECT a.id, a.type::text AS type, a.status::text AS status, a.payload, a.result, a."expiresAt",
            a."organizationId", c."widgetSessionId"
     FROM "AssistantAction" a
     JOIN "AssistantConversation" c ON c.id = a."conversationId"
     WHERE a.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function proposeAssistantAppointment(input: {
  session: { id: string; organizationId: string };
  body: unknown;
  idempotencyKey?: string | null;
}): Promise<AssistantProposalView> {
  const parsed = parseProposal(input.body);
  if ("error" in parsed) throw new Error(parsed.error);
  const service = (await getPublicServices(input.session.organizationId)).find(
    (item) => item.id === parsed.serviceId,
  );
  if (!service) throw new Error("SERVICE_NOT_FOUND");
  const slots = await getPublicAvailabilitySlots(input.session.organizationId, {
    serviceId: service.id,
    date: parsed.date,
  });
  if (!slots.some((slot) => slot.time === parsed.time && slot.available)) {
    throw new Error("SLOT_UNAVAILABLE");
  }

  const payload: ProposalPayload = {
    ...parsed,
    serviceName: service.name,
    price: service.price,
  };
  const header = input.idempotencyKey?.trim() ?? "";
  if (header && !/^[A-Za-z0-9_-]{8,80}$/.test(header)) {
    throw new Error("IDEMPOTENCY_KEY");
  }
  const idempotencyKey =
    header ||
    createHash("sha256")
      .update(
        `${input.session.id}|${payload.serviceId}|${payload.date}|${payload.time}|${payload.phone}`,
      )
      .digest("hex");

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM "AssistantAction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [input.session.organizationId, idempotencyKey],
  );
  if (existing.rows[0]) {
    const row = await loadAction(existing.rows[0].id);
    if (!row || row.widgetSessionId !== input.session.id) throw new Error("ACTION_CONFLICT");
    if (!samePayload(row.payload, payload)) throw new Error("ACTION_CONFLICT");
    return viewOf(row);
  }

  const conversation = await pool.query<{ id: string }>(
    `SELECT id FROM "AssistantConversation"
     WHERE "widgetSessionId" = $1 AND "organizationId" = $2
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    [input.session.id, input.session.organizationId],
  );
  let conversationId = conversation.rows[0]?.id;
  if (!conversationId) {
    conversationId = newId("acv");
    await pool.query(
      `INSERT INTO "AssistantConversation"
        (id, "organizationId", channel, "widgetSessionId", "updatedAt")
       VALUES ($1, $2, 'WIDGET', $3, NOW())`,
      [conversationId, input.session.organizationId, input.session.id],
    );
  }

  const actionId = newId("aac");
  const expiresAt = new Date(Date.now() + PROPOSAL_MS);
  try {
    await pool.query(
      `INSERT INTO "AssistantAction" (
        id, "conversationId", "organizationId", type, status, payload,
        "idempotencyKey", "expiresAt"
      ) VALUES (
        $1, $2, $3, 'CREATE_APPOINTMENT', 'PENDING_CONFIRMATION', $4::jsonb, $5, $6
      )`,
      [
        actionId,
        conversationId,
        input.session.organizationId,
        JSON.stringify(payload),
        idempotencyKey,
        expiresAt,
      ],
    );
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const again = await pool.query<{ id: string }>(
      `SELECT id FROM "AssistantAction"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [input.session.organizationId, idempotencyKey],
    );
    const row = again.rows[0] ? await loadAction(again.rows[0].id) : null;
    if (!row || !samePayload(row.payload, payload)) throw new Error("ACTION_CONFLICT");
    return viewOf(row);
  }
  const created = await loadAction(actionId);
  if (!created) throw new Error("ACTION_NOT_FOUND");
  return viewOf(created);
}

async function resolveCustomer(
  client: import("pg").PoolClient,
  organizationId: string,
  payload: ProposalPayload,
): Promise<string> {
  const found = await client.query<{ id: string }>(
    `SELECT id FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,
    [organizationId, payload.phone],
  );
  if (found.rows[0]) return found.rows[0].id;

  const id = `cust-${Date.now()}-${randomBytes(3).toString("hex")}`;
  await client.query("SAVEPOINT customer_new");
  try {
    await client.query(
      `INSERT INTO "Customer" (
        id, "organizationId", "firstName", "lastName", phone, status,
        "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,'NEW',false,false,false,NOW())`,
      [id, organizationId, payload.firstName, payload.lastName, payload.phone],
    );
    await client.query("RELEASE SAVEPOINT customer_new");
    return id;
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT customer_new");
    if (!isUniqueViolation(error)) throw error;
    const raced = await client.query<{ id: string }>(
      `SELECT id FROM "Customer"
       WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
       LIMIT 1`,
      [organizationId, payload.phone],
    );
    if (!raced.rows[0]) throw error;
    return raced.rows[0].id;
  }
}

export async function confirmAssistantAppointment(input: {
  session: { id: string; organizationId: string };
  actionId: string;
}): Promise<AssistantProposalView> {
  const client = await pool.connect();
  let booked: Awaited<ReturnType<typeof insertOrganizationBooking>> | null = null;
  let payload: ProposalPayload | null = null;
  let managed: ManagedFollowUp | null = null;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<ActionRow>(
      `SELECT a.id, a.type::text AS type, a.status::text AS status, a.payload, a.result, a."expiresAt",
              a."organizationId", c."widgetSessionId"
       FROM "AssistantAction" a
       JOIN "AssistantConversation" c ON c.id = a."conversationId"
       WHERE a.id = $1
       FOR UPDATE OF a`,
      [input.actionId],
    );
    const row = rows[0];
    if (
      !row ||
      row.organizationId !== input.session.organizationId ||
      row.widgetSessionId !== input.session.id
    ) {
      throw new Error("ACTION_NOT_FOUND");
    }
    if (row.status === "EXECUTED" && row.result?.reference) {
      await client.query("COMMIT");
      return viewOf(row);
    }
    if (row.status !== "PENDING_CONFIRMATION") throw new Error("ACTION_CLOSED");
    if (row.expiresAt.getTime() <= Date.now()) throw new Error("ACTION_EXPIRED");

    if (row.type === "RESCHEDULE_APPOINTMENT" || row.type === "CANCEL_APPOINTMENT") {
      managed = await executeManagedAction(client, input.session.organizationId, row);
      await client.query("COMMIT");
    } else {
    payload = row.payload;
    const customerId = await resolveCustomer(client, input.session.organizationId, payload);
    booked = await insertOrganizationBooking(
      client,
      input.session.organizationId,
      {
        serviceId: payload.serviceId,
        staffId: null,
        date: payload.date,
        time: payload.time,
        customer: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
        },
        attributionSource: "assistant",
      },
      { customerId },
    );
    const result = {
      reference: booked.bookingRef,
      serviceName: booked.serviceName,
      startAt: booked.startAt,
      endAt: booked.endAt,
      price: booked.price,
    };
    await client.query(
      `UPDATE "AssistantAction"
       SET status = 'EXECUTED', "customerId" = $2, result = $3::jsonb,
           "confirmedAt" = NOW(), "executedAt" = NOW()
       WHERE id = $1`,
      [row.id, customerId, JSON.stringify(result)],
    );
    await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    if (isExclusionViolation(error)) throw new Error("SLOT_CONFLICT");
    throw error;
  } finally {
    client.release();
  }

  if (booked && payload) {
    await dispatchPublicBookingSideEffects(input.session.organizationId, booked, {
      serviceId: payload.serviceId,
      attributionSource: "assistant",
    });
  }
  if (managed) await dispatchManagedFollowUp(managed);
  const done = await loadAction(input.actionId);
  if (!done) throw new Error("ACTION_NOT_FOUND");
  return viewOf(done);
}

export async function closeAssistantProposal(
  actionId: string,
  organizationId: string,
  status: "FAILED" | "EXPIRED",
): Promise<void> {
  await pool.query(
    `UPDATE "AssistantAction"
     SET status = $3::"AssistantActionStatus"
     WHERE id = $1 AND "organizationId" = $2 AND status = 'PENDING_CONFIRMATION'`,
    [actionId, organizationId, status],
  );
}

type ManagedFollowUp =
  | {
      kind: "reschedule";
      organizationId: string;
      appointmentId: string;
      previousStartAt: string;
      previousStaffId: string;
      previousStaffName: string;
    }
  | {
      kind: "cancel";
      organizationId: string;
      appointmentId: string;
      previousStatus: string;
    };

type OwnedAppointment = {
  id: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  status: string;
  startAt: Date;
  reference: string;
  staffId: string;
  staffName: string;
};

const MANAGEABLE = new Set(["PENDING", "CONFIRMED"]);

export function normalizeBookingReference(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

function slotLabel(start: Date): { date: string; time: string } {
  const parts = businessParts(start);
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
  };
}

function isManageable(row: { status: string; startAt: Date }): boolean {
  return MANAGEABLE.has(row.status) && row.startAt.getTime() > Date.now();
}

async function findOwnedAppointment(
  organizationId: string,
  reference: string,
  phone: string,
  client: import("pg").PoolClient | typeof pool = pool,
): Promise<OwnedAppointment | null> {
  const { rows } = await client.query<{
    id: string;
    customerId: string;
    serviceId: string | null;
    serviceName: string | null;
    price: string;
    status: string;
    startAt: Date;
    reference: string;
    staffId: string;
    staffFirstName: string | null;
    staffLastName: string | null;
  }>(
    `SELECT a.id, a."customerId", a."serviceId",
            COALESCE(s.name, a."serviceNameSnapshot", 'Prestation') AS "serviceName",
            a.price::text AS price, a.status::text AS status, a."startAt",
            a."bookingRef" AS reference, a."staffId",
            st."firstName" AS "staffFirstName", st."lastName" AS "staffLastName"
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     WHERE a."organizationId" = $1
       AND a."bookingRef" = $2
       AND c.phone = $3
       AND c."deletedAt" IS NULL`,
    [organizationId, normalizeBookingReference(reference), normalizePhone(phone)],
  );
  const row = rows[0];
  if (!row?.serviceId) return null;
  return {
    id: row.id,
    customerId: row.customerId,
    serviceId: row.serviceId,
    serviceName: row.serviceName ?? "Prestation",
    price: Number(row.price),
    status: row.status,
    startAt: row.startAt,
    reference: row.reference,
    staffId: row.staffId,
    staffName: `${row.staffFirstName ?? ""} ${row.staffLastName ?? ""}`.trim(),
  };
}

export type AssistantAppointmentView = {
  reference: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  status: string;
  manageable: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  ARRIVED: "Arrivée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  NO_SHOW: "Absent",
};

export async function assistantAppointmentContext(input: {
  organizationId: string;
  reference: string;
  phone: string;
}): Promise<{ id: string; serviceId: string }> {
  const owned = await findOwnedAppointment(input.organizationId, input.reference, input.phone);
  if (!owned) throw new Error("APPOINTMENT_NOT_FOUND");
  return { id: owned.id, serviceId: owned.serviceId };
}

export async function lookupAssistantAppointment(input: {
  organizationId: string;
  reference: string;
  phone: string;
}): Promise<AssistantAppointmentView> {
  const owned = await findOwnedAppointment(input.organizationId, input.reference, input.phone);
  if (!owned) throw new Error("APPOINTMENT_NOT_FOUND");
  const slot = slotLabel(owned.startAt);
  return {
    reference: owned.reference,
    serviceName: owned.serviceName,
    date: slot.date,
    time: slot.time,
    price: owned.price,
    status: STATUS_LABEL[owned.status] ?? owned.status,
    manageable: isManageable(owned),
  };
}

function readIdempotencyKey(header: string | null | undefined, fallback: string): string {
  const value = header?.trim() ?? "";
  if (value && !/^[A-Za-z0-9_-]{8,80}$/.test(value)) throw new Error("IDEMPOTENCY_KEY");
  return value || fallback;
}

async function savePendingAction(input: {
  session: { id: string; organizationId: string };
  idempotencyKey: string;
  type: "RESCHEDULE_APPOINTMENT" | "CANCEL_APPOINTMENT";
  payload: ProposalPayload;
  customerId: string;
}): Promise<AssistantProposalView> {
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM "AssistantAction"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [input.session.organizationId, input.idempotencyKey],
  );
  if (existing.rows[0]) {
    const row = await loadAction(existing.rows[0].id);
    if (!row || row.widgetSessionId !== input.session.id || row.type !== input.type) {
      throw new Error("ACTION_CONFLICT");
    }
    if (row.payload.reference !== input.payload.reference || row.payload.phone !== input.payload.phone) {
      throw new Error("ACTION_CONFLICT");
    }
    return viewOf(row);
  }
  const conversation = await pool.query<{ id: string }>(
    `SELECT id FROM "AssistantConversation"
     WHERE "widgetSessionId" = $1 AND "organizationId" = $2
     ORDER BY "createdAt" DESC LIMIT 1`,
    [input.session.id, input.session.organizationId],
  );
  let conversationId = conversation.rows[0]?.id;
  if (!conversationId) {
    conversationId = newId("acv");
    await pool.query(
      `INSERT INTO "AssistantConversation"
        (id, "organizationId", channel, "widgetSessionId", "updatedAt")
       VALUES ($1, $2, 'WIDGET', $3, NOW())`,
      [conversationId, input.session.organizationId, input.session.id],
    );
  }
  const actionId = newId("aac");
  try {
    await pool.query(
      `INSERT INTO "AssistantAction" (
        id, "conversationId", "organizationId", "customerId", type, status, payload,
        "idempotencyKey", "expiresAt"
      ) VALUES (
        $1, $2, $3, $4, $5::"AssistantActionType", 'PENDING_CONFIRMATION', $6::jsonb, $7, $8
      )`,
      [
        actionId,
        conversationId,
        input.session.organizationId,
        input.customerId,
        input.type,
        JSON.stringify(input.payload),
        input.idempotencyKey,
        new Date(Date.now() + PROPOSAL_MS),
      ],
    );
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const again = await pool.query<{ id: string }>(
      `SELECT id FROM "AssistantAction" WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [input.session.organizationId, input.idempotencyKey],
    );
    const row = again.rows[0] ? await loadAction(again.rows[0].id) : null;
    if (!row) throw new Error("ACTION_CONFLICT");
    return viewOf(row);
  }
  const created = await loadAction(actionId);
  if (!created) throw new Error("ACTION_NOT_FOUND");
  return viewOf(created);
}

function managedPayload(owned: OwnedAppointment, date: string, time: string): ProposalPayload {
  return {
    serviceId: owned.serviceId,
    date,
    time,
    firstName: "",
    lastName: "",
    phone: "",
    serviceName: owned.serviceName,
    price: owned.price,
    reference: owned.reference,
  };
}

export async function proposeAssistantReschedule(input: {
  session: { id: string; organizationId: string };
  body: unknown;
  idempotencyKey?: string | null;
}): Promise<AssistantProposalView> {
  if (!input.body || typeof input.body !== "object") throw new Error("Corps de requête invalide.");
  const raw = input.body as Record<string, unknown>;
  const reference = text(raw.reference, 20);
  const phone = normalizePhone(text(raw.phone, 20));
  const date = text(raw.date, 10);
  const time = text(raw.time, 5);
  if (!reference) throw new Error("Référence requise.");
  if (phone.length < 8) throw new Error("Téléphone invalide.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Date ou heure invalide.");
  }
  const owned = await findOwnedAppointment(input.session.organizationId, reference, phone);
  if (!owned) throw new Error("APPOINTMENT_NOT_FOUND");
  if (!isManageable(owned)) throw new Error("APPOINTMENT_CLOSED");
  await planPublicSlot(input.session.organizationId, {
    serviceId: owned.serviceId,
    date,
    time,
    excludeAppointmentId: owned.id,
  });
  const payload = { ...managedPayload(owned, date, time), phone };
  return savePendingAction({
    session: input.session,
    idempotencyKey: readIdempotencyKey(
      input.idempotencyKey,
      createHash("sha256").update(`move|${owned.id}|${date}|${time}`).digest("hex"),
    ),
    type: "RESCHEDULE_APPOINTMENT",
    payload,
    customerId: owned.customerId,
  });
}

export async function proposeAssistantCancel(input: {
  session: { id: string; organizationId: string };
  body: unknown;
  idempotencyKey?: string | null;
}): Promise<AssistantProposalView> {
  if (!input.body || typeof input.body !== "object") throw new Error("Corps de requête invalide.");
  const raw = input.body as Record<string, unknown>;
  const reference = text(raw.reference, 20);
  const phone = normalizePhone(text(raw.phone, 20));
  if (!reference) throw new Error("Référence requise.");
  if (phone.length < 8) throw new Error("Téléphone invalide.");
  const owned = await findOwnedAppointment(input.session.organizationId, reference, phone);
  if (!owned) throw new Error("APPOINTMENT_NOT_FOUND");
  if (!isManageable(owned)) throw new Error("APPOINTMENT_CLOSED");
  const slot = slotLabel(owned.startAt);
  const payload = { ...managedPayload(owned, slot.date, slot.time), phone };
  return savePendingAction({
    session: input.session,
    idempotencyKey: readIdempotencyKey(
      input.idempotencyKey,
      createHash("sha256").update(`cancel|${owned.id}`).digest("hex"),
    ),
    type: "CANCEL_APPOINTMENT",
    payload,
    customerId: owned.customerId,
  });
}

async function executeManagedAction(
  client: import("pg").PoolClient,
  organizationId: string,
  row: ActionRow,
): Promise<ManagedFollowUp> {
  const reference = row.payload.reference ?? "";
  const phone = row.payload.phone;
  const owned = await findOwnedAppointment(organizationId, reference, phone, client);
  if (!owned) throw new Error("APPOINTMENT_NOT_FOUND");
  if (!isManageable(owned)) throw new Error("APPOINTMENT_CLOSED");

  if (row.type === "CANCEL_APPOINTMENT") {
    const updated = await client.query(
      `UPDATE "Appointment"
       SET status = 'CANCELLED', "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND status IN ('PENDING', 'CONFIRMED')`,
      [owned.id, organizationId],
    );
    if (updated.rowCount === 0) throw new Error("APPOINTMENT_CLOSED");
    await client.query(
      `UPDATE "AssistantAction"
       SET status = 'EXECUTED', "customerId" = $2, result = $3::jsonb,
           "confirmedAt" = NOW(), "executedAt" = NOW()
       WHERE id = $1`,
      [
        row.id,
        owned.customerId,
        JSON.stringify({
          reference: owned.reference,
          serviceName: owned.serviceName,
          date: row.payload.date,
          time: row.payload.time,
          price: owned.price,
          status: "Annulé",
        }),
      ],
    );
    return {
      kind: "cancel",
      organizationId,
      appointmentId: owned.id,
      previousStatus: owned.status,
    };
  }

  const planned = await planPublicSlot(organizationId, {
    serviceId: owned.serviceId,
    date: row.payload.date,
    time: row.payload.time,
    excludeAppointmentId: owned.id,
  });
  const updated = await client.query(
    `UPDATE "Appointment"
     SET "staffId" = $3, "resourceId" = $4, "startAt" = $5, "endAt" = $6, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2 AND status IN ('PENDING', 'CONFIRMED')`,
    [owned.id, organizationId, planned.staffId, planned.resourceId, planned.startAt, planned.endAt],
  );
  if (updated.rowCount === 0) throw new Error("APPOINTMENT_CLOSED");
  const slot = slotLabel(planned.startAt);
  await client.query(
    `UPDATE "AssistantAction"
     SET status = 'EXECUTED', "customerId" = $2, result = $3::jsonb,
         "confirmedAt" = NOW(), "executedAt" = NOW()
     WHERE id = $1`,
    [
      row.id,
      owned.customerId,
      JSON.stringify({
        reference: owned.reference,
        serviceName: owned.serviceName,
        date: slot.date,
        time: slot.time,
        price: owned.price,
        startAt: planned.startAt.toISOString(),
        endAt: planned.endAt.toISOString(),
      }),
    ],
  );
  return {
    kind: "reschedule",
    organizationId,
    appointmentId: owned.id,
    previousStartAt: owned.startAt.toISOString(),
    previousStaffId: owned.staffId,
    previousStaffName: owned.staffName,
  };
}

async function dispatchManagedFollowUp(followUp: ManagedFollowUp): Promise<void> {
  try {
    if (followUp.kind === "cancel") {
      const { notifyAppointmentStatusChange } = await import("@/lib/notifications/emitter");
      const { getAppointmentById } = await import("@/lib/db/appointments");
      const appointment = await getAppointmentById(followUp.appointmentId, followUp.organizationId);
      if (appointment) {
        await notifyAppointmentStatusChange(
          followUp.organizationId,
          appointment,
          followUp.previousStatus as "PENDING",
        );
      }
      const { applyDepositOnStatusChange } = await import("@/lib/db/booking-policy");
      await applyDepositOnStatusChange({
        organizationId: followUp.organizationId,
        appointmentId: followUp.appointmentId,
        previousStatus: followUp.previousStatus,
        nextStatus: "CANCELLED",
        cancelledByInstitute: false,
        actor: { id: "system", name: "Widget" },
      });
      return;
    }
    const { notifyAppointmentRescheduled } = await import("@/lib/notifications/emitter");
    const { getAppointmentById } = await import("@/lib/db/appointments");
    const appointment = await getAppointmentById(followUp.appointmentId, followUp.organizationId);
    if (!appointment) return;
    await notifyAppointmentRescheduled(followUp.organizationId, appointment, {
      startAt: followUp.previousStartAt,
      staffId: followUp.previousStaffId,
      staffName: followUp.previousStaffName,
    });
  } catch (error) {
    console.error("[assistant appointment follow-up]", error);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
