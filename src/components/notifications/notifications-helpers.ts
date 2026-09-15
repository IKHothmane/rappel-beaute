import type { LucideIcon } from "lucide-react";
import {
  CalendarPlus,
  CalendarX2,
  CircleDollarSign,
  Gift,
  Package,
  PackageX,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Star,
  UserMinus,
  Wallet,
  Sparkles,
  Bell,
} from "lucide-react";
import type { NotificationFilterCategory } from "@/lib/notifications/permissions";
import { typesForCategory } from "@/lib/notifications/permissions";
import type { NotificationItem, NotificationSeverity, NotificationType } from "@/types/notifications";

export type StatusFilter = "all" | "unread" | "urgent" | "today" | "week";

export type CategoryChip = {
  value: NotificationFilterCategory;
  label: string;
  short: string;
};

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "unread", label: "Non lues" },
  { value: "urgent", label: "Urgentes" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
];

export const CATEGORY_CHIPS: CategoryChip[] = [
  { value: "agenda", label: "Rendez-vous", short: "RDV" },
  { value: "crm", label: "Clientes & CRM", short: "CRM" },
  { value: "stock", label: "Stocks & Réserve", short: "Stocks" },
  { value: "finance", label: "Paiements & Caisse", short: "Paiements" },
  { value: "reviews", label: "Avis & Réputation", short: "Avis" },
  { value: "staff", label: "Équipe & Staff", short: "Équipe" },
  { value: "marketing", label: "Marketing & IA", short: "IA" },
];

export type ChannelKey = "app" | "email" | "whatsapp";

export type ChannelRule = {
  id: string;
  label: string;
  priority: string;
  priorityTone: "primary" | "secondary" | "muted";
  channels: Record<ChannelKey, boolean>;
};

export const DEFAULT_CHANNEL_RULES: ChannelRule[] = [
  {
    id: "agenda",
    label: "Rendez-vous & Annulations",
    priority: "Priorité Haute",
    priorityTone: "primary",
    channels: { app: true, email: true, whatsapp: true },
  },
  {
    id: "stock",
    label: "Ruptures & Alertes Stock",
    priority: "Urgence Cabine",
    priorityTone: "primary",
    channels: { app: true, email: true, whatsapp: true },
  },
  {
    id: "finance",
    label: "Caisse, Écarts & TPE",
    priority: "Finances",
    priorityTone: "secondary",
    channels: { app: true, email: true, whatsapp: false },
  },
  {
    id: "reviews",
    label: "Avis clients négatifs",
    priority: "Réputation",
    priorityTone: "primary",
    channels: { app: true, email: true, whatsapp: true },
  },
  {
    id: "marketing",
    label: "Marketing & Bilans ROI",
    priority: "Synthèse",
    priorityTone: "muted",
    channels: { app: true, email: true, whatsapp: false },
  },
  {
    id: "ai",
    label: "Alertes & Copilote IA",
    priority: "Croissance",
    priorityTone: "secondary",
    channels: { app: true, email: false, whatsapp: true },
  },
];

const CHANNELS_STORAGE_KEY = "rb-notif-channel-rules-v1";

export function loadChannelRules(): ChannelRule[] {
  if (typeof window === "undefined") return DEFAULT_CHANNEL_RULES;
  try {
    const raw = window.localStorage.getItem(CHANNELS_STORAGE_KEY);
    if (!raw) return DEFAULT_CHANNEL_RULES;
    const parsed = JSON.parse(raw) as ChannelRule[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CHANNEL_RULES;
    return DEFAULT_CHANNEL_RULES.map((def) => {
      const saved = parsed.find((p) => p.id === def.id);
      return saved ? { ...def, channels: { ...def.channels, ...saved.channels } } : def;
    });
  } catch {
    return DEFAULT_CHANNEL_RULES;
  }
}

export function saveChannelRules(rules: ChannelRule[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(rules));
}

export type NotificationCounters = {
  urgent: number;
  important: number;
  info: number;
  resolvedToday: number;
  total: number;
  unread: number;
};

export function buildCounters(items: NotificationItem[], unreadCount: number): NotificationCounters {
  const startToday = startOfDay(new Date());
  return {
    urgent: items.filter((n) => n.severity === "CRITICAL" && !n.readAt).length,
    important: items.filter((n) => n.severity === "WARNING" && !n.readAt).length,
    info: items.filter((n) => (n.severity === "INFO" || n.severity === "SUCCESS") && !n.readAt).length,
    resolvedToday: items.filter((n) => n.readAt && new Date(n.readAt) >= startToday).length,
    total: items.length,
    unread: unreadCount,
  };
}

export type DayGroup = {
  key: string;
  label: string;
  items: NotificationItem[];
};

export function groupByDay(items: NotificationItem[]): DayGroup[] {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const buckets = new Map<string, DayGroup>();

  for (const item of items) {
    const d = startOfDay(new Date(item.createdAt));
    let key: string;
    let label: string;
    if (d.getTime() === today.getTime()) {
      key = "today";
      label = "Aujourd'hui";
    } else if (d.getTime() === yesterday.getTime()) {
      key = "yesterday";
      label = "Hier";
    } else {
      key = d.toISOString().slice(0, 10);
      label = d.toLocaleDateString("fr-MA", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    const g = buckets.get(key) ?? { key, label, items: [] };
    g.items.push(item);
    buckets.set(key, g);
  }

  const order = ["today", "yesterday"];
  return [...buckets.values()].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return b.key.localeCompare(a.key);
  });
}

export function filterByStatus(items: NotificationItem[], status: StatusFilter): NotificationItem[] {
  const now = Date.now();
  const today = startOfDay(new Date()).getTime();
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

  switch (status) {
    case "unread":
      return items.filter((n) => !n.readAt);
    case "urgent":
      return items.filter((n) => n.severity === "CRITICAL");
    case "today":
      return items.filter((n) => new Date(n.createdAt).getTime() >= today);
    case "week":
      return items.filter((n) => new Date(n.createdAt).getTime() >= weekAgo && new Date(n.createdAt).getTime() <= now);
    default:
      return items;
  }
}

export function searchNotifications(items: NotificationItem[], q: string): NotificationItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (n) =>
      n.title.toLowerCase().includes(needle) ||
      n.message.toLowerCase().includes(needle) ||
      n.type.toLowerCase().includes(needle),
  );
}

