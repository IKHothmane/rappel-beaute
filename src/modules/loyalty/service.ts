import type {
  CreatePackageInput,
  CreateRewardInput,
  CustomerLoyaltyView,
  LoyaltyBirthdayItem,
  LoyaltyJournalItem,
  LoyaltyKpis,
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

export async function getLoyaltyDashboard(opts: { limit?: number; pin?: string[] } = {}) {
  const params = new URLSearchParams();
  if (typeof opts.limit === "number" && Number.isFinite(opts.limit)) {
    params.set("limit", String(Math.floor(opts.limit)));
  }
  const pins = (opts.pin ?? []).filter(Boolean).slice(0, 20);
  if (pins.length > 0) params.set("pin", pins.join(","));
  const query = params.toString();
  const res = await fetch(query ? `/api/loyalty/?${query}` : "/api/loyalty/", fetchOpts);
  return parseJson<{
    kpis: LoyaltyKpis;
    ranking: {
      id: string;
      customerId: string;
      customerName: string;
      balance: number;
      lifetimePoints: number;
      level: string;
      updatedAt: string;
      phone?: string | null;
      birthDate?: string | null;
      memberSince?: string;
      lastVisitAt?: string | null;
      lastServiceName?: string | null;
      lastServicePrice?: number | null;
    }[];
    rewards: LoyaltyRewardItem[];
    program: LoyaltyProgramConfig;
    journal: LoyaltyJournalItem[];
    birthdays: LoyaltyBirthdayItem[];
    visitCards?: {
      id: string;
      customerId: string;
      customerName: string;
      phone: string | null;
      publicToken?: string;
      visits: number;
      visitsPerReward: number;
      createdAt: string;
      cardCode?: string;
      promoCode?: string | null;
    }[];
    visitCardsTotal?: number;
    passages?: {
      id: string;
      customerId: string;
      customerName: string;
      serviceName: string;
      points: number;
      note: string | null;
      validatedAt: string;
    }[];
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

// ---------------------------------------------------------------------------------------------
// Rattachement d'un numéro / fusion de fiches (POST /api/loyalty/merge/)
// Types alignés sur src/lib/loyalty/merge.ts (non importable côté client : accès base).
// ---------------------------------------------------------------------------------------------

export type LoyaltyMergeSide = {
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  createdAt: string;
  archived: boolean;
  appointmentsCount: number;
  lastAppointmentAt: string | null;
  activeAppointments: number;
  salesCount: number;
  salesTotal: number | string;
  notesCount: number;
  activePackages: number;
  balance: number;
  lifetimePoints: number;
  level: string | null;
  cardsCount: number;
  visits: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  rewardsExpired: number;
  walletInstalled: boolean;
  cardId: string | null;
  cardCode: string | null;
};

export type LoyaltyMergePreview = {
  mode: "merge";
  canonicalPhone: string;
  previewVersion: string;
  source: LoyaltyMergeSide & { cardCreatedAt: string | null };
  target: LoyaltyMergeSide;
  result: {
    totalVisits: number;
    cycle: number;
    visitsPerReward: number;
    remaining: number;
    cumulativeReward: boolean;
    cumulativeRewardReason: "NONE" | "CROSSING" | "STACK_BLOCKED" | "PROGRAM_INACTIVE";
    pointsTransferred: number;
    cardMode: "ALIAS" | "ATTACHED" | "NONE";
    moved: Record<string, number>;
    staying: { item: string; count: number; reason: string }[];
  };
  alerts: { code: string; message: string }[];
};

export type LoyaltyAssignPreview = {
  mode: "assign";
  canonicalPhone: string;
  source: {
    customerId: string;
    firstName: string;
    lastName: string;
    phone: string;
    cardCode: string | null;
    visits: number;
  };
};

export type LoyaltyAssignedResult = {
  mode: "assigned";
  customerId: string;
  phone: string;
  cardCode: string | null;
};

export type LoyaltyMergeResult = {
  mergeId: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  survivingCardId: string | null;
  cardMode: "ALIAS" | "ATTACHED" | "NONE";
  totalVisits: number;
  cycle: number;
  visitsPerReward: number;
  cumulativeRewardId: string | null;
  pointsTransferred: number;
  moved: Record<string, number>;
  replayed: boolean;
};

export type LoyaltyMergeFailure = {
  ok: false;
  /** Code serveur (STALE_PREVIEW, RATE_LIMITED…) ou NETWORK / TIMEOUT / INTERNAL côté client. */
  code: string;
  error: string;
  status: number;
  retryAfterSec?: number;
};
export type LoyaltyMergeCall<T> = { ok: true; data: T } | LoyaltyMergeFailure;

export type LoyaltyMergeSource = { sourceCustomerId: string } | { sourceCardToken: string };

const MERGE_TIMEOUT_MS = 25_000;

async function callMerge<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<LoyaltyMergeCall<T>> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, MERGE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch("/api/loyalty/merge/", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const header = Number(res.headers.get("Retry-After"));
      const fromBody = Number(data?.retryAfterSec);
      const retryAfterSec = Number.isFinite(header) && header > 0 ? header : Number.isFinite(fromBody) && fromBody > 0 ? fromBody : undefined;
      return {
        ok: false,
        code:
          typeof data?.code === "string"
            ? data.code
            : res.status === 429
              ? "RATE_LIMITED"
              : res.status === 403 || res.status === 401
                ? "FORBIDDEN"
                : "INTERNAL",
        error: typeof data?.error === "string" ? data.error : "Erreur réseau",
        status: res.status,
        retryAfterSec,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    if (signal?.aborted) return { ok: false, code: "ABORTED", error: "Requête annulée.", status: 0 };
    return timedOut
      ? { ok: false, code: "TIMEOUT", error: "Le serveur met trop de temps à répondre.", status: 0 }
      : { ok: false, code: "NETWORK", error: "Connexion impossible. Vérifiez le réseau.", status: 0 };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Aperçu : numéro libre (mode « assign ») ou fiche existante (mode « merge »). */
export function previewLoyaltyPhone(input: LoyaltyMergeSource & { phone: string }, signal?: AbortSignal) {
  return callMerge<LoyaltyAssignPreview | LoyaltyMergePreview>({ action: "phone-preview", ...input }, signal);
}

/** Numéro libre : l'enregistre sur la fiche anonyme (ou renvoie l'aperçu de fusion si le numéro vient d'être pris). */
export function assignLoyaltyPhone(
  input: LoyaltyMergeSource & { phone: string; firstName?: string; lastName?: string },
  signal?: AbortSignal,
) {
  return callMerge<LoyaltyAssignedResult | { mode: "merge"; preview: LoyaltyMergePreview }>(
    { action: "assign-phone", ...input },
    signal,
  );
}

export function mergeLoyaltyCustomers(
  input: { sourceCustomerId: string; targetCustomerId: string; idempotencyKey: string; previewVersion: string },
  signal?: AbortSignal,
) {
  return callMerge<LoyaltyMergeResult>({ action: "merge", ...input, identityConfirmed: true }, signal);
}

/**
 * Sonde de disponibilité : une requête volontairement incomplète. Le serveur contrôle d'abord le rôle (403),
 * puis l'activation (404 MERGE_DISABLED), puis valide le corps (400 INVALID_INPUT) : aucun effet sur les données.
 */
export async function probeLoyaltyMerge(): Promise<"available" | "unavailable" | "unknown"> {
  const res = await callMerge<unknown>({ action: "phone-preview" });
  if (res.ok) return "available";
  if (res.code === "INVALID_INPUT" || res.code === "RATE_LIMITED") return "available";
  if (res.code === "FORBIDDEN" || res.code === "MERGE_DISABLED") return "unavailable";
  return "unknown";
}

export function formatPoints(n: number): string {
  return `${n.toLocaleString("fr-MA")} pts`;
}

export { LOYALTY_LEVEL_LABEL, LOYALTY_TXN_LABEL };
