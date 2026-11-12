import { type InventoryMovementItem } from "@/types/inventory";

export function indexLatestMovement(movements: InventoryMovementItem[]) {
  const map = new Map<string, InventoryMovementItem>();
  for (const m of movements) {
    if (!map.has(m.productId)) map.set(m.productId, m);
  }
  return map;
}

export function movementQtyLabel(m: InventoryMovementItem) {
  const n = m.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
  return m.quantity > 0 ? `+${n}` : n;
}

export function movementTone(type: InventoryMovementItem["type"]): "in" | "out" | "sale" | "loss" | "care" {
  if (type === "SERVICE_CONSUMPTION") return "care";
  if (type === "SALE") return "sale";
  if (type === "LOSS" || type === "DAMAGE" || type === "EXPIRATION") return "loss";
  if (type === "PURCHASE" || type === "RETURN" || type === "ADJUSTMENT_IN" || type === "TRANSFER_IN") return "in";
  return "out";
}
