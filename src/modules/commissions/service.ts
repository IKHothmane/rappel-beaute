import type {
  CommissionDetail,
  CommissionListResponse,
  CommissionPeriodInfo,
  CommissionPeriodPreset,
  CreateCommissionAdjustmentInput,
  StaffCommissionSummary,
} from "@/types/commission";

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

export async function listCommissions(params: {
  page?: number;
  limit?: number;
  preset?: CommissionPeriodPreset;
  from?: string;
  to?: string;
  staffId?: string;
  serviceId?: string;
  paid?: string;
  search?: string;
}): Promise<CommissionListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.preset) q.set("preset", params.preset);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.staffId) q.set("staffId", params.staffId);
  if (params.serviceId) q.set("serviceId", params.serviceId);
  if (params.paid && params.paid !== "all") q.set("paid", params.paid);
  if (params.search) q.set("search", params.search);
  const res = await fetch(`/api/commissions/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function getCommission(id: string): Promise<CommissionDetail> {
  const res = await fetch(`/api/commissions/${id}/`, fetchOpts);
  return parseJson(res);
}

export async function adjustCommission(
  id: string,
  input: CreateCommissionAdjustmentInput,
): Promise<{ ok: true; commission: CommissionDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/commissions/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust", ...input }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, commission: data as CommissionDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function markCommissionPaid(
  id: string,
  paid: boolean,
): Promise<{ ok: true; commission: CommissionDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/commissions/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: paid ? "markPaid" : "markUnpaid" }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, commission: data as CommissionDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function closeCommissionPeriod(
  year: number,
  month: number,
): Promise<{ ok: true; period: CommissionPeriodInfo } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/commissions/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "closePeriod", year, month }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, period: data as CommissionPeriodInfo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function getStaffCommissions(
  staffId: string,
  opts?: { year?: number; month?: number },
): Promise<StaffCommissionSummary> {
  const q = new URLSearchParams();
  if (opts?.year) q.set("year", String(opts.year));
  if (opts?.month) q.set("month", String(opts.month));
  const res = await fetch(`/api/staff/${staffId}/commissions/?${q}`, fetchOpts);
  return parseJson(res);
}

export function downloadCommissionsExport(params: {
  preset?: CommissionPeriodPreset;
  from?: string;
  to?: string;
  staffId?: string;
  serviceId?: string;
  format: "csv" | "excel";
}) {
  const q = new URLSearchParams();
  q.set("format", params.format);
  if (params.preset) q.set("preset", params.preset);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.staffId) q.set("staffId", params.staffId);
  if (params.serviceId) q.set("serviceId", params.serviceId);
  window.open(`/api/reports/commissions/?${q}`, "_blank");
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`;
}

export function formatRate(item: {
  type: string;
  percentageSnapshot: number | null;
  fixedSnapshot: number | null;
}): string {
  if (item.type === "PERCENTAGE") return `${item.percentageSnapshot ?? 0} %`;
  return `${item.fixedSnapshot ?? 0} MAD`;
}
