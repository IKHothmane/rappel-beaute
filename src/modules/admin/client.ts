import type {
  CreateOrganizationInput,
  OrganizationDetail,
  OrganizationListItem,
  PlatformDashboardStats,
  SubscriptionPlan,
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
  return adminFetch<{ stats: PlatformDashboardStats; audit: unknown[] }>("/api/admin/dashboard/");
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

export async function fetchAdminSession() {
  const res = await fetch("/api/auth/session/", { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: { accountType?: string; scope?: string } | null };
  if (!data.user || data.user.accountType !== "PLATFORM") return null;
  return data.user;
}
