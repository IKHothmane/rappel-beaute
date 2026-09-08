export type AdminSupportTicketItem = {
  id: string;
  organizationId: string;
  organizationName?: string;
  planCode?: string | null;
  createdByName?: string;
  subject: string;
  category: import("@/lib/db/support-tickets").SupportTicketCategory;
  status: import("@/lib/db/support-tickets").SupportTicketStatus;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastSenderType?: "INSTITUT" | "PLATFORM" | null;
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

export async function fetchSupportTickets(params?: { status?: string }) {
  const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  return adminFetch<{
    kpis: {
      open: number;
      inProgress: number;
      waitingCustomer: number;
      resolved: number;
    };
    items: AdminSupportTicketItem[];
  }>(`/api/admin/support/tickets/${q}`);
}

export async function fetchSupportTicket(id: string) {
  return adminFetch<{
    ticket: AdminSupportTicketItem;
    messages: import("@/modules/support/service").SupportMessageItem[];
  }>(`/api/admin/support/tickets/${id}/`);
}

export async function updateSupportTicketAdmin(
  id: string,
  body: { status?: string; assignedToPlatformUserId?: string | null },
) {
  return adminFetch<{ ticket: AdminSupportTicketItem }>(
    `/api/admin/support/tickets/${id}/`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function replySupportTicketAdmin(id: string, message: string) {
  return adminFetch<{ message: import("@/modules/support/service").SupportMessageItem }>(
    `/api/admin/support/tickets/${id}/messages/`,
    { method: "POST", body: JSON.stringify({ message }) },
  );
}
