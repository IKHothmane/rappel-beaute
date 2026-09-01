import type {
  PublicAvailabilitySlot,
  PublicBookingInput,
  PublicBookingResult,
  PublicOrganizationProfile,
  PublicServiceItem,
  PublicStaffItem,
} from "@/types/public-booking";

const fetchOpts = { cache: "no-store" as const };

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

export async function getPublicOrganization(slug: string): Promise<PublicOrganizationProfile> {
  const res = await fetch(`/api/public/${slug}/`, fetchOpts);
  return parseJson(res);
}

export async function getPublicServices(slug: string): Promise<PublicServiceItem[]> {
  const res = await fetch(`/api/public/${slug}/services/`, fetchOpts);
  const data = await parseJson<{ data: PublicServiceItem[] }>(res);
  return data.data;
}

export async function getPublicStaff(
  slug: string,
  serviceId: string,
  date?: string,
): Promise<PublicStaffItem[]> {
  const q = new URLSearchParams({ serviceId });
  if (date) q.set("date", date);
  const res = await fetch(`/api/public/${slug}/staff/?${q}`, fetchOpts);
  const data = await parseJson<{ data: PublicStaffItem[] }>(res);
  return data.data;
}

export async function getPublicSlots(
  slug: string,
  opts: { serviceId: string; date: string; staffId?: string | null },
): Promise<PublicAvailabilitySlot[]> {
  const q = new URLSearchParams({ serviceId: opts.serviceId, date: opts.date });
  if (opts.staffId) q.set("staffId", opts.staffId);
  const res = await fetch(`/api/public/${slug}/availability/?${q}`, fetchOpts);
  const data = await parseJson<{ slots: PublicAvailabilitySlot[] }>(res);
  return data.slots;
}

export async function getPublicAvailableDates(
  slug: string,
  opts: { serviceId: string; from: string; to: string; staffId?: string | null },
): Promise<string[]> {
  const q = new URLSearchParams({
    serviceId: opts.serviceId,
    from: opts.from,
    to: opts.to,
  });
  if (opts.staffId) q.set("staffId", opts.staffId);
  const res = await fetch(`/api/public/${slug}/availability/?${q}`, fetchOpts);
  const data = await parseJson<{ dates: string[] }>(res);
  return data.dates;
}

export async function submitPublicBooking(
  slug: string,
  input: PublicBookingInput,
): Promise<PublicBookingResult> {
  const res = await fetch(`/api/public/${slug}/bookings/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}

export function formatBookingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatBookingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
