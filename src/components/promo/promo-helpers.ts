import { formatMad } from "@/lib/utils";
import type { PromotionKpis, PromotionListItem, PromotionType } from "@/types/promo";

export const PROMO_PAGE_SIZE = 5;
export const TZ = "Africa/Casablanca";

export type PromoTab = "all" | "codes" | "auto" | "calendar" | "audit";
export type PromoStatusFilter = "all" | "active" | "scheduled" | "archived";
export type PromoTypeFilter = "all" | PromotionType;
type PromoTargetFilter = "all" | "vip" | "new" | "targeted";

const WEEKDAY_FULL: Record<number, string> = {
  0: "Dim",
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
};

function casablancaNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

function formatPromoDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPromoShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
  });
}

export function promoShortId(id: string): string {
  const tail = id.replace(/^promo_?/i, "").slice(-6).toUpperCase();
  return `#PR-${tail || id.slice(-6).toUpperCase()}`;
}

function isScheduled(p: PromotionListItem, now = casablancaNow()): boolean {
  if (p.status === "DRAFT") return true;
  if (p.status === "ACTIVE" && p.startsAt && new Date(p.startsAt) > now) return true;
  return false;
}

function isCodePromo(p: PromotionListItem): boolean {
  return Boolean(p.code?.trim());
}

function isAutoPromo(p: PromotionListItem): boolean {
  return !p.code || p.type === "PACKAGE" || p.type === "HAPPY_HOUR" || p.type === "FREE_SERVICE";
}

function isArchived(p: PromotionListItem): boolean {
  return p.status === "INACTIVE" || p.status === "EXPIRED";
}

export function displayStatus(p: PromotionListItem): "active" | "scheduled" | "draft" | "inactive" | "expired" {
  if (p.status === "EXPIRED") return "expired";
  if (p.status === "INACTIVE") return "inactive";
  if (p.status === "DRAFT") return "draft";
  if (isScheduled(p)) return "scheduled";
  return "active";
}

export function statusChip(p: PromotionListItem): { label: string; className: string } {
  const s = displayStatus(p);
  if (s === "active") {
    return { label: "Active", className: "bg-emerald-100 text-emerald-800" };
  }
  if (s === "scheduled") {
    return { label: "Programmée", className: "bg-amber-100 text-amber-800" };
  }
  if (s === "draft") {
    return { label: "Brouillon", className: "bg-[#F6E3EF] text-ink/70" };
  }
  if (s === "expired") {
    return { label: "Expirée", className: "bg-[#F6E3EF] text-ink/55" };
  }
  return { label: "Inactive", className: "bg-[#F6E3EF] text-ink/55" };
}

function weekdayLabel(weekdays: string | null): string | null {
  if (!weekdays?.trim()) return null;
  const ids = weekdays
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((n) => n >= 0 && n <= 6);
  if (!ids.length) return null;
  const set = new Set(ids);
  if ([1, 2, 3, 4, 5].every((d) => set.has(d)) && ids.length === 5) return "Lun–Ven";
  if (ids.length === 7) return "Toute la semaine";
  return ids.map((d) => WEEKDAY_FULL[d]).join("–");
}

function hoursLabel(p: PromotionListItem): string | null {
  if (p.timeStart && p.timeEnd) return `${p.timeStart}–${p.timeEnd}`;
  return null;
}

export function validityLabel(p: PromotionListItem): { primary: string; secondary: string } {
  const hours = hoursLabel(p);
  const days = weekdayLabel(p.weekdays);
  const slot = [days, hours].filter(Boolean).join(" · ");

  if (!p.startsAt && !p.endsAt) {
    return { primary: "Permanent", secondary: slot || "Sans date de fin" };
  }
  if (isScheduled(p) && p.startsAt) {
    return {
      primary: `${formatPromoShortDate(p.startsAt)} → ${formatPromoShortDate(p.endsAt)}`,
      secondary: slot || "Départ programmé",
    };
  }
  return {
    primary: `${formatPromoShortDate(p.startsAt)} → ${formatPromoShortDate(p.endsAt)}`,
    secondary: slot || "Toute la journée",
  };
}

