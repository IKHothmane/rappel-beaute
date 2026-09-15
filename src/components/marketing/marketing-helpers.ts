import { WHATSAPP_MARKETING_TYPES, type WhatsAppTaskItem } from "@/types/whatsapp";
import type { CampaignKpis, CampaignListItem, CampaignStatus } from "@/types/campaign";
import { CAMPAIGN_CHANNEL_LABEL, CAMPAIGN_STATUS_LABEL } from "@/types/campaign";
import type { ReactivationKpis } from "@/types/reactivation";
import type { CustomerKpis } from "@/types/customer";

export type CampaignTab = "all" | "ACTIVE" | "DRAFT" | "PAUSED" | "COMPLETED" | "scheduled" | "whatsapp";
export type ChannelFilter = "all" | "WHATSAPP" | "EMAIL";

export const EMPTY_CAMPAIGN_KPIS: CampaignKpis = {
  activeCampaigns: 0,
  draftCampaigns: 0,
  pausedCampaigns: 0,
  scheduledCampaigns: 0,
  totalCampaigns: 0,
  targetedCustomers: 0,
  pendingMessages: 0,
  sentMessages: 0,
  attributedRevenue: 0,
};

export function conversionPct(c: CampaignListItem) {
  if (!c.audienceCount) return null;
  return Math.round((c.sentCount / c.audienceCount) * 1000) / 10;
}

export function filterCampaigns(
  items: CampaignListItem[],
  tab: CampaignTab,
  channel: ChannelFilter,
  search: string,
) {
  const q = search.trim().toLowerCase();
  return items.filter((c) => {
    if (tab === "whatsapp") {
      if (c.channel !== "WHATSAPP" || c.pendingCount <= 0) return false;
    } else if (tab === "scheduled") {
      if (!c.scheduledFor || new Date(c.scheduledFor).getTime() <= Date.now()) return false;
    } else if (tab !== "all" && c.status !== tab) {
      return false;
    }
    if (channel !== "all" && c.channel !== channel) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.promotionCode ?? "").toLowerCase().includes(q) ||
      (c.promotionName ?? "").toLowerCase().includes(q)
    );
  });
}

export function statusDot(status: CampaignStatus) {
  if (status === "ACTIVE") return "bg-emerald-500";
  if (status === "PAUSED") return "bg-amber-500";
  if (status === "DRAFT") return "bg-[#E4BDC2]";
  if (status === "COMPLETED") return "bg-ink/30";
  return "bg-ink/20";
}

export function campaignConvLabel(c: CampaignListItem) {
  const pct = conversionPct(c);
  return pct == null ? "—" : `${pct.toLocaleString("fr-MA")} %`;
}

export function segmentHint(c: CampaignListItem) {
  const days = c.audienceCount;
  return `${days} cliente${days > 1 ? "s" : ""}`;
}

export function marketingInsight(opts: {
  kpis: CampaignKpis | null;
  reactivation: ReactivationKpis | null;
  promoCode: string | null;
}) {
  const relance = opts.reactivation?.toRelance ?? 0;
  const days60 = opts.reactivation?.days60 ?? 0;
  const estimated = opts.reactivation?.estimatedRevenue ?? 0;
  const pending = opts.kpis?.pendingMessages ?? 0;
  if (relance > 0) {
    return {
      title: "Piste de relance",
      amount: estimated > 0 ? estimated : null,
      body: `${relance} cliente${relance > 1 ? "s" : ""} à relancer${days60 ? ` dont ${days60} sans visite depuis 60 j` : ""}. ${opts.promoCode ? `Promo disponible : ${opts.promoCode}.` : "Créez une campagne WhatsApp (opt-in) ou ouvrez la réactivation."}`,
      cta: "Créer une campagne 60 j",
    };
  }
  if (pending > 0) {
    return {
      title: "Messages en attente",
      amount: null,
      body: `${pending} message${pending > 1 ? "s" : ""} WhatsApp prêts — envoi manuel, un par un.`,
      cta: "Ouvrir la file WhatsApp",
    };
  }
  return {
    title: "Campagnes commerciales",
    amount: opts.kpis?.attributedRevenue ?? null,
    body: "Les campagnes ciblent les opt-in, préparent des tâches WhatsApp, et n’envoient rien sans validation humaine.",
    cta: "Nouvelle campagne",
  };
}

export function marketingOpportunities(opts: {
  reactivation: ReactivationKpis | null;
  pendingWa: number;
  draftCount: number;
  vipInactive: number;
}) {
  const rows: { label: string; body: string; href: string }[] = [];
  if ((opts.reactivation?.days60 ?? 0) > 0) {
    rows.push({
      label: "Inactives 60 j",
      body: `${opts.reactivation!.days60} clientes sans visite récente — relance opt-in.`,
      href: "/reactivation/",
    });
  }
  if (opts.pendingWa > 0) {
    rows.push({
      label: "File WhatsApp",
      body: `${opts.pendingWa} message${opts.pendingWa > 1 ? "s" : ""} à valider manuellement.`,
      href: "/whatsapp/",
    });
  }
  if (opts.draftCount > 0) {
    rows.push({
      label: "Brouillons",
      body: `${opts.draftCount} campagne${opts.draftCount > 1 ? "s" : ""} à préparer.`,
      href: "/marketing/",
    });
  }
  if (opts.vipInactive > 0) {
    rows.push({
      label: "VIP inactives",
      body: `${opts.vipInactive} VIP sans visite récente.`,
      href: "/reactivation/",
    });
  }
  return rows.slice(0, 3);
}

export function conciergeTasks(items: WhatsAppTaskItem[]) {
  return items.filter(
    (t) => t.status === "PENDING" && WHATSAPP_MARKETING_TYPES.has(t.type),
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase() || "?";
}

export const ATTR_BAR_COLORS = ["bg-primary", "bg-[#7B5900]", "bg-[#F0BF5C]", "bg-[#B61149]"];

export function attributionShares(items: CampaignListItem[]) {
  const withRev = items.filter((c) => c.attributedRevenue > 0);
  const total = withRev.reduce((s, c) => s + c.attributedRevenue, 0);
  return {
    total,
    rows: withRev
      .slice()
      .sort((a, b) => b.attributedRevenue - a.attributedRevenue)
      .map((c) => ({
        id: c.id,
        name: c.name,
        amount: c.attributedRevenue,
        pct: total > 0 ? Math.round((c.attributedRevenue / total) * 100) : 0,
      })),
  };
}

export function customerSegments(cust: CustomerKpis | null, reac: ReactivationKpis | null) {
  return [
    { label: "VIP", count: cust?.vipCount ?? 0, hint: "Segment CRM" },
    { label: "Inactives 60 j", count: reac?.days60 ?? 0, hint: "Sans visite" },
    { label: "À relancer", count: reac?.toRelance ?? 0, hint: "File réactivation" },
    { label: "Sans RDV futur", count: Math.max(0, (reac?.inactiveCount ?? 0) - (reac?.upcomingCount ?? 0)), hint: "Hors agenda" },
  ];
}

export { CAMPAIGN_CHANNEL_LABEL, CAMPAIGN_STATUS_LABEL };
