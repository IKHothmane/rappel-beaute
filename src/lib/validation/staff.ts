import type {
  CreateStaffInput,
  CreateStaffLeaveInput,
  StaffStatus,
  UpdateStaffInput,
  UpdateStaffLeaveInput,
  UpdateStaffScheduleInput,
} from "@/types/staff";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

const STAFF_STATUSES: StaffStatus[] = ["ACTIVE", "INACTIVE", "ON_LEAVE", "ARCHIVED"];

export function validateCreateStaff(body: unknown): ValidationResult<CreateStaffInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const firstName = String(raw.firstName ?? "").trim();
  const lastName = String(raw.lastName ?? "").trim();
  if (!firstName) errors.firstName = "Le prénom est obligatoire.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      phone: raw.phone ? String(raw.phone).trim() : undefined,
      email: raw.email ? String(raw.email).trim() : undefined,
      position: raw.position ? String(raw.position).trim() : undefined,
      status: STAFF_STATUSES.includes(raw.status as StaffStatus)
        ? (raw.status as StaffStatus)
        : "ACTIVE",
      hireDate: raw.hireDate ? String(raw.hireDate) : undefined,
      notes: raw.notes ? String(raw.notes).trim() : undefined,
    },
  };
}

export function validateUpdateStaff(body: unknown): ValidationResult<UpdateStaffInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const data: UpdateStaffInput = {};

  if (raw.firstName !== undefined) {
    const v = String(raw.firstName).trim();
    if (!v) errors.firstName = "Le prénom est obligatoire.";
    else data.firstName = v;
  }
  if (raw.lastName !== undefined) data.lastName = String(raw.lastName).trim();
  if (raw.phone !== undefined) data.phone = String(raw.phone).trim() || undefined;
  if (raw.email !== undefined) data.email = String(raw.email).trim() || undefined;
  if (raw.position !== undefined) data.position = String(raw.position).trim() || undefined;
  if (raw.status !== undefined) {
    if (STAFF_STATUSES.includes(raw.status as StaffStatus)) {
      data.status = raw.status as StaffStatus;
    }
  }
  if (raw.hireDate !== undefined) data.hireDate = String(raw.hireDate) || undefined;
  if (raw.notes !== undefined) data.notes = String(raw.notes).trim() || undefined;
  if (raw.active === false) data.status = "ARCHIVED";
  if (raw.active === true && raw.status === undefined) data.status = "ACTIVE";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}

export function validateUpdateSchedule(body: unknown): ValidationResult<UpdateStaffScheduleInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const schedules = Array.isArray(raw.schedules)
    ? raw.schedules.map((s) => {
        const item = s as Record<string, unknown>;
        return {
          dayOfWeek: Number(item.dayOfWeek),
          startTime: String(item.startTime ?? "09:00"),
          endTime: String(item.endTime ?? "18:00"),
          active: item.active !== false,
        };
      })
    : [];
  const breaks = Array.isArray(raw.breaks)
    ? raw.breaks.map((b) => {
        const item = b as Record<string, unknown>;
        return {
          dayOfWeek: Number(item.dayOfWeek),
          startTime: String(item.startTime ?? "12:00"),
          endTime: String(item.endTime ?? "14:00"),
        };
      })
    : [];

  return { ok: true, data: { schedules, breaks } };
}

export function validateCreateLeave(body: unknown): ValidationResult<CreateStaffLeaveInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const startAt = String(raw.startAt ?? "");
  const endAt = String(raw.endAt ?? "");
  if (!startAt) errors.startAt = "Date de début obligatoire.";
  if (!endAt) errors.endAt = "Date de fin obligatoire.";
  if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
    errors.endAt = "La fin doit être après le début.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      startAt,
      endAt,
      type: (raw.type as CreateStaffLeaveInput["type"]) ?? "CONGE",
      reason: raw.reason ? String(raw.reason).trim() : undefined,
      status: (raw.status as CreateStaffLeaveInput["status"]) ?? "APPROVED",
    },
  };
}

export function validateUpdateLeave(body: unknown): ValidationResult<UpdateStaffLeaveInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const data: UpdateStaffLeaveInput = {};
  if (raw.startAt !== undefined) data.startAt = String(raw.startAt);
  if (raw.endAt !== undefined) data.endAt = String(raw.endAt);
  if (raw.type !== undefined) data.type = raw.type as UpdateStaffLeaveInput["type"];
  if (raw.reason !== undefined) data.reason = String(raw.reason).trim() || undefined;
  if (raw.status !== undefined) data.status = raw.status as UpdateStaffLeaveInput["status"];
  return { ok: true, data };
}

export function parseStaffListQuery(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim() as StaffStatus | "";
  const serviceId = (searchParams.get("serviceId") ?? "").trim() || null;
  const agenda = searchParams.get("agenda") === "1";
  return {
    page,
    limit,
    search,
    status: status || null,
    serviceId,
    agenda,
  };
}
