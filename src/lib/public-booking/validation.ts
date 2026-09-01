import type { PublicBookingInput } from "@/types/public-booking";
import { normalizePhone } from "@/lib/validation/customer";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function isoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function timeHm(v: string): boolean {
  return /^\d{2}:\d{2}$/.test(v);
}

const FORBIDDEN_KEYS = new Set([
  "organizationId",
  "price",
  "duration",
  "durationMin",
  "endAt",
  "startAt",
  "commission",
]);

export function parsePublicBookingBody(
  body: unknown,
): { ok: true; data: PublicBookingInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Corps de requête invalide." };
  }

  const raw = body as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return { ok: false, error: `Paramètre interdit : ${key}.` };
    }
  }

  const serviceId = str(raw.serviceId);
  const date = str(raw.date);
  const time = str(raw.time);
  if (!serviceId) return { ok: false, error: "Service requis." };
  if (!date || !isoDate(date)) return { ok: false, error: "Date invalide." };
  if (!time || !timeHm(time)) return { ok: false, error: "Heure invalide." };

  const customerRaw = raw.customer;
  if (!customerRaw || typeof customerRaw !== "object") {
    return { ok: false, error: "Informations cliente requises." };
  }
  const c = customerRaw as Record<string, unknown>;
  const firstName = str(c.firstName);
  const lastName = str(c.lastName);
  const phone = normalizePhone(String(c.phone ?? ""));
  if (!firstName) return { ok: false, error: "Prénom requis." };
  if (!lastName) return { ok: false, error: "Nom requis." };
  if (phone.length < 8) return { ok: false, error: "Téléphone invalide." };

  const email = str(c.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "E-mail invalide." };
  }

  const staffIdRaw = str(raw.staffId);
  const staffId =
    staffIdRaw === "any" || staffIdRaw === "" ? null : staffIdRaw ?? null;

  return {
    ok: true,
    data: {
      serviceId,
      staffId,
      date,
      time,
      customer: {
        firstName,
        lastName,
        phone,
        email: email ?? null,
        marketingOptIn: c.marketingOptIn === true,
      },
      notes: str(raw.notes) ?? null,
    },
  };
}

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
