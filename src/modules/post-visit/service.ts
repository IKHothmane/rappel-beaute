import type { PostVisitKpis, PostVisitListItem, PostVisitSettings } from "@/types/post-visit";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function listPostVisit() {
  return api<{
    data: PostVisitListItem[];
    kpis: PostVisitKpis;
    settings: PostVisitSettings;
  }>("/api/post-visit/");
}

export async function skipPostVisit(appointmentId: string) {
  try {
    await api("/api/post-visit/", {
      method: "POST",
      body: JSON.stringify({ action: "skip", appointmentId }),
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function syncPostVisitApi() {
  try {
    await api("/api/post-visit/", {
      method: "POST",
      body: JSON.stringify({ action: "sync" }),
    });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Erreur" };
  }
}

