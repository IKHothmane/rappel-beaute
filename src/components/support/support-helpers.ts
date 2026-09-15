import type { LucideIcon } from "lucide-react";
import {
  Bug,
  CalendarDays,
  CreditCard,
  Headphones,
  Lightbulb,
  MessageSquare,
  Package,
  Sparkles,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import type { SupportTicketCategory } from "@/lib/db/support-tickets";
import {
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUS_LABEL,
  type SupportMessageItem,
  type SupportTicketListItem,
} from "@/modules/support/service";

export function ticketRef(t: Pick<SupportTicketListItem, "ticketNumber" | "id">): string {
  if (t.ticketNumber != null && t.ticketNumber > 0) return `#RB-${t.ticketNumber}`;
  return `#${t.id.slice(0, 8)}`;
}

export type TicketFilter =
  | "all"
  | "active"
  | "urgent"
  | "open"
  | "waiting"
  | "resolved";

export type SortKey = "recent" | "priority" | "number";

export const TICKET_FILTERS: { value: TicketFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "urgent", label: "Urgents" },
  { value: "open", label: "Ouverts" },
  { value: "waiting", label: "En attente" },
  { value: "resolved", label: "Résolus" },
];

export type SupportCounters = {
  total: number;
  open: number;
  waiting: number;
  resolved: number;
  urgentOpen: number;
  thisMonth: number;
  active: number;
};

export function buildSupportCounters(items: SupportTicketListItem[]): SupportCounters {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const openStatuses = new Set(["OPEN", "IN_PROGRESS"]);
  return {
    total: items.length,
    open: items.filter((t) => openStatuses.has(t.status)).length,
    waiting: items.filter((t) => t.status === "WAITING_CUSTOMER").length,
    resolved: items.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length,
    urgentOpen: items.filter(
      (t) => t.priority === "URGENT" && openStatuses.has(t.status),
    ).length,
    thisMonth: items.filter((t) => new Date(t.createdAt) >= monthStart).length,
    active: items.filter(
      (t) => t.status !== "RESOLVED" && t.status !== "CLOSED",
    ).length,
  };
}

/** Moyenne 1ère réponse réelle (minutes) — null si aucune donnée */
export function avgFirstResponseMinutes(items: SupportTicketListItem[]): number | null {
  const samples: number[] = [];
  for (const t of items) {
    if (!t.firstResponseAt) continue;
    const mins =
      (new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime()) / 60000;
    if (mins >= 0 && Number.isFinite(mins)) samples.push(mins);
  }
  if (!samples.length) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

export function filterTickets(
  items: SupportTicketListItem[],
  filter: TicketFilter,
  search: string,
): SupportTicketListItem[] {
  let list = items;
  switch (filter) {
    case "active":
      list = list.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED");
      break;
    case "urgent":
      list = list.filter((t) => t.priority === "URGENT");
      break;
    case "open":
      list = list.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
      break;
    case "waiting":
      list = list.filter((t) => t.status === "WAITING_CUSTOMER");
      break;
    case "resolved":
      list = list.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");
      break;
    default:
      break;
  }
  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter((t) => {
    const ref = ticketRef(t).toLowerCase();
    return (
      ref.includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.lastMessagePreview ?? "").toLowerCase().includes(q) ||
      SUPPORT_CATEGORY_LABEL[t.category]?.toLowerCase().includes(q)
    );
  });
}

export function sortTickets(items: SupportTicketListItem[], sort: SortKey): SupportTicketListItem[] {
  const copy = [...items];
  const priRank = (p: string) =>
    p === "URGENT" ? 0 : p === "HIGH" ? 1 : p === "NORMAL" ? 2 : 3;
  switch (sort) {
    case "priority":
      return copy.sort((a, b) => priRank(a.priority) - priRank(b.priority));
    case "number":
      return copy.sort((a, b) => (b.ticketNumber ?? 0) - (a.ticketNumber ?? 0));
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.lastMessageAt ?? b.updatedAt).getTime() -
          new Date(a.lastMessageAt ?? a.updatedAt).getTime(),
      );
  }
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

export function statusTone(status: string): string {
  switch (status) {
    case "OPEN":
    case "IN_PROGRESS":
      return "bg-primary-fixed text-on-primary-fixed";
    case "WAITING_CUSTOMER":
      return "bg-secondary-fixed text-on-secondary-fixed";
    case "RESOLVED":
      return "bg-secondary-container text-on-secondary-container";
    case "CLOSED":
      return "bg-inverse-surface text-surface-bright";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}

export function priorityTone(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-error-container text-on-error-container";
    case "HIGH":
      return "bg-secondary-container text-on-secondary-container";
    case "LOW":
      return "bg-surface-container text-on-surface-variant";
    default:
      return "bg-surface-container-high text-on-surface";
  }
}

