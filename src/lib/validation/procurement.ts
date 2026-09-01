import type {
  CreatePurchaseInput,
  CreateSupplierInput,
  LinkProductSupplierInput,
  PurchaseStatus,
  ReceivePurchaseInput,
  UpdatePurchaseInput,
  UpdateSupplierInput,
} from "@/types/procurement";
import { PURCHASE_STATUSES } from "@/types/procurement";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return undefined;
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

export function validateCreateSupplier(
  raw: Record<string, unknown>,
): { ok: true; data: CreateSupplierInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const name = str(raw.name);
  if (!name) errors.push("name");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name: name!,
      phone: str(raw.phone),
      email: str(raw.email),
      address: str(raw.address),
      contactName: str(raw.contactName),
      notes: str(raw.notes),
      active: bool(raw.active),
    },
  };
}

export function validateUpdateSupplier(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateSupplierInput } | { ok: false; errors: string[] } {
  const data: UpdateSupplierInput = {};
  if (raw.name !== undefined) {
    const name = str(raw.name);
    if (!name) return { ok: false, errors: ["name"] };
    data.name = name;
  }
  if (raw.phone !== undefined) data.phone = str(raw.phone) ?? undefined;
  if (raw.email !== undefined) data.email = str(raw.email) ?? undefined;
  if (raw.address !== undefined) data.address = str(raw.address) ?? undefined;
  if (raw.contactName !== undefined) data.contactName = str(raw.contactName) ?? undefined;
  if (raw.notes !== undefined) data.notes = str(raw.notes) ?? undefined;
  if (raw.active !== undefined) data.active = Boolean(raw.active);
  return { ok: true, data };
}

export function validateLinkProductSupplier(
  raw: Record<string, unknown>,
): { ok: true; data: LinkProductSupplierInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const productId = str(raw.productId);
  const purchasePrice = num(raw.purchasePrice);
  if (!productId) errors.push("productId");
  if (purchasePrice === undefined || purchasePrice < 0) errors.push("purchasePrice");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      productId: productId!,
      supplierSku: str(raw.supplierSku),
      purchasePrice: purchasePrice!,
      minimumOrderQuantity: num(raw.minimumOrderQuantity),
      leadTimeDays: num(raw.leadTimeDays) !== undefined ? Math.round(num(raw.leadTimeDays)!) : undefined,
      preferred: bool(raw.preferred),
    },
  };
}

export function parseSupplierListQuery(sp: URLSearchParams) {
  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(sp.get("limit")) || 30)),
    search: sp.get("search")?.trim() || "",
    active:
      sp.get("active") === "true" ? true : sp.get("active") === "false" ? false : null,
  };
}

function parseItems(raw: unknown): CreatePurchaseInput["items"] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const items: CreatePurchaseInput["items"] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    const productId = str(r.productId);
    const quantityOrdered = num(r.quantityOrdered);
    const unitPrice = num(r.unitPrice);
    if (!productId || quantityOrdered === undefined || quantityOrdered <= 0) return null;
    if (unitPrice === undefined || unitPrice < 0) return null;
    items.push({ productId, quantityOrdered, unitPrice });
  }
  return items;
}

export function validateCreatePurchase(
  raw: Record<string, unknown>,
): { ok: true; data: CreatePurchaseInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const supplierId = str(raw.supplierId);
  const items = parseItems(raw.items);
  if (!supplierId) errors.push("supplierId");
  if (!items) errors.push("items");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      supplierId: supplierId!,
      notes: str(raw.notes),
      items: items!,
      submit: Boolean(raw.submit),
    },
  };
}

export function validateUpdatePurchase(
  raw: Record<string, unknown>,
): { ok: true; data: UpdatePurchaseInput } | { ok: false; errors: string[] } {
  const data: UpdatePurchaseInput = {};
  if (raw.notes !== undefined) data.notes = str(raw.notes);
  if (raw.items !== undefined) {
    const items = parseItems(raw.items);
    if (!items) return { ok: false, errors: ["items"] };
    data.items = items;
  }
  if (raw.status !== undefined) {
    const s = String(raw.status);
    if (s !== "DRAFT" && s !== "ORDERED" && s !== "CANCELLED") {
      return { ok: false, errors: ["status"] };
    }
    data.status = s;
  }
  return { ok: true, data };
}

export function validateReceivePurchase(
  raw: Record<string, unknown>,
): { ok: true; data: ReceivePurchaseInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const idempotencyKey = str(raw.idempotencyKey);
  if (!idempotencyKey) errors.push("idempotencyKey");
  if (!Array.isArray(raw.items) || raw.items.length === 0) errors.push("items");
  if (errors.length) return { ok: false, errors };

  const items: ReceivePurchaseInput["items"] = [];
  for (const row of raw.items as unknown[]) {
    if (!row || typeof row !== "object") return { ok: false, errors: ["items"] };
    const r = row as Record<string, unknown>;
    const purchaseItemId = str(r.purchaseItemId);
    const quantity = num(r.quantity);
    if (!purchaseItemId || quantity === undefined || quantity <= 0) {
      return { ok: false, errors: ["items"] };
    }
    items.push({
      purchaseItemId,
      quantity,
      lotNumber: str(r.lotNumber),
      expiresAt: str(r.expiresAt),
    });
  }

  return {
    ok: true,
    data: {
      idempotencyKey: idempotencyKey!,
      notes: str(raw.notes),
      items,
    },
  };
}

export function parsePurchaseListQuery(sp: URLSearchParams) {
  const status = sp.get("status");
  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(sp.get("limit")) || 30)),
    search: sp.get("search")?.trim() || "",
    supplierId: sp.get("supplierId")?.trim() || null,
    status:
      status && PURCHASE_STATUSES.includes(status as PurchaseStatus)
        ? (status as PurchaseStatus)
        : null,
  };
}
