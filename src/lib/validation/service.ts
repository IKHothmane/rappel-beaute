import type {
  CommissionType,
  CreateServiceInput,
  UpdateServiceInput,
} from "@/types/service";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

function parseNum(value: unknown, field: string, errors: Record<string, string>, min = 0): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < min) {
    errors[field] = `Valeur invalide pour ${field}.`;
    return null;
  }
  return n;
}

function parseCommission(raw: unknown): CreateServiceInput["commissions"] {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((c) => c && typeof c === "object")
    .map((c) => {
      const item = c as Record<string, unknown>;
      const type = String(item.type) as CommissionType;
      return {
        staffId: String(item.staffId),
        type: type === "FIXED" ? "FIXED" : "PERCENTAGE",
        percentage: item.percentage != null ? Number(item.percentage) : undefined,
        fixedAmount: item.fixedAmount != null ? Number(item.fixedAmount) : undefined,
      };
    });
}

export function validateCreateService(body: unknown): ValidationResult<CreateServiceInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  if (!name) errors.name = "Le nom est obligatoire.";

  const price = parseNum(raw.price, "price", errors);
  const durationMin = parseNum(raw.durationMin, "durationMin", errors, 1);
  if (price === null) errors.price = "Le prix est obligatoire.";
  if (durationMin === null) errors.durationMin = "La durée est obligatoire.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      description: raw.description ? String(raw.description).trim() : undefined,
      category: raw.category ? String(raw.category).trim() : undefined,
      price: price!,
      durationMin: durationMin!,
      prepTimeMin: parseNum(raw.prepTimeMin, "prepTimeMin", errors) ?? 0,
      cleanupTimeMin: parseNum(raw.cleanupTimeMin, "cleanupTimeMin", errors) ?? 0,
      deposit: parseNum(raw.deposit, "deposit", errors) ?? undefined,
      active: raw.active !== false,
      staffIds: Array.isArray(raw.staffIds) ? raw.staffIds.map(String) : [],
      resources: Array.isArray(raw.resources)
        ? raw.resources.map((r) => {
            const item = r as Record<string, unknown>;
            return {
              resourceId: String(item.resourceId),
              quantity: Number(item.quantity) || 1,
            };
          })
        : [],
      products: Array.isArray(raw.products)
        ? raw.products.map((p) => {
            const item = p as Record<string, unknown>;
            return {
              productId: String(item.productId),
              quantity: Number(item.quantity) || 1,
              unit: String(item.unit ?? "unité"),
            };
          })
        : [],
      commissions: parseCommission(raw.commissions),
    },
  };
}

export function validateUpdateService(body: unknown): ValidationResult<UpdateServiceInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const data: UpdateServiceInput = {};

  if (raw.name !== undefined) {
    const name = String(raw.name).trim();
    if (!name) errors.name = "Le nom est obligatoire.";
    else data.name = name;
  }
  if (raw.price !== undefined) {
    const p = parseNum(raw.price, "price", errors);
    if (p !== null) data.price = p;
  }
  if (raw.durationMin !== undefined) {
    const d = parseNum(raw.durationMin, "durationMin", errors, 1);
    if (d !== null) data.durationMin = d;
  }
  if (raw.prepTimeMin !== undefined) data.prepTimeMin = parseNum(raw.prepTimeMin, "prepTimeMin", errors) ?? 0;
  if (raw.cleanupTimeMin !== undefined) {
    data.cleanupTimeMin = parseNum(raw.cleanupTimeMin, "cleanupTimeMin", errors) ?? 0;
  }
  if (raw.deposit !== undefined) data.deposit = parseNum(raw.deposit, "deposit", errors) ?? undefined;
  if (raw.description !== undefined) data.description = String(raw.description).trim() || undefined;
  if (raw.category !== undefined) data.category = String(raw.category).trim() || undefined;
  if (raw.active !== undefined) data.active = Boolean(raw.active);
  if (raw.staffIds !== undefined) data.staffIds = Array.isArray(raw.staffIds) ? raw.staffIds.map(String) : [];
  if (raw.resources !== undefined) {
    data.resources = Array.isArray(raw.resources)
      ? raw.resources.map((r) => {
          const item = r as Record<string, unknown>;
          return { resourceId: String(item.resourceId), quantity: Number(item.quantity) || 1 };
        })
      : [];
  }
  if (raw.products !== undefined) {
    data.products = Array.isArray(raw.products)
      ? raw.products.map((p) => {
          const item = p as Record<string, unknown>;
          return {
            productId: String(item.productId),
            quantity: Number(item.quantity) || 1,
            unit: String(item.unit ?? "unité"),
          };
        })
      : [];
  }
  if (raw.commissions !== undefined) data.commissions = parseCommission(raw.commissions);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}

export function parseServiceListQuery(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const search = (searchParams.get("search") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim() || null;
  const activeParam = searchParams.get("active");
  const active = activeParam === "false" ? false : activeParam === "true" ? true : null;
  const agenda = searchParams.get("agenda") === "1";
  return { page, limit, search, category, active, agenda };
}
