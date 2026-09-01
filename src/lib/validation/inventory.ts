import type {
  CreateMovementInput,
  CreateProductInput,
  MovementType,
  ProductCategory,
  ProductUnit,
  UpdateProductInput,
} from "@/types/inventory";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
} from "@/types/inventory";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

function parseCategory(v: unknown): ProductCategory | undefined {
  const s = String(v ?? "");
  return PRODUCT_CATEGORIES.includes(s as ProductCategory)
    ? (s as ProductCategory)
    : undefined;
}

function parseUnit(v: unknown): ProductUnit | undefined {
  const s = String(v ?? "");
  return PRODUCT_UNITS.includes(s as ProductUnit) ? (s as ProductUnit) : undefined;
}

export function validateCreateProduct(body: unknown): ValidationResult<CreateProductInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  const sku = String(raw.sku ?? "").trim().toUpperCase();
  if (!name) errors.name = "Le nom est obligatoire.";
  if (!sku) errors.sku = "Le SKU est obligatoire.";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      sku,
      category: parseCategory(raw.category) ?? "CONSOMMABLE",
      brand: raw.brand ? String(raw.brand).trim() : undefined,
      unit: parseUnit(raw.unit) ?? "UNIT",
      purchasePrice: raw.purchasePrice != null ? Number(raw.purchasePrice) : 0,
      salePrice: raw.salePrice != null && raw.salePrice !== "" ? Number(raw.salePrice) : undefined,
      minStock: raw.minStock != null ? Number(raw.minStock) : 0,
      maxStock: raw.maxStock != null && raw.maxStock !== "" ? Number(raw.maxStock) : undefined,
      supplierName: raw.supplierName ? String(raw.supplierName).trim() : undefined,
      consumable: raw.consumable !== false,
      sellable: Boolean(raw.sellable),
      active: raw.active !== false,
      notes: raw.notes ? String(raw.notes).trim() : undefined,
      initialStock:
        raw.initialStock != null && raw.initialStock !== ""
          ? Number(raw.initialStock)
          : undefined,
    },
  };
}

export function validateUpdateProduct(body: unknown): ValidationResult<UpdateProductInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const data: UpdateProductInput = {};

  if (raw.name !== undefined) {
    const name = String(raw.name).trim();
    if (!name) errors.name = "Le nom est obligatoire.";
    else data.name = name;
  }
  if (raw.sku !== undefined) {
    const sku = String(raw.sku).trim().toUpperCase();
    if (!sku) errors.sku = "Le SKU est obligatoire.";
    else data.sku = sku;
  }
  if (raw.category !== undefined) data.category = parseCategory(raw.category) ?? "CONSOMMABLE";
  if (raw.brand !== undefined) data.brand = String(raw.brand).trim() || undefined;
  if (raw.unit !== undefined) data.unit = parseUnit(raw.unit) ?? "UNIT";
  if (raw.purchasePrice !== undefined) data.purchasePrice = Number(raw.purchasePrice);
  if (raw.salePrice !== undefined) {
    data.salePrice =
      raw.salePrice === null || raw.salePrice === "" ? undefined : Number(raw.salePrice);
  }
  if (raw.minStock !== undefined) data.minStock = Number(raw.minStock);
  if (raw.maxStock !== undefined) {
    data.maxStock =
      raw.maxStock === null || raw.maxStock === "" ? undefined : Number(raw.maxStock);
  }
  if (raw.supplierName !== undefined) {
    data.supplierName = String(raw.supplierName).trim() || undefined;
  }
  if (raw.consumable !== undefined) data.consumable = Boolean(raw.consumable);
  if (raw.sellable !== undefined) data.sellable = Boolean(raw.sellable);
  if (raw.active !== undefined) data.active = Boolean(raw.active);
  if (raw.notes !== undefined) data.notes = String(raw.notes).trim() || undefined;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data };
}

const MOVEMENT_TYPES: MovementType[] = [
  "PURCHASE",
  "SERVICE_CONSUMPTION",
  "SALE",
  "RETURN",
  "LOSS",
  "DAMAGE",
  "EXPIRATION",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
];

export function validateCreateMovement(body: unknown): ValidationResult<CreateMovementInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps invalide." } };
  }
  const raw = body as Record<string, unknown>;
  const productId = String(raw.productId ?? "");
  const type = String(raw.type ?? "") as MovementType;
  const quantity = Number(raw.quantity);

  if (!productId) errors.productId = "Produit obligatoire.";
  if (!MOVEMENT_TYPES.includes(type)) errors.type = "Type de mouvement invalide.";
  if (!quantity || Number.isNaN(quantity) || quantity === 0) {
    errors.quantity = "Quantité invalide.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      productId,
      type,
      quantity,
      reason: raw.reason ? String(raw.reason).trim() : undefined,
      referenceType: raw.referenceType
        ? (String(raw.referenceType) as CreateMovementInput["referenceType"])
        : undefined,
      referenceId: raw.referenceId ? String(raw.referenceId) : undefined,
      idempotencyKey: raw.idempotencyKey ? String(raw.idempotencyKey) : undefined,
    },
  };
}

export function parseProductListQuery(sp: URLSearchParams) {
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
  const search = (sp.get("search") ?? "").trim();
  const category = parseCategory(sp.get("category")) ?? null;
  const activeParam = sp.get("active");
  const active = activeParam === "false" ? false : activeParam === "true" ? true : null;
  const alert = (sp.get("alert") ?? "").trim() || null;
  const supplier = (sp.get("supplier") ?? "").trim() || null;
  return { page, limit, search, category, active, alert, supplier };
}

export function parseMovementListQuery(sp: URLSearchParams) {
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "30", 10) || 30));
  const productId = (sp.get("productId") ?? "").trim() || null;
  const type = (sp.get("type") ?? "").trim() || null;
  const search = (sp.get("search") ?? "").trim();
  return { page, limit, productId, type, search };
}
