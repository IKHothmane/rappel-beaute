import type { BookingPolicySettings, UpdateBookingPolicyInput } from "@/types/booking-policy";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body;
}

export async function getBookingPolicy() {
  return api<BookingPolicySettings>("/api/settings/booking-policy/");
}

export async function updateBookingPolicyApi(input: UpdateBookingPolicyInput) {
  try {
    const settings = await api<BookingPolicySettings>("/api/settings/booking-policy/", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return { ok: true as const, settings };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Erreur",
    };
  }
}
