import type {
  CreateMaintenanceInput,
  CreateResourceInput,
  ResourceType,
  UpdateMaintenanceInput,
  UpdateResourceInput,
} from "@/types/resource";
import { RESOURCE_TYPES } from "@/types/resource";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

function parseType(value: unknown): ResourceType | undefined {
  const t = String(value ?? "");
  return RESOURCE_TYPES.includes(t as ResourceType) ? (t as ResourceType) : undefined;
}

export function validateCreateResource(body: unknown): ValidationResult<CreateResourceInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  if (!name) errors.name = "Le nom est obligatoire.";

  const capacity =
    raw.capacity !== undefined && raw.capacity !== null && raw.capacity !== ""
      ? Number(raw.capacity)
      : 1;
  if (!Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = "La capacité doit être un entier ≥ 1.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      type: parseType(raw.type) ?? "CABINE",
      capacity,
      location: raw.location ? String(raw.location).trim() : undefined,
      notes: raw.notes ? String(raw.notes).trim() : undefined,
      active: raw.active !== false,
      serviceIds: Array.isArray(raw.serviceIds) ? raw.serviceIds.map(String) : [],
    },
  };
}

export function validateUpdateResource(body: unknown): ValidationResult<UpdateResourceInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const data: UpdateResourceInput = {};

  if (raw.name !== undefined) {
    const name = String(raw.name).trim();
    if (!name) errors.name = "Le nom est obligatoire.";
    else data.name = name;
  }
  if (raw.type !== undefined) data.type = parseType(raw.type) ?? "CABINE";
  if (raw.capacity !== undefined) {
    const capacity = Number(raw.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      errors.capacity = "La capacité doit être un entier ≥ 1.";
    } else data.capacity = capacity;
  }
  if (raw.location !== undefined) data.location = String(raw.location).trim() || undefined;
  if (raw.notes !== undefined) data.notes = String(raw.notes).trim() || undefined;
  if (raw.active !== undefined) data.active = Boolean(raw.active);
  if (raw.serviceIds !== undefined) {
    data.serviceIds = Array.isArray(raw.serviceIds) ? raw.serviceIds.map(String) : [];
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}

export function validateCreateMaintenance(body: unknown): ValidationResult<CreateMaintenanceInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const startAt = String(raw.startAt ?? "");
  const endAt = String(raw.endAt ?? "");
  if (!startAt) errors.startAt = "Début obligatoire.";
  if (!endAt) errors.endAt = "Fin obligatoire.";
  if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
    errors.endAt = "La fin doit être après le début.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      startAt,
      endAt,
      type: (raw.type as CreateMaintenanceInput["type"]) ?? "PREVENTIVE",
      reason: raw.reason ? String(raw.reason).trim() : undefined,
      status: (raw.status as CreateMaintenanceInput["status"]) ?? "SCHEDULED",
    },
  };
}

export function validateUpdateMaintenance(body: unknown): ValidationResult<UpdateMaintenanceInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const data: UpdateMaintenanceInput = {};
  if (raw.startAt !== undefined) data.startAt = String(raw.startAt);
  if (raw.endAt !== undefined) data.endAt = String(raw.endAt);
  if (raw.type !== undefined) data.type = raw.type as UpdateMaintenanceInput["type"];
  if (raw.reason !== undefined) data.reason = String(raw.reason).trim() || undefined;
  if (raw.status !== undefined) data.status = raw.status as UpdateMaintenanceInput["status"];
  return { ok: true, data };
}

export function parseResourceListQuery(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const search = (searchParams.get("search") ?? "").trim();
  const type = parseType(searchParams.get("type"));
  const activeParam = searchParams.get("active");
  const active = activeParam === "false" ? false : activeParam === "true" ? true : null;
  const serviceId = (searchParams.get("serviceId") ?? "").trim() || null;
  const agenda = searchParams.get("agenda") === "1";
  return { page, limit, search, type: type ?? null, active, serviceId, agenda };
}
