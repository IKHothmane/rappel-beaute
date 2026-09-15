import type {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/lib/db/support-tickets";

export type AdminSupportTicketItem = {
  id: string;
  ref: string;
  ticketNumber: number;
  organizationId: string;
  organizationName?: string;
  planCode?: string | null;
  createdByUserId: string;
  createdByName?: string;
  createdByEmail?: string | null;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignedToPlatformUserId: string | null;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  firstResponseAt: string | null;
  satisfactionRating: number | null;
  satisfactionComment: string | null;
  satisfactionAt: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastSenderType?: "INSTITUT" | "PLATFORM" | null;
};

export type AdminSupportMessageItem = {
  id: string;
  ticketId: string;
  senderType: "INSTITUT" | "PLATFORM";
  message: string;
  isInternal: boolean;
  createdAt: string;
  senderName?: string | null;
};

export type AdminSupportKpis = {
  total: number;
  open: number;
  inProgress: number;
  waitingCustomer: number;
  resolved: number;
  closed: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  avgSatisfaction: number | null;
  avgFirstResponseLabel: string;
  avgResolutionLabel: string;
};

export type AdminSupportAttention = {
  urgentOpen: number;
  highOpen: number;
  waitingCustomer: number;
  staleNoReply: number;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type SupportListParams = {
  status?: string;
  priority?: string;
  category?: string;
  organizationId?: string;
  q?: string;
  attention?: string;
};

export async function fetchSupportTickets(params?: SupportListParams) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.category) q.set("category", params.category);
  if (params?.organizationId) q.set("organizationId", params.organizationId);
  if (params?.q) q.set("q", params.q);
  if (params?.attention) q.set("attention", params.attention);
  const qs = q.toString();
  return adminFetch<{
    kpis: AdminSupportKpis;
    attention: AdminSupportAttention;
    assignees: { id: string; name: string; email: string; role: string }[];
    orgs: { id: string; name: string }[];
    items: AdminSupportTicketItem[];
  }>(`/api/admin/support/tickets/${qs ? `?${qs}` : ""}`);
}

export async function fetchSupportTicket(id: string) {
  return adminFetch<{
    ticket: AdminSupportTicketItem;
    messages: AdminSupportMessageItem[];
    history: {
      id: string;
      platformUserName: string | null;
      action: string;
      before: unknown;
      after: unknown;
      createdAt: string;
    }[];
  }>(`/api/admin/support/tickets/${id}/`);
}

export async function fetchSupportAnalytics() {
  return adminFetch<{
    byDay: { date: string; label: string; count: number }[];
    byCategory: { category: SupportTicketCategory; count: number }[];
    byPriority: { priority: SupportTicketPriority; count: number; percent: number }[];
    responseByWeekday: { weekday: number; label: string; avgMinutes: number | null }[];
  }>(`/api/admin/support/tickets/analytics/`);
}

export async function fetchOrgUsersForTicket(orgId: string) {
  return adminFetch<{ users: { id: string; name: string; email: string; role: string }[] }>(
    `/api/admin/support/tickets/org-users/${orgId}/`,
  );
}

export async function createSupportTicketAdmin(body: {
  organizationId: string;
  createdByUserId: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  assignedToPlatformUserId?: string | null;
}) {
  return adminFetch<{ ticket: AdminSupportTicketItem }>(`/api/admin/support/tickets/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSupportTicketAdmin(
  id: string,
  body: {
    status?: string;
    priority?: string;
    category?: string;
    assignedToPlatformUserId?: string | null;
  },
) {
  return adminFetch<{ ticket: AdminSupportTicketItem }>(
    `/api/admin/support/tickets/${id}/`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function replySupportTicketAdmin(
  id: string,
  body: { message: string; isInternal?: boolean; setStatus?: string },
) {
  return adminFetch<{ message: AdminSupportMessageItem }>(
    `/api/admin/support/tickets/${id}/messages/`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export const SUPPORT_CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  ACCOUNT: "Compte",
  LOGIN: "Connexion",
  SUBSCRIPTION: "Abonnement",
  BILLING: "Facturation",
  PAYMENT: "Paiement",
  APPOINTMENTS: "Rendez-vous",
  CUSTOMERS: "Clientes",
  STOCK: "Stock",
  MARKETING: "Marketing",
  WHATSAPP: "WhatsApp",
  AI: "IA",
  BUG: "Bug",
  TECHNICAL: "Technique",
  FEATURE_REQUEST: "Fonctionnalité",
  OTHER: "Autre",
};

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  WAITING_CUSTOMER: "En attente client",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

export const SUPPORT_PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  URGENT: "Urgent",
  HIGH: "Haute",
  NORMAL: "Normale",
  LOW: "Basse",
};

export const SUPPORT_CATEGORIES = Object.keys(
  SUPPORT_CATEGORY_LABEL,
) as SupportTicketCategory[];

export const SUPPORT_STATUSES = Object.keys(
  SUPPORT_STATUS_LABEL,
) as SupportTicketStatus[];

export const SUPPORT_PRIORITIES = Object.keys(
  SUPPORT_PRIORITY_LABEL,
) as SupportTicketPriority[];
