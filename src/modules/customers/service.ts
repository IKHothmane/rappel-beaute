import type {
  CreateCustomerInput,
  CustomerAppointmentHistory,
  CustomerDetail,
  CustomerListResponse,
  CustomerSegment,
  UpdateCustomerInput,
} from "@/types/customer";

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

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

export async function listCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
  segment?: CustomerSegment;
}): Promise<CustomerListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.segment && params.segment !== "ALL") q.set("segment", params.segment);

  const res = await fetch(`/api/customers/?${q.toString()}`, fetchOpts);
  return parseJson<CustomerListResponse>(res);
}

export async function getCustomer(
  id: string,
  withHistory = false,
): Promise<{ customer: CustomerDetail; history?: CustomerAppointmentHistory[] }> {
  const suffix = withHistory ? "?history=1" : "";
  const res = await fetch(`/api/customers/${id}/${suffix}`, fetchOpts);
  const data = await parseJson<CustomerDetail | { customer: CustomerDetail; history?: CustomerAppointmentHistory[] }>(res);
  if (data && typeof data === "object" && "customer" in data) {
    return data;
  }
  return { customer: data as CustomerDetail };
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<{ ok: true; customer: CustomerDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/customers/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de créer la cliente." };
    }
    return { ok: true, customer: data as CustomerDetail };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<{ ok: true; customer: CustomerDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/customers/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de mettre à jour." };
    }
    return { ok: true, customer: data as CustomerDetail };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export function formatLastVisit(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatSegmentLabel(segment: CustomerSegment): string {
  const map: Record<CustomerSegment, string> = {
    ALL: "Toutes",
    ACTIVE: "Actives",
    VIP: "VIP",
    NEW: "Nouvelles",
    INACTIVE: "Inactives",
    AT_RISK: "À risque",
  };
  return map[segment];
}

export function formatStatusLabel(segment: CustomerSegment): string {
  return formatSegmentLabel(segment);
}
