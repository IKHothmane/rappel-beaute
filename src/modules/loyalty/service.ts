import type {
  CreatePackageInput,
  CreateRewardInput,
  CustomerLoyaltyView,
  LoyaltyProgramConfig,
  LoyaltyRewardItem,
  PackageListItem,
  RedeemRewardInput,
  UpdateLoyaltyProgramInput,
} from "@/types/loyalty";
import { LOYALTY_LEVEL_LABEL, LOYALTY_TXN_LABEL } from "@/types/loyalty";

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

export async function getLoyaltyDashboard() {
  const res = await fetch("/api/loyalty/", fetchOpts);
  return parseJson<{
    kpis: {
      membersCount: number;
      pointsDistributed: number;
      pointsRedeemed: number;
      rewardsUsed: number;
    };
    ranking: {
      id: string;
      customerId: string;
      customerName: string;
      balance: number;
      lifetimePoints: number;
      level: string;
    }[];
    rewards: LoyaltyRewardItem[];
    program: LoyaltyProgramConfig;
  }>(res);
}

export async function listPackages(customerId?: string): Promise<PackageListItem[]> {
  const q = new URLSearchParams({ view: "packages" });
  if (customerId) q.set("customerId", customerId);
  const res = await fetch(`/api/loyalty/?${q}`, fetchOpts);
  const data = await parseJson<{ data: PackageListItem[] }>(res);
  return data.data;
}

export async function getCustomerLoyalty(customerId: string): Promise<CustomerLoyaltyView> {
  const res = await fetch(`/api/customers/${customerId}/loyalty/?section=loyalty`, fetchOpts);
  return parseJson(res);
}

export async function getCustomerPackages(customerId: string): Promise<PackageListItem[]> {
  const res = await fetch(
    `/api/customers/${customerId}/loyalty/?section=packages`,
    fetchOpts,
  );
  const data = await parseJson<{ data: PackageListItem[] }>(res);
  return data.data;
}

export async function getCustomerPayments(customerId: string) {
  const res = await fetch(
    `/api/customers/${customerId}/loyalty/?section=payments`,
    fetchOpts,
  );
  return parseJson<{ data: unknown[] }>(res);
}

export async function updateProgram(input: UpdateLoyaltyProgramInput) {
  const res = await fetch("/api/loyalty/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateProgram", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, program: data as LoyaltyProgramConfig };
}

export async function createReward(input: CreateRewardInput) {
  const res = await fetch("/api/loyalty/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "createReward", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, reward: data as LoyaltyRewardItem };
}

export async function createPackage(input: CreatePackageInput) {
  const res = await fetch("/api/loyalty/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "createPackage", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, package: data as PackageListItem };
}

export async function redeemReward(input: RedeemRewardInput) {
  const res = await fetch("/api/loyalty/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "redeem", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, result: data };
}

export async function adjustPoints(customerId: string, points: number, reason: string) {
  const res = await fetch("/api/loyalty/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "adjust", customerId, points, reason }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, account: data };
}

export function formatPoints(n: number): string {
  return `${n.toLocaleString("fr-MA")} pts`;
}

export { LOYALTY_LEVEL_LABEL, LOYALTY_TXN_LABEL };