export type CopilotInsight = {
  id: string;
  title: string;
  badge: string;
  body: string;
  cta: string;
  href: string;
  secondaryCta?: string;
  secondaryHref?: string;
  tone: "gold" | "primary";
};

/** Insights dérivés des alertes réelles — jamais de montants inventés */
export function buildCopilotInsights(items: NotificationItem[]): CopilotInsight[] {
  const insights: CopilotInsight[] = [];
  const unread = items.filter((n) => !n.readAt);

  const stockOut = unread.filter((n) => n.type === "STOCK_OUT");
  if (stockOut.length > 0) {
    insights.push({
      id: "stock-out",
      title: "Rupture(s) critique(s) cabine",
      badge: `${stockOut.length} alerte${stockOut.length > 1 ? "s" : ""}`,
      body: `${stockOut.length} produit${stockOut.length > 1 ? "s" : ""} en rupture non traité${stockOut.length > 1 ? "s" : ""}. Vérifiez le réassort avant les soins du jour.`,
      cta: "Ouvrir le stock",
      href: "/products/",
      secondaryCta: "Voir les alertes",
      secondaryHref: "#urgences",
      tone: "primary",
    });
  }

  const reviews = unread.filter((n) => n.type === "REVIEW_PENDING");
  if (reviews.length > 0) {
    insights.push({
      id: "reviews",
      title: "Avis en attente de réponse",
      badge: `${reviews.length} avis`,
      body: `${reviews.length} avis client${reviews.length > 1 ? "s" : ""} à traiter. Une réponse rapide limite l’impact réputation.`,
      cta: "Centre avis",
      href: "/reviews/",
      tone: "gold",
    });
  }

  const noShows = unread.filter((n) => n.type === "APPOINTMENT_NO_SHOW" || n.type === "APPOINTMENT_CANCELLED");
  if (noShows.length > 0 && insights.length < 2) {
    insights.push({
      id: "agenda-risk",
      title: "Annulations & no-shows",
      badge: `${noShows.length} événement${noShows.length > 1 ? "s" : ""}`,
      body: `${noShows.length} alerte${noShows.length > 1 ? "s" : ""} agenda non lue${noShows.length > 1 ? "s" : ""}. Recalez le planning ou relancez les créneaux libres.`,
      cta: "Ouvrir l'agenda",
      href: "/agenda/",
      tone: "gold",
    });
  }

  const stockLow = unread.filter((n) => n.type === "STOCK_LOW" || n.type === "PRODUCT_EXPIRING");
  if (stockLow.length > 0 && insights.length < 2) {
    insights.push({
      id: "stock-low",
      title: "Stock à surveiller",
      badge: `${stockLow.length} référence${stockLow.length > 1 ? "s" : ""}`,
      body: `${stockLow.length} alerte${stockLow.length > 1 ? "s" : ""} stock faible ou expiration. Anticipez les commandes fournisseur.`,
      cta: "Voir les produits",
      href: "/products/",
      tone: "gold",
    });
  }

  if (insights.length === 0) {
    const unreadN = unread.length;
    insights.push({
      id: "calm",
      title: unreadN === 0 ? "Flux sous contrôle" : "Priorisez les non lues",
      badge: unreadN === 0 ? "OK" : `${unreadN} non lue${unreadN > 1 ? "s" : ""}`,
      body:
        unreadN === 0
          ? "Aucune alerte critique ouverte. Le copilote surveillera les prochains événements métier."
          : `Vous avez ${unreadN} notification${unreadN > 1 ? "s" : ""} non lue${unreadN > 1 ? "s" : ""}. Traitez d’abord les urgences cabine et finance.`,
      cta: unreadN === 0 ? "Tableau de bord" : "Voir non lues",
      href: unreadN === 0 ? "/dashboard/" : "#liste",
      tone: "gold",
    });
  }

  return insights.slice(0, 2);
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

export function severityBadge(severity: NotificationSeverity): {
  label: string;
  className: string;
} {
  switch (severity) {
    case "CRITICAL":
      return { label: "Urgent", className: "bg-primary text-on-primary" };
    case "WARNING":
      return {
        label: "Important",
        className: "bg-secondary-container text-on-secondary-container",
      };
    case "SUCCESS":
      return { label: "Succès", className: "bg-secondary-fixed text-on-secondary-fixed" };
    default:
      return { label: "Info", className: "bg-surface-container-high text-on-surface-variant" };
  }
}

export function typeIcon(type: NotificationType): LucideIcon {
  switch (type) {
    case "STOCK_OUT":
      return PackageX;
    case "STOCK_LOW":
    case "PRODUCT_EXPIRING":
      return Package;
    case "APPOINTMENT_CREATED":
      return CalendarPlus;
    case "APPOINTMENT_CANCELLED":
    case "APPOINTMENT_NO_SHOW":
      return CalendarX2;
    case "APPOINTMENT_RESCHEDULED":
      return RefreshCw;
    case "PAYMENT_RECEIVED":
      return CircleDollarSign;
    case "REFUND_CREATED":
    case "EXPENSE_CREATED":
      return Wallet;
    case "REVIEW_PENDING":
      return Star;
    case "CAMPAIGN_READY":
      return Megaphone;
    case "SUPPORT_MESSAGE":
      return MessageSquare;
    case "LOYALTY_REWARD":
    case "PACKAGE_EXPIRING":
      return Gift;
    case "STAFF_LEAVE":
      return UserMinus;
    case "SYSTEM":
      return Sparkles;
    default:
      return Bell;
  }
}

export function iconTone(severity: NotificationSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-primary-fixed text-primary";
    case "WARNING":
      return "bg-secondary-fixed text-on-secondary-fixed";
    case "SUCCESS":
      return "bg-secondary-container text-on-secondary-container";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}

export function primaryActionLabel(item: NotificationItem): string {
  switch (item.type) {
    case "STOCK_OUT":
    case "STOCK_LOW":
      return "Voir produit";
    case "APPOINTMENT_CREATED":
    case "APPOINTMENT_RESCHEDULED":
    case "APPOINTMENT_CANCELLED":
    case "APPOINTMENT_NO_SHOW":
      return "Voir RDV";
    case "PAYMENT_RECEIVED":
    case "REFUND_CREATED":
      return "Voir paiement";
    case "EXPENSE_CREATED":
      return "Voir dépense";
    case "REVIEW_PENDING":
      return "Traiter l'avis";
    case "CAMPAIGN_READY":
      return "Voir campagne";
    case "SUPPORT_MESSAGE":
      return "Ouvrir ticket";
    default:
      return "Ouvrir";
  }
}

export function countByCategory(items: NotificationItem[], category: NotificationFilterCategory): number {
  if (category === "all" || category === "unread" || category === "urgent") return items.length;
  const types = typesForCategory(category);
  if (!types) return 0;
  return items.filter((n) => types.includes(n.type)).length;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export type NotificationsViewModel = {
  orgName: string;
  userName: string;
  roleLabel: string;
  loading: boolean;
  items: NotificationItem[];
  filtered: NotificationItem[];
  groups: DayGroup[];
  urgentItems: NotificationItem[];
  counters: NotificationCounters;
  insights: CopilotInsight[];
  status: StatusFilter;
  category: NotificationFilterCategory | null;
  search: string;
  channelRules: ChannelRule[];
  categoryCounts: Record<string, number>;
  statusCounts: Record<StatusFilter, number>;
  onStatus: (s: StatusFilter) => void;
  onCategory: (c: NotificationFilterCategory | null) => void;
  onSearch: (q: string) => void;
  onOpen: (item: NotificationItem) => void;
  onMarkRead: (item: NotificationItem) => void;
  onReadAll: () => void;
  onRefresh: () => void;
  onSaveChannels: (rules: ChannelRule[]) => void;
  onToggleChannel: (ruleId: string, key: ChannelKey) => void;
};
