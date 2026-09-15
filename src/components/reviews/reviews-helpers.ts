import { REVIEW_SATISFACTION_SCORE } from "@/types/review";
import type {
  ReviewAlertItem,
  ReviewKpis,
  ReviewRequestItem,
  ReviewSatisfaction,
} from "@/types/review";

export const TZ = "Africa/Casablanca";
export const SATISFACTIONS: ReviewSatisfaction[] = ["VERY_SATISFIED", "SATISFIED", "DISSATISFIED"];

export type ReviewTab = "all" | "pending" | "awaiting" | "positive" | "sensitive" | "recorded" | "skipped";
export type ReviewSort = "recent" | "low" | "high" | "awaiting";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || "Madame";
}

export function starsFor(item: ReviewRequestItem): number | null {
  if (!item.satisfaction) return null;
  return REVIEW_SATISFACTION_SCORE[item.satisfaction];
}

export function tabCounts(items: ReviewRequestItem[]): Record<ReviewTab, number> {
  return {
    all: items.length,
    pending: items.filter((i) => i.status === "PENDING").length,
    awaiting: items.filter((i) => i.status === "SENT").length,
    positive: items.filter((i) => i.satisfaction === "VERY_SATISFIED" || i.satisfaction === "SATISFIED").length,
    sensitive: items.filter((i) => i.satisfaction === "DISSATISFIED").length,
    recorded: items.filter((i) => i.status === "RECORDED" || i.satisfaction != null).length,
    skipped: items.filter((i) => i.status === "SKIPPED").length,
  };
}

