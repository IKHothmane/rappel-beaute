import type {
  CreateStaffInput,
  CreateStaffLeaveInput,
  StaffAgendaContext,
  StaffDetail,
  StaffListResponse,
  UpdateStaffInput,
  UpdateStaffLeaveInput,
  UpdateStaffScheduleInput,
} from "@/types/staff";

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

export async function listStaff(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  serviceId?: string;
}): Promise<StaffListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.serviceId) q.set("serviceId", params.serviceId);

  const res = await fetch(`/api/staff/?${q.toString()}`, fetchOpts);
  return parseJson<StaffListResponse>(res);
}

export async function listStaffForAgenda(): Promise<StaffAgendaContext[]> {
  const res = await fetch("/api/staff/?agenda=1", fetchOpts);
  const data = await parseJson<{ data: StaffAgendaContext[] }>(res);
  return data.data;
}

export async function getStaff(id: string): Promise<StaffDetail> {
  const res = await fetch(`/api/staff/${id}/`, fetchOpts);
  return parseJson<StaffDetail>(res);
}

export async function createStaff(
  input: CreateStaffInput,
): Promise<{ ok: true; staff: StaffDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/staff/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de créer l'employée." };
    }
    return { ok: true, staff: data as StaffDetail };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export async function updateStaff(
  id: string,
  input: UpdateStaffInput,
): Promise<{ ok: true; staff: StaffDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/staff/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de mettre à jour." };
    }
    return { ok: true, staff: data as StaffDetail };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export async function updateStaffSchedule(
  id: string,
  input: UpdateStaffScheduleInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/staff/${id}/schedule/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de mettre à jour le planning." };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export async function createStaffLeave(
  staffId: string,
  input: CreateStaffLeaveInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/staff/${staffId}/leaves/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de créer le congé." };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export async function updateStaffLeave(
  staffId: string,
  leaveId: string,
  input: UpdateStaffLeaveInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/staff/${staffId}/leaves/${leaveId}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Impossible de mettre à jour le congé." };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

export function formatStaffRevenue(mad: number): string {
  return `${mad.toLocaleString("fr-MA")} MAD`;
}
