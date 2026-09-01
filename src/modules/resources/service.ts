import type {
  CreateMaintenanceInput,
  CreateResourceInput,
  ResourceAgendaContext,
  ResourceAvailability,
  ResourceDetail,
  ResourceListResponse,
  UpdateMaintenanceInput,
  UpdateResourceInput,
} from "@/types/resource";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau";
    throw new Error(msg);
  }
  return data as T;
}

export async function listResources(params: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  active?: boolean | null;
  serviceId?: string;
}): Promise<ResourceListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.type) q.set("type", params.type);
  if (params.active === true) q.set("active", "true");
  if (params.active === false) q.set("active", "false");
  if (params.serviceId) q.set("serviceId", params.serviceId);
  const res = await fetch(`/api/resources/?${q.toString()}`, fetchOpts);
  return parseJson<ResourceListResponse>(res);
}

export async function listResourcesForAgenda(): Promise<ResourceAgendaContext[]> {
  const res = await fetch("/api/resources/?agenda=1", fetchOpts);
  const data = await parseJson<{ data: ResourceAgendaContext[] }>(res);
  return data.data;
}

export async function getResource(id: string): Promise<ResourceDetail> {
  const res = await fetch(`/api/resources/${id}/`, fetchOpts);
  return parseJson<ResourceDetail>(res);
}

export async function getResourceAvailability(
  id: string,
  date: string,
): Promise<ResourceAvailability> {
  const res = await fetch(`/api/resources/${id}/availability/?date=${date}`, fetchOpts);
  return parseJson<ResourceAvailability>(res);
}

export async function createResource(
  input: CreateResourceInput,
): Promise<{ ok: true; resource: ResourceDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/resources/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Impossible de créer la ressource." };
    return { ok: true, resource: data as ResourceDetail };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

export async function updateResource(
  id: string,
  input: UpdateResourceInput,
): Promise<{ ok: true; resource: ResourceDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/resources/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Impossible de mettre à jour." };
    return { ok: true, resource: data as ResourceDetail };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

export async function createResourceMaintenance(
  resourceId: string,
  input: CreateMaintenanceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/resources/${resourceId}/maintenance/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Impossible de créer la maintenance." };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}

export async function updateResourceMaintenance(
  resourceId: string,
  maintenanceId: string,
  input: UpdateMaintenanceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/resources/${resourceId}/maintenance/${maintenanceId}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Impossible de mettre à jour." };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur réseau" };
  }
}
