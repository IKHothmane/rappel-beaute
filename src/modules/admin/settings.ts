import type { PlatformSettingsData } from "@/lib/db/platform-settings";
import type { PlatformBillingLine } from "@/types/platform";

export type AdminSettingsBundle = {
  settings: PlatformSettingsData;
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    locale: string;
    timezone: string;
    role: string;
  } | null;
  integrations: {
    whatsapp: {
      autoSendEnabled: boolean;
      webhookConfigured: boolean;
      phoneNumberIdMasked: string;
      verifyTokenMasked: string;
      hasAccessToken: boolean;
      mode: string;
    };
    ai: {
      configured: boolean;
      provider: string;
      model: string;
      keyMasked: string;
    };
    email: {
      resendConfigured: boolean;
      keyMasked: string;
    };
  };
  snapshots: {
    orgs: number;
    users: number;
    mrr: number;
    openTickets: number;
    paymentsReceived: number;
    paymentsPending: number;
    paymentsFailed: number;
    recentPayments: PlatformBillingLine[];
  };
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAdminSettings() {
  return adminFetch<AdminSettingsBundle>("/api/admin/settings/");
}

export async function patchAdminSettings(patch: Partial<PlatformSettingsData>) {
  return adminFetch<{ settings: PlatformSettingsData }>("/api/admin/settings/", {
    method: "PATCH",
    body: JSON.stringify({ patch }),
  });
}

export async function patchAdminProfile(body: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  locale?: string;
  timezone?: string;
}) {
  return adminFetch<{ profile: AdminSettingsBundle["profile"] }>(
    "/api/admin/settings/profile/",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function changeAdminPassword(body: {
  currentPassword: string;
  newPassword: string;
}) {
  return adminFetch<{ ok: boolean }>("/api/admin/settings/password/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