export function categoryIcon(category: SupportTicketCategory): LucideIcon {
  switch (category) {
    case "APPOINTMENTS":
      return CalendarDays;
    case "PAYMENT":
    case "BILLING":
    case "SUBSCRIPTION":
      return CreditCard;
    case "STOCK":
      return Package;
    case "WHATSAPP":
    case "MARKETING":
      return MessageSquare;
    case "CUSTOMERS":
    case "ACCOUNT":
    case "LOGIN":
      return Users;
    case "BUG":
      return Bug;
    case "FEATURE_REQUEST":
      return Lightbulb;
    case "AI":
      return Sparkles;
    case "TECHNICAL":
      return Wrench;
    default:
      return Headphones;
  }
}

export const CREATE_CATEGORIES: SupportTicketCategory[] = [
  "APPOINTMENTS",
  "PAYMENT",
  "BILLING",
  "STOCK",
  "WHATSAPP",
  "CUSTOMERS",
  "BUG",
  "FEATURE_REQUEST",
  "TECHNICAL",
  "OTHER",
];

export type KnowledgeGuide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  tone: "primary" | "secondary" | "neutral";
  icon: LucideIcon;
};

export const KNOWLEDGE_GUIDES: KnowledgeGuide[] = [
  {
    id: "agenda",
    eyebrow: "Agenda & Cabines",
    title: "Chevauchements & nettoyage cabine",
    body: "Configurer les délais automatiques entre deux prestations.",
    href: "/agenda/",
    tone: "primary",
    icon: CalendarDays,
  },
  {
    id: "caisse",
    eyebrow: "Caisse & Clôtures",
    title: "Clôture X/Z & écarts de caisse",
    body: "Sceller le tiroir caisse et rapprocher les tickets TPE.",
    href: "/cash-register/",
    tone: "secondary",
    icon: Wallet,
  },
  {
    id: "stock",
    eyebrow: "Stocks & Matières",
    title: "Inventaire physique",
    body: "Compter les produits sans interrompre l’activité cabine.",
    href: "/products/",
    tone: "primary",
    icon: Package,
  },
  {
    id: "cndp",
    eyebrow: "Conformité CNDP",
    title: "Import clientes & consentements",
    body: "Recueil de consentement pour SMS et WhatsApp.",
    href: "/settings/",
    tone: "neutral",
    icon: Users,
  },
];

export type DiagnosticAction = {
  id: string;
  label: string;
  href: string;
};

export const DIAGNOSTIC_ACTIONS: DiagnosticAction[] = [
  { id: "cabine", label: "Comment débloquer une cabine en conflit ?", href: "/agenda/" },
  { id: "cmi", label: "Résoudre un refus de transaction CMI / TPE", href: "/payments/" },
  { id: "wa", label: "Rétablir la passerelle WhatsApp", href: "/whatsapp/" },
  { id: "access", label: "Ajouter un droit d’accès collaboratrice", href: "/staff/" },
];

export type CreateModalMode = "ticket" | "bug" | "feature";

export type SupportViewModel = {
  orgName: string;
  roleLabel: string;
  userName: string;
  canWrite: boolean;
  loading: boolean;
  items: SupportTicketListItem[];
  filtered: SupportTicketListItem[];
  counters: SupportCounters;
  avgResponseMin: number | null;
  filter: TicketFilter;
  sort: SortKey;
  search: string;
  selectedId: string | null;
  selected: SupportTicketListItem | null;
  messages: SupportMessageItem[];
  messagesLoading: boolean;
  reply: string;
  sending: boolean;
  modalOpen: boolean;
  modalMode: CreateModalMode;
  creating: boolean;
  onFilter: (f: TicketFilter) => void;
  onSort: (s: SortKey) => void;
  onSearch: (q: string) => void;
  onSelect: (id: string) => void;
  onReplyChange: (v: string) => void;
  onSendReply: () => void;
  onOpenModal: (mode: CreateModalMode) => void;
  onCloseModal: () => void;
  onCreate: (input: {
    subject: string;
    category: SupportTicketCategory;
    message: string;
    priority: string;
  }) => Promise<void>;
  onRefresh: () => void;
};

export {
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUS_LABEL,
};
