import { SITE } from "@/lib/site";

/** Slug marketing pour query ?service= / ?staff= */
export function slugifyLabel(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type BookingQrQuery = {
  service?: string | null;
  staff?: string | null;
  source?: string | null;
};

/**
 * URL canonique de réservation publique (app subdomain).
 * Toujours avec trailing slash ; prix/durée jamais dans l'URL.
 */
export function buildPublicBookingUrl(opts: {
  slug: string;
  service?: string | null;
  staff?: string | null;
  source?: string | null;
  baseUrl?: string;
}): string {
  const base = (opts.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? SITE.appUrl).replace(
    /\/$/,
    "",
  );
  const url = new URL(`${base}/book/${encodeURIComponent(opts.slug)}/`);
  if (opts.source?.trim()) url.searchParams.set("source", opts.source.trim().slice(0, 40));
  if (opts.service?.trim()) url.searchParams.set("service", opts.service.trim().slice(0, 80));
  if (opts.staff?.trim()) url.searchParams.set("staff", opts.staff.trim().slice(0, 80));
  return url.toString();
}

export function parseBookingQrQuery(
  searchParams: URLSearchParams | BookingQrQuery,
): BookingQrQuery {
  if (searchParams instanceof URLSearchParams) {
    return {
      service: searchParams.get("service"),
      staff: searchParams.get("staff"),
      source: searchParams.get("source"),
    };
  }
  return {
    service: searchParams.service ?? null,
    staff: searchParams.staff ?? null,
    source: searchParams.source ?? null,
  };
}