export function filterReviews(
  items: ReviewRequestItem[],
  opts: { tab: ReviewTab; search: string; sort: ReviewSort },
): ReviewRequestItem[] {
  const q = opts.search.trim().toLowerCase();
  const filtered = items.filter((i) => {
    if (opts.tab === "pending" && i.status !== "PENDING") return false;
    if (opts.tab === "awaiting" && i.status !== "SENT") return false;
    if (opts.tab === "positive" && i.satisfaction !== "VERY_SATISFIED" && i.satisfaction !== "SATISFIED") {
      return false;
    }
    if (opts.tab === "sensitive" && i.satisfaction !== "DISSATISFIED") return false;
    if (opts.tab === "recorded" && i.status !== "RECORDED" && !i.satisfaction) return false;
    if (opts.tab === "skipped" && i.status !== "SKIPPED") return false;
    if (q) {
      const blob = `${i.customerName} ${i.serviceName} ${i.staffName ?? ""} ${i.messageSnapshot}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  const ts = (i: ReviewRequestItem) =>
    new Date(i.satisfactionRecordedAt ?? i.sentAt ?? i.completedAt).getTime();

  return [...filtered].sort((a, b) => {
    if (opts.sort === "awaiting") {
      const rank = (i: ReviewRequestItem) => (i.status === "SENT" ? 0 : i.status === "PENDING" ? 1 : 2);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
    }
    if (opts.sort === "low") {
      const sa = starsFor(a) ?? 99;
      const sb = starsFor(b) ?? 99;
      if (sa !== sb) return sa - sb;
    }
    if (opts.sort === "high") {
      const sa = starsFor(a) ?? -1;
      const sb = starsFor(b) ?? -1;
      if (sa !== sb) return sb - sa;
    }
    return ts(b) - ts(a);
  });
}

export function formatReviewWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const local = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
  const sameDay =
    local.getFullYear() === now.getFullYear() &&
    local.getMonth() === now.getMonth() &&
    local.getDate() === now.getDate();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yesterday =
    local.getFullYear() === yest.getFullYear() &&
    local.getMonth() === yest.getMonth() &&
    local.getDate() === yest.getDate();
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
  if (sameDay) return `Aujourd’hui ${time}`;
  if (yesterday) return `Hier ${time}`;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

export function deltaMonth(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function reviewsToTarget(
  avg: number | null,
  recorded: number,
  target = 4.8,
): number | null {
  if (avg == null || recorded <= 0 || avg >= target) return null;
  const need = Math.ceil((recorded * (target - avg)) / (5 - target));
  return need > 0 ? need : null;
}

export function topServices(items: ReviewRequestItem[], satisfaction: ReviewSatisfaction[], limit = 3) {
  const counts = new Map<string, number>();
  for (const i of items) {
    if (!i.satisfaction || !satisfaction.includes(i.satisfaction)) continue;
    counts.set(i.serviceName, (counts.get(i.serviceName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function followUpText(
  item: ReviewRequestItem,
  orgName: string,
  directorName: string,
  tone: "warm" | "formal",
): string {
  const first = firstNameOf(item.customerName);
  if (tone === "formal") {
    return `Chère Madame ${item.customerName},\n\nNous avons pris connaissance de votre retour après ${item.serviceName}. Un écart par rapport à nos standards mérite une attention directe — nous en parlons en interne avec l’équipe.\n\nSi vous le souhaitez, nous pouvons vous recontacter pour un prochain passage.\n\nBien cordialement,\n${directorName} — ${orgName}`;
  }
  return `Bonjour ${first},\n\nMerci pour votre franchise après ${item.serviceName}. Nous sommes sincèrement désolés que le rendez-vous n’ait pas été à la hauteur. Nous en parlons avec l’équipe pour corriger le tir.\n\nSi vous le souhaitez, nous serons heureux de vous accueillir à nouveau.\n\nBien chaleureusement,\n${directorName} — ${orgName}`;
}

export function waHref(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("212")
    ? digits
    : digits.startsWith("0")
      ? `212${digits.slice(1)}`
      : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function insightCopy(
  kpis: ReviewKpis | null,
  alerts: ReviewAlertItem[],
  items: ReviewRequestItem[],
): {
  headline: string;
  detail: string;
  excellence: { name: string; count: number }[];
  friction: { name: string; count: number }[];
  remaining: number | null;
} {
  const alert = alerts[0];
  const excellence = topServices(items, ["VERY_SATISFIED", "SATISFIED"]);
  const friction = topServices(items, ["DISSATISFIED"]);
  const remaining = reviewsToTarget(kpis?.averageScore ?? null, kpis?.recordedCount ?? 0);

  if (alert) {
    return {
      headline: `Alerte interne : ${alert.customerName} a déclaré une insatisfaction (${alert.serviceName}).`,
      detail:
        "Pas d’envoi automatique vers Google. Enregistrez le suivi en interne, puis contactez la cliente en WhatsApp manuel (opt-in).",
      excellence,
      friction,
      remaining,
    };
  }
  if (kpis && kpis.pendingToSend > 0) {
    return {
      headline: `${kpis.pendingToSend} demande${kpis.pendingToSend > 1 ? "s" : ""} d’avis à envoyer après RDV terminé.`,
      detail: "Envoi WhatsApp manuel — le lien Google n’est proposé qu’aux clientes satisfaites, jamais en automatique.",
      excellence,
      friction,
      remaining,
    };
  }
  if (kpis && kpis.awaitingRecord > 0) {
    return {
      headline: `${kpis.awaitingRecord} retour${kpis.awaitingRecord > 1 ? "s" : ""} envoyé${kpis.awaitingRecord > 1 ? "s" : ""}, satisfaction pas encore saisie.`,
      detail: "Note interne 3 niveaux (très satisfaite / satisfaite / insatisfaite) — pas d’étoiles 2 ou 3 dans le produit.",
      excellence,
      friction,
      remaining,
    };
  }
  return {
    headline:
      kpis && kpis.recordedCount > 0
        ? `Note interne ${String(kpis.averageScore ?? "—").replace(".", ",")} / 5 sur ${kpis.recordedCount} avis saisis.`
        : "Aucun avis enregistré pour le moment. Les demandes se créent après un RDV terminé, selon le délai paramétré.",
    detail: "Collecte interne manuelle. Aucune publication Google ni réponse IA envoyée à votre place.",
    excellence,
    friction,
    remaining,
  };
}
