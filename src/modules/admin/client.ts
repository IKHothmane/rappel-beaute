import type {
  CreateOrganizationInput,
  OrganizationDetail,
  OrganizationListItem,
  PlatformAnalytics,
  PlatformBillingSnapshot,
  PlatformDashboardStats,
  PlatformOrgUser,
  PlatformUsersKpis,
  SubscriptionPlan,
  SupportSessionListItem,
} from "@/types/platform";

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

export async function fetchAdminDashboard() {
  return adminFetch<{
    stats: PlatformDashboardStats & {
      mrrGrowthPercent: number;
      suspendedOrgs: number;
    };
    alerts: {
      id: string;
      severity: "critical" | "high" | "medium" | "low";
      label: string;
      count: number;
      href: string;
    }[];
    mrrSeries: { label: string; value: number }[];
    orgsSeries: {
      label: string;
      newOrgs: number;
      active: number;
      suspended: number;
    }[];
    orgStatus: { active: number; suspended: number; archived: number };
    subscriptions: {
      active: number;
      pending: number;
      expired: number;
      suspended: number;
      expiringSoon: number;
      mrr: number;
      arr: number;
    };
    users: {
      total: number;
      active: number;
      disabled: number;
      thisMonth: number;
      pending: number;
    };
    support: {
      open: number;
      inProgress: number;
      waitingCustomer: number;
      resolved: number;
      urgentOpen: number;
      highOpen: number;
      avgFirstResponseMinutes: number | null;
      avgSatisfaction: number | null;
      byCategory: { category: string; count: number }[];
    };
    topOrgs: {
      id: string;
      name: string;
      mrr: number;
      appointments: number;
      customers: number;
      lastActivityAt: string | null;
    }[];
    health: {
      api: string;
      database: string;
      auth: string;
      email: string;
      whatsapp: string;
      storage: string;
      checkedAt: string;
    };
    payments: { failed: number; pastDue: number };
    audit: {
      id: string;
      platformUserName: string | null;
      organizationName: string | null;
      entityType: string;
      entityId: string;
      action: string;
      createdAt: string;
    }[];
  }>("/api/admin/dashboard/");
}

export async function fetchAdminAnalytics() {
  return adminFetch<PlatformAnalytics>("/api/admin/analytics/");
}

export async function fetchAdminBilling() {
  return adminFetch<PlatformBillingSnapshot>("/api/admin/billing/");
}

export async function fetchAdminUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  organizationId?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.role) sp.set("role", params.role);
  if (params?.status) sp.set("status", params.status);
  if (params?.organizationId) sp.set("organizationId", params.organizationId);
  const q = sp.toString();
  return adminFetch<{
    items: PlatformOrgUser[];
    kpis: PlatformUsersKpis;
    organizations: { id: string; name: string }[];
  }>(`/api/admin/users/${q ? `?${q}` : ""}`);
}

export async function fetchAdminUser(id: string) {
  return adminFetch<{
    user: PlatformOrgUser;
    activity: {
      id: string;
      platformUserName: string | null;
      organizationId: string | null;
      organizationName: string | null;
      action: string;
      entityType: string;
      entityId: string;
      createdAt: string;
    }[];
  }>(`/api/admin/users/${id}/`);
}

export async function patchAdminUser(
  id: string,
  body: {
    status?: "ACTIVE" | "DISABLED";
    role?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    delete?: boolean;
  },
) {
  return adminFetch<{ user: PlatformOrgUser }>(`/api/admin/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function resetAdminUserPassword(id: string) {
  return adminFetch<{
    temporaryPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    loginUrl: string;
    messageTemplate: string;
  }>(`/api/admin/users/${id}/reset-password/`, { method: "POST" });
}

export async function invalidateAdminUserSessions(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/users/${id}/invalidate-sessions/`,
    { method: "POST" },
  );
}

export async function fetchAdminAudit(limit = 100) {
  return adminFetch<{
    items: {
      id: string;
      platformUserName: string | null;
      organizationId: string | null;
      organizationName: string | null;
      entityType: string;
      entityId: string;
      action: string;
      before: unknown;
      after: unknown;
      createdAt: string;
    }[];
  }>(`/api/admin/audit/?limit=${limit}`);
}

export async function fetchSupportSessions(opts?: { openOnly?: boolean }) {
  const q = opts?.openOnly ? "?open=1" : "";
  return adminFetch<{ items: SupportSessionListItem[]; openCount: number }>(
    `/api/admin/support-sessions/${q}`,
  );
}

export async function fetchSupportSession(id: string) {
  return adminFetch<{ item: SupportSessionListItem }>(
    `/api/admin/support-sessions/?id=${encodeURIComponent(id)}`,
  );
}

