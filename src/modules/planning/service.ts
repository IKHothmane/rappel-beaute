import type {
  CreateOrganizationClosureInput,
  CreateStaffOvertimeInput,
  CreateStaffReplacementInput,
  OrganizationClosureItem,
  StaffOvertimeItem,
  StaffReplacementItem,
} from "@/types/planning";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
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

export async function loadPlanningApi() {
  const res = await fetch("/api/planning/", fetchOpts);
  return parseJson<{
    closures: OrganizationClosureItem[];
    overtimes: StaffOvertimeItem[];
    replacements: StaffReplacementItem[];
  }>(res);
}

export async function createClosureApi(input: CreateOrganizationClosureInput) {
  const res = await fetch("/api/planning/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "closure", ...input }),
  });
  return parseJson<OrganizationClosureItem>(res);
}

export async function createOvertimeApi(input: CreateStaffOvertimeInput) {
  const res = await fetch("/api/planning/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "overtime", ...input }),
  });
  return parseJson<StaffOvertimeItem>(res);
}

export async function createReplacementApi(input: CreateStaffReplacementInput) {
  const res = await fetch("/api/planning/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "replacement", ...input }),
  });
  return parseJson<StaffReplacementItem>(res);
}

export async function deletePlanningItemApi(
  kind: "closure" | "overtime" | "replacement",
  id: string,
) {
  const res = await fetch(`/api/planning/?kind=${kind}&id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson<{ ok: boolean }>(res);
}