export function discountLabel(p: PromotionListItem): string {
  if (p.type === "PERCENTAGE") return `-${p.value ?? 0} %`;
  if (p.type === "FIXED_AMOUNT" || p.type === "HAPPY_HOUR") {
    return p.value != null ? `-${formatMad(p.value)}` : "Remise fixe";
  }
  if (p.type === "FREE_SERVICE") return "Prestation offerte";
  if (p.type === "PACKAGE") return p.value != null ? `Pack ${formatMad(p.value)}` : "Pack";
  return "—";
}

export function fillRatio(p: PromotionListItem): { used: number; max: number | null; pct: number | null } {
  const used = p.usageCount;
  const max = p.maxUses;
  if (max == null || max <= 0) return { used, max: null, pct: null };
  return { used, max, pct: Math.min(100, Math.round((used / max) * 100)) };
}

export function conversionPct(p: PromotionListItem): number | null {
  return fillRatio(p).pct;
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function effortRate(kpis: PromotionKpis | null): number | null {
  if (!kpis) return null;
  const base = kpis.estimatedRevenueMonth + kpis.discountTotalMonth;
  if (base <= 0) return null;
  return Math.round((kpis.discountTotalMonth / base) * 1000) / 10;
}

export function overallConversion(items: PromotionListItem[]): number | null {
  const capped = items.filter((p) => p.maxUses != null && p.maxUses > 0);
  if (!capped.length) return null;
  const used = capped.reduce((s, p) => s + p.usageCount, 0);
  const max = capped.reduce((s, p) => s + (p.maxUses ?? 0), 0);
  if (max <= 0) return null;
  return Math.round((used / max) * 1000) / 10;
}

export function tabCounts(items: PromotionListItem[]): Record<PromoTab, number> {
  return {
    all: items.length,
    codes: items.filter(isCodePromo).length,
    auto: items.filter(isAutoPromo).length,
    calendar: items.filter((p) => p.status === "ACTIVE" || isScheduled(p)).length,
    audit: items.filter(isArchived).length,
  };
}

function matchesTarget(p: PromotionListItem, target: PromoTargetFilter): boolean {
  if (target === "all") return true;
  if (target === "targeted") return Boolean(p.customerId);
  const blob = `${p.name} ${p.code ?? ""} ${p.description ?? ""}`.toLowerCase();
  if (target === "vip") return blob.includes("vip") || blob.includes("gold") || blob.includes("diamant");
  if (target === "new") return blob.includes("welcome") || blob.includes("bienvenue") || blob.includes("1er");
  return true;
}

export function filterPromotions(
  items: PromotionListItem[],
  opts: {
    tab: PromoTab;
    search: string;
    status: PromoStatusFilter;
    type: PromoTypeFilter;
    target: PromoTargetFilter;
  },
): PromotionListItem[] {
  const q = opts.search.trim().toLowerCase();
  return items.filter((p) => {
    if (opts.tab === "codes" && !isCodePromo(p)) return false;
    if (opts.tab === "auto" && !isAutoPromo(p)) return false;
    if (opts.tab === "audit" && !isArchived(p)) return false;
    if (opts.tab === "calendar" && isArchived(p)) return false;
    if (opts.status === "active" && displayStatus(p) !== "active") return false;
    if (opts.status === "scheduled" && displayStatus(p) !== "scheduled" && displayStatus(p) !== "draft") {
      return false;
    }
    if (opts.status === "archived" && !isArchived(p)) return false;
    if (opts.type !== "all" && p.type !== opts.type) return false;
    if (!matchesTarget(p, opts.target)) return false;
    if (q) {
      const blob = `${p.name} ${p.code ?? ""} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function bestPromo(items: PromotionListItem[]): PromotionListItem | null {
  const pool = items.filter((p) => p.status === "ACTIVE" || p.monthRevenue > 0 || p.monthUses > 0);
  if (!pool.length) return items[0] ?? null;
  return [...pool].sort((a, b) => {
    if (b.monthRevenue !== a.monthRevenue) return b.monthRevenue - a.monthRevenue;
    if (b.monthUses !== a.monthUses) return b.monthUses - a.monthUses;
    return b.usageCount - a.usageCount;
  })[0];
}

type OverlapPair = { a: PromotionListItem; b: PromotionListItem };

function overlappingPromos(items: PromotionListItem[]): OverlapPair[] {
  const live = items.filter((p) => p.status === "ACTIVE" || isScheduled(p));
  const pairs: OverlapPair[] = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      if (rangesOverlap(live[i], live[j])) pairs.push({ a: live[i], b: live[j] });
    }
  }
  return pairs;
}

function rangeStart(p: PromotionListItem): number {
  return p.startsAt ? new Date(p.startsAt).getTime() : 0;
}
function rangeEnd(p: PromotionListItem): number {
  return p.endsAt ? new Date(p.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
}

function rangesOverlap(a: PromotionListItem, b: PromotionListItem): boolean {
  return rangeStart(a) <= rangeEnd(b) && rangeStart(b) <= rangeEnd(a);
}

type GanttWeek = { label: string; start: Date; end: Date; current: boolean };

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type SimCheck = { ok: boolean; label: string };

export type PromoSimulation = {
  subtotal: number;
  discount: number;
  net: number;
  checks: SimCheck[];
  eligible: boolean;
};

export function simulatePromo(
  p: PromotionListItem,
  amount: number,
  opts?: { serviceId?: string; category?: string | null; now?: Date },
): PromoSimulation {
  const now = opts?.now ?? casablancaNow();
  const checks: SimCheck[] = [];
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const day = String(now.getDay());

  checks.push({ ok: p.status === "ACTIVE", label: p.status === "ACTIVE" ? "Statut actif" : "Promotion non active" });
  if (p.startsAt) {
    const ok = new Date(p.startsAt) <= now;
    checks.push({ ok, label: ok ? "Date de début atteinte" : "Pas encore commencée" });
  }
  if (p.endsAt) {
    const ok = new Date(p.endsAt) >= now;
    checks.push({ ok, label: ok ? "Toujours dans la fenêtre" : "Date de fin dépassée" });
  }
  if (p.minAmount != null) {
    const ok = amount >= p.minAmount;
    checks.push({
      ok,
      label: ok ? `Panier ≥ ${formatMad(p.minAmount)}` : `Panier min. ${formatMad(p.minAmount)} non atteint`,
    });
  }
  if (p.maxUses != null) {
    const ok = p.usageCount < p.maxUses;
    checks.push({ ok, label: ok ? `Quota ${p.usageCount}/${p.maxUses}` : "Plafond d’usages atteint" });
  }
  if (p.serviceId && opts?.serviceId) {
    const ok = p.serviceId === opts.serviceId;
    checks.push({ ok, label: ok ? "Prestation éligible" : "Prestation hors périmètre" });
  }
  if (p.category && opts?.category) {
    const ok = p.category === opts.category;
    checks.push({ ok, label: ok ? "Catégorie éligible" : "Catégorie hors périmètre" });
  }
  if (p.weekdays) {
    const days = p.weekdays.split(",").map((d) => d.trim());
    const ok = days.includes(day);
    checks.push({ ok, label: ok ? `Jour ${WEEKDAY_FULL[now.getDay()]} autorisé` : "Jour non éligible" });
  }
  if (p.timeStart && p.timeEnd) {
    const ok = hhmm >= p.timeStart && hhmm <= p.timeEnd;
    checks.push({ ok, label: ok ? `Horaire ${hhmm} dans ${p.timeStart}–${p.timeEnd}` : "Hors créneau horaire" });
  }
  if (p.maxUsesPerCustomer != null) {
    checks.push({
      ok: true,
      label: `Limite ${p.maxUsesPerCustomer}× / cliente (contrôle POS)`,
    });
  }

  const eligible = checks.every((c) => c.ok);
  let discount = 0;
  if (eligible && amount > 0) {
    const value = p.value ?? 0;
    if (p.type === "PERCENTAGE") discount = Math.round(amount * (value / 100) * 100) / 100;
    else if (p.type === "FIXED_AMOUNT" || p.type === "HAPPY_HOUR" || p.type === "PACKAGE") {
      discount = Math.min(amount, value);
    } else if (p.type === "FREE_SERVICE") {
      discount = amount;
    }
    discount = Math.max(0, Math.min(amount, discount));
  }

  return { subtotal: amount, discount, net: Math.round((amount - discount) * 100) / 100, checks, eligible };
}

export function insightCopy(
  kpis: PromotionKpis | null,
  items: PromotionListItem[],
): {
  headline: string;
  recommendation: string;
  conflict: string;
  best: PromotionListItem | null;
} {
  const best = bestPromo(items);
  const overlaps = overlappingPromos(items.filter((p) => p.status === "ACTIVE"));
  const conv = best ? conversionPct(best) : null;

  const headline = best
    ? `Meilleure offre ce mois : « ${best.name} »${best.code ? ` (${best.code})` : ""}${
        best.monthRevenue > 0 ? ` · CA ${formatMad(best.monthRevenue)}` : ""
      }${best.monthUses > 0 ? ` · ${best.monthUses} passage${best.monthUses > 1 ? "s" : ""} POS` : ""}${
        conv != null ? ` · utilisation ${conv.toString().replace(".", ",")} %` : ""
      }.`
    : kpis && kpis.totalCount === 0
      ? "Aucune promotion enregistrée. Créez une offre pour la relier au POS, à l’agenda et au CRM."
      : "Pas encore assez d’usages ce mois pour désigner une offre phare.";

  const recommendation =
    kpis && kpis.usedThisMonth === 0
      ? "Relancer les clientes inactives depuis le module Réactivation, avec un code dédié (une remise, un plafond)."
      : "Cibler une relance manuelle WhatsApp (opt-in) plutôt qu’un nouveau cumul de codes.";

  const conflict =
    overlaps.length === 0
      ? "Aucun chevauchement de dates entre offres actives. Le POS n’applique qu’un code à la fois."
      : `${overlaps.length} chevauchement${overlaps.length > 1 ? "s" : ""} de calendrier : ${overlaps
          .slice(0, 2)
          .map((o) => `${o.a.code ?? o.a.name} / ${o.b.code ?? o.b.name}`)
          .join(" · ")}. Le POS n’empile pas les remises.`;

  return { headline, recommendation, conflict, best };
}

export function kpiHints(kpis: PromotionKpis | null): {
  pos: string;
  revenue: string;
  conversion: string;
} {
  if (!kpis) return { pos: "", revenue: "", conversion: "" };
  const pos = deltaPct(kpis.usedThisMonth, kpis.usedPrevMonth);
  const rev = deltaPct(kpis.estimatedRevenueMonth, kpis.revenuePrevMonth);
  return {
    pos: pos == null ? "vs mois dernier" : `${pos > 0 ? "+" : ""}${String(pos).replace(".", ",")} % vs m-1`,
    revenue: rev == null ? "CA facturé avec promo" : `${rev > 0 ? "+" : ""}${String(rev).replace(".", ",")} % ce mois`,
    conversion: "Usages / plafond",
  };
}

export function perimeterLabel(p: PromotionListItem, serviceName?: string | null): { primary: string; secondary: string } {
  if (p.customerId) {
    return { primary: "Cliente ciblée", secondary: serviceName || p.category || "Périmètre nominatif" };
  }
  if (serviceName) {
    return { primary: serviceName, secondary: p.category || "Prestation unique" };
  }
  if (p.category) {
    return { primary: p.category, secondary: "Catégorie" };
  }
  return { primary: "Tous soins", secondary: "Tout le fichier client" };
}