export async function startSupportSessionApi(organizationId: string, reason: string) {
  return adminFetch<{ sessionId: string }>("/api/admin/support-sessions/", {
    method: "POST",
    body: JSON.stringify({ organizationId, reason }),
  });
}

export async function endSupportSessionApi(sessionId: string) {
  return adminFetch<{ ok: boolean }>("/api/admin/support-sessions/", {
    method: "POST",
    body: JSON.stringify({ sessionId, action: "end" }),
  });
}

export async function fetchOrganizations(params?: {
  search?: string;
  status?: string;
  plan?: SubscriptionPlan;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.status) sp.set("status", params.status);
  if (params?.plan) sp.set("plan", params.plan);
  const q = sp.toString();
  return adminFetch<{ items: OrganizationListItem[] }>(
    `/api/admin/organizations${q ? `?${q}` : ""}`,
  );
}

export async function fetchOrganization(id: string) {
  return adminFetch<{ organization: OrganizationDetail }>(`/api/admin/organizations/${id}/`);
}

export async function createOrganizationApi(input: CreateOrganizationInput) {
  return adminFetch<{
    ok: boolean;
    organizationId: string;
    activationUrl: string;
  }>("/api/admin/organizations/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function suspendOrganizationApi(id: string) {
  return adminFetch<{ ok: boolean }>(`/api/admin/organizations/${id}/suspend/`, {
    method: "POST",
  });
}

export async function reactivateOrganizationApi(id: string) {
  return adminFetch<{ ok: boolean }>(`/api/admin/organizations/${id}/reactivate/`, {
    method: "POST",
  });
}

export async function archiveOrganizationApi(id: string) {
  return adminFetch<{ ok: boolean }>(`/api/admin/organizations/${id}/archive/`, {
    method: "POST",
  });
}

export async function updateOrganizationApi(
  id: string,
  input: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
  },
) {
  return adminFetch<{ organization: OrganizationDetail }>(
    `/api/admin/organizations/${id}/`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export async function resetOwnerAccessApi(id: string) {
  return adminFetch<{ ok: boolean; activationUrl: string }>(
    `/api/admin/organizations/${id}/reset-access/`,
    { method: "POST" },
  );
}

export async function platformLogin(email: string, password: string) {
  const res = await fetch("/api/auth/platform/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Identifiants invalides.");
  return res.json();
}

export async function platformLogout() {
  await fetch("/api/auth/platform/login/", { method: "DELETE", credentials: "include" });
}

export type AdminSubscriptionRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationEmail: string | null;
  planId: string;
  planCode: SubscriptionPlan;
  planName: string;
  status: string;
  priceSnapshot: number;
  currencySnapshot: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  startedAt: string;
  daysUntilExpiry: number;
  urgency: "ok" | "soon" | "expired";
  paymentLabel: string;
};

export async function fetchAdminSubscriptions(params?: {
  search?: string;
  plan?: string;
  status?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.plan) sp.set("plan", params.plan);
  if (params?.status) sp.set("status", params.status);
  const q = sp.toString();
  return adminFetch<{
    items: AdminSubscriptionRow[];
    kpis: {
      total: number;
      active: number;
      expiringSoon: number;
      expired: number;
      mrr: number;
    };
    plans: { id: string; code: string; name: string; price: number }[];
    organizations: { id: string; name: string }[];
  }>(`/api/admin/subscriptions/${q ? `?${q}` : ""}`);
}

export async function fetchAdminSubscription(id: string) {
  return adminFetch<{
    item: AdminSubscriptionRow;
    history: {
      id: string;
      platformUserName: string | null;
      action: string;
      before: unknown;
      after: unknown;
      createdAt: string;
    }[];
    plans: { id: string; code: string; name: string; price: number }[];
  }>(`/api/admin/subscriptions/${id}/`);
}

export async function adminSubscriptionAction(
  id: string,
  body: Record<string, unknown>,
) {
  return adminFetch<{ ok: boolean; newEnd?: string; messageTemplate?: string }>(
    `/api/admin/subscriptions/${id}/`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function createAdminSubscriptionApi(input: {
  organizationId: string;
  planCode: SubscriptionPlan;
}) {
  return adminFetch<{ ok: boolean; id: string }>("/api/admin/subscriptions/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdminSession() {
  const res = await fetch("/api/auth/session/", { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    user: {
      accountType?: string;
      scope?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
      id?: string;
    } | null;
  };
  if (!data.user || data.user.accountType !== "PLATFORM") return null;
  return data.user;
}
