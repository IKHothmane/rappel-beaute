import type { SupplierListItem } from "@/types/procurement";
import { formatMad } from "@/modules/procurement/service";

export function supplierInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  let n = digits;
  if (n.startsWith("0") && (n.length === 9 || n.length === 10)) n = `212${n.slice(1)}`;
  return `https://wa.me/${n}`;
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  return trimmed ? `tel:${trimmed.replace(/\s+/g, "")}` : null;
}

export function supplierInsight(rows: SupplierListItem[]): string {
  if (rows.length === 0) {
    return "Aucun fournisseur pour l’instant. Créez un partenaire pour lier des tarifs au catalogue.";
  }
  const top = [...rows].sort((a, b) => b.purchaseCount - a.purchaseCount || b.totalPurchased - a.totalPurchased)[0];
  if (!top) return "Ajoutez un fournisseur pour suivre commandes et tarifs négociés.";
  if (top.purchaseCount === 0) {
    return `${top.name} est dans le répertoire, sans commande encore. Liez des produits pour commander.`;
  }
  return `${top.name} concentre ${top.purchaseCount} commande${top.purchaseCount > 1 ? "s" : ""} pour ${formatMad(top.totalPurchased)} d’achats.`;
}

export function leadTimeLabel(days: number | null | undefined) {
  if (days == null) return null;
  if (days <= 0) return "Immédiat";
  if (days === 1) return "1 jour";
  return `${days} jours`;
}
