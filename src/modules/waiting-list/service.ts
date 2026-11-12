import type { WaitingListEntry, WaitingListStatus } from "@/types/waiting-list";

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

export async function listWaitingList(params?: {
  status?: WaitingListStatus;
  serviceId?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.serviceId) sp.set("serviceId", params.serviceId);
  const q = sp.toString();
  return api<{ items: WaitingListEntry[] }>(
    `/api/waiting-list/${q ? `?${q}` : ""}`,
  );
}

