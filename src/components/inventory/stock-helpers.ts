import { formatMovementTime } from "@/components/inventory/product-helpers";
import { MOVEMENT_TYPE_LABEL, type InventoryMovementItem } from "@/types/inventory";

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

export function stockInsight(movements: InventoryMovementItem[]): string {
  const last = movements[0];
  if (!last) {
    return "Aucun mouvement enregistré pour l’instant. Le stock se met à jour par les mouvements, jamais à la main.";
  }
  const when = formatMovementTime(last.createdAt);
  const who = last.userName ? ` par ${last.userName}` : "";
  const qty = movementQtyLabel(last);
  if (last.type === "SERVICE_CONSUMPTION") {
    return `Dernier décompte cabine : ${last.productName} (${qty}) le ${when}${who}. Lié à la clôture d’un soin.`;
  }
  if (last.type === "SALE") {
    return `Dernière vente caisse : ${last.productName} (${qty}) le ${when}${who}.`;
  }
  if (last.type === "PURCHASE") {
    return `Dernière entrée fournisseur : ${last.productName} (${qty}) le ${when}${who}.`;
  }
  return `Dernier mouvement : ${MOVEMENT_TYPE_LABEL[last.type]} · ${last.productName} (${qty}) le ${when}${who}.`;
}

export function movementTone(type: InventoryMovementItem["type"]): "in" | "out" | "sale" | "loss" | "care" {
  if (type === "SERVICE_CONSUMPTION") return "care";
  if (type === "SALE") return "sale";
  if (type === "LOSS" || type === "DAMAGE" || type === "EXPIRATION") return "loss";
  if (type === "PURCHASE" || type === "RETURN" || type === "ADJUSTMENT_IN" || type === "TRANSFER_IN") return "in";
  return "out";
}
