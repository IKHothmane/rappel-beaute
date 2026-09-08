import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/lib/db/support-tickets";

export type SupportTicketListItem = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastSenderType?: "INSTITUT" | "PLATFORM" | null;
};

export type SupportMessageItem = {
  id: string;
  ticketId: string;
  senderType: "INSTITUT" | "PLATFORM";
  message: string;
  createdAt: string;
  senderName?: string | null;
};

export const SUPPORT_CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  TECHNICAL: "Technique",
  BILLING: "Facturation",
  ACCOUNT: "Compte",
  FEATURE_REQUEST: "Idée / fonctionnalité",
  BUG: "Bug",
  OTHER: "Autre",
};

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "Nouveau",
  IN_PROGRESS: "En cours",
  WAITING_CUSTOMER: "En attente",
  RESOLVED: "Résolu",
  CLOSED: "Clôturé",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
  return body;
}

export async function listSupportTickets() {
  return api<{ items: SupportTicketListItem[] }>("/api/support/tickets/");
}

export async function getSupportTicket(id: string) {
  return api<{
    ticket: SupportTicketListItem & { createdByName?: string };
    messages: SupportMessageItem[];
  }>(`/api/support/tickets/${id}/`);
}

export async function createSupportTicket(input: {
  subject: string;
  category: SupportTicketCategory;
  message: string;
}) {
  return api<{ ticket: SupportTicketListItem }>("/api/support/tickets/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function replySupportTicket(id: string, message: string) {
  return api<{ message: SupportMessageItem }>(
    `/api/support/tickets/${id}/messages/`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}
