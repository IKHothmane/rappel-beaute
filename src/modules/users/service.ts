import type { OrgUserListItem } from "@/lib/db/users";

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

export async function listOrgUsers(): Promise<OrgUserListItem[]> {
  const res = await fetch("/api/users/", fetchOpts);
  const data = await parseJson<{ items: OrgUserListItem[] }>(res);
  return data.items;
}
