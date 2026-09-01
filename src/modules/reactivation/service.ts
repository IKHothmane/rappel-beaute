import type {
  ReactivationBucket,
  ReactivationCustomerItem,
  ReactivationKpis,
  ReactivationSettings,
  UpdateReactivationSettingsInput,
} from "@/types/reactivation";
import {
  REACTIVATION_BUCKET_LABEL,
  REACTIVATION_BUCKETS,
} from "@/types/reactivation";

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

export async function getReactivationDashboard(params?: {
  bucket?: ReactivationBucket | null;
  relanceOnly?: boolean;
}): Promise<{
  data: ReactivationCustomerItem[];
  kpis: ReactivationKpis;
  settings: ReactivationSettings;
}> {
  const q = new URLSearchParams();
  if (params?.bucket) q.set("bucket", params.bucket);
  if (params?.relanceOnly === false) q.set("relanceOnly", "false");
  const res = await fetch(`/api/reactivation/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function prepareReactivationWhatsApp(customerId: string) {
  const res = await fetch("/api/reactivation/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "prepareWhatsApp", customerId }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, ...data };
}

export async function snoozeReactivationCustomer(customerId: string, days = 30) {
  const res = await fetch("/api/reactivation/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "snooze", customerId, days }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const };
}

export async function updateReactivationSettings(input: UpdateReactivationSettingsInput) {
  const res = await fetch("/api/reactivation/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateSettings", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, settings: data as ReactivationSettings };
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}

export function formatLastVisit(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export { REACTIVATION_BUCKET_LABEL, REACTIVATION_BUCKETS };
