import type {
  CreateServiceInput,
  ServiceAgendaOption,
  ServiceDetail,
  ServiceFormOptions,
  ServiceListResponse,
  UpdateServiceInput,
} from "@/types/service";

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

export async function listServices(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  active?: boolean | null;
}): Promise<ServiceListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.active === true) q.set("active", "true");
  if (params.active === false) q.set("active", "false");

  const res = await fetch(`/api/services/?${q.toString()}`, fetchOpts);
  return parseJson<ServiceListResponse>(res);
}

export async function listServicesForAgenda(): Promise<ServiceAgendaOption[]> {
  const res = await fetch("/api/services/?agenda=1", fetchOpts);
  const data = await parseJson<{ data: ServiceAgendaOption[] }>(res);
  return data.data;
}

export async function getServiceFormOptions(): Promise<ServiceFormOptions> {
  const res = await fetch("/api/services/?options=1", fetchOpts);
  return parseJson<ServiceFormOptions>(res);
}

export async function getService(id: string): Promise<ServiceDetail> {
  const res = await fetch(`/api/services/${id}/`, fetchOpts);
  return parseJson<ServiceDetail>(res);
}

export async function createService(
  input: CreateServiceInput,
): Promise<{ ok: true; service: ServiceDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/services/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de créer le service." };
    }
    return { ok: true, service: data as ServiceDetail };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<{ ok: true; service: ServiceDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/services/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de mettre à jour." };
    }
    return { ok: true, service: data as ServiceDetail };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function formatPrice(mad: number): string {
  return `${mad.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`;
}
