import type {
  CreateCustomerInput,
  CustomerSegment,
  CustomerStatus,
  UpdateCustomerInput,
} from "@/types/customer";

export const PHONE_MAX_DIGITS = 10;

export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

/** Garde uniquement les chiffres, format local Maroc, 10 max (ex. 0655443322). */
export function limitPhoneDigits(raw: string, max = PHONE_MAX_DIGITS): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00212")) digits = digits.slice(2);
  if (digits.startsWith("212")) digits = `0${digits.slice(3)}`;
  return digits.slice(0, max);
}

export function moroccoPhoneSearchVariants(raw: string): string[] {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return [];
  if (digits.startsWith("00212")) digits = digits.slice(2);

  const variants = new Set<string>([digits]);
  if (digits.startsWith("212")) {
    const rest = digits.slice(3);
    if (rest) {
      variants.add(`0${rest}`);
      variants.add(rest);
    }
  } else if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    if (rest) {
      variants.add(`212${rest}`);
      variants.add(rest);
    }
  } else if (digits.length >= 8) {
    variants.add(`0${digits}`);
    variants.add(`212${digits}`);
  }
  return [...variants];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseOptionalDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export function validateCreateCustomer(body: unknown): ValidationResult<CreateCustomerInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps de requête invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const firstName = String(raw.firstName ?? "").trim();
  const lastName = String(raw.lastName ?? "").trim();
  const phone = limitPhoneDigits(String(raw.phone ?? ""));

  if (!firstName) errors.firstName = "Le prénom est obligatoire.";
  if (!lastName) errors.lastName = "Le nom est obligatoire.";
  if (!phone || phone.length < 8) errors.phone = "Le téléphone est obligatoire.";
  if (phone.length > PHONE_MAX_DIGITS) errors.phone = "Le téléphone ne doit pas dépasser 10 chiffres.";

  const emailRaw = raw.email != null ? String(raw.email).trim() : "";
  if (emailRaw && !isValidEmail(emailRaw)) errors.email = "E-mail invalide.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      phone,
      email: emailRaw || undefined,
      birthDate: parseOptionalDate(raw.birthDate),
      address: raw.address ? String(raw.address).trim() : undefined,
      instagram: raw.instagram ? String(raw.instagram).trim() : undefined,
      notes: raw.notes ? String(raw.notes).trim() : undefined,
      marketingWhatsapp: Boolean(raw.marketingWhatsapp),
      marketingEmail: Boolean(raw.marketingEmail),
      marketingSms: Boolean(raw.marketingSms),
    },
  };
}

const CUSTOMER_STATUSES: CustomerStatus[] = [
  "ACTIVE",
  "NEW",
  "INACTIVE",
  "AT_RISK",
  "ARCHIVED",
];

export function validateUpdateCustomer(body: unknown): ValidationResult<UpdateCustomerInput> {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _form: "Corps de requête invalide." } };
  }

  const raw = body as Record<string, unknown>;
  const data: UpdateCustomerInput = {};

  if (raw.firstName !== undefined) {
    const v = String(raw.firstName).trim();
    if (!v) errors.firstName = "Le prénom est obligatoire.";
    else data.firstName = v;
  }
  if (raw.lastName !== undefined) {
    const v = String(raw.lastName).trim();
    if (!v) errors.lastName = "Le nom est obligatoire.";
    else data.lastName = v;
  }
  if (raw.phone !== undefined) {
    const v = limitPhoneDigits(String(raw.phone));
    if (v.length < 8 || v.length > PHONE_MAX_DIGITS) {
      errors.phone = "Le téléphone doit contenir 8 à 10 chiffres.";
    } else data.phone = v;
  }
  if (raw.email !== undefined) {
    const v = String(raw.email).trim();
    if (v && !isValidEmail(v)) errors.email = "E-mail invalide.";
    else data.email = v || undefined;
  }
  if (raw.birthDate !== undefined) data.birthDate = parseOptionalDate(raw.birthDate);
  if (raw.address !== undefined) data.address = String(raw.address).trim() || undefined;
  if (raw.instagram !== undefined) data.instagram = String(raw.instagram).trim() || undefined;
  if (raw.notes !== undefined) data.notes = String(raw.notes).trim() || undefined;
  if (raw.marketingWhatsapp !== undefined) data.marketingWhatsapp = Boolean(raw.marketingWhatsapp);
  if (raw.marketingEmail !== undefined) data.marketingEmail = Boolean(raw.marketingEmail);
  if (raw.marketingSms !== undefined) data.marketingSms = Boolean(raw.marketingSms);
  if (raw.status !== undefined) {
    const s = String(raw.status) as CustomerStatus;
    if (!CUSTOMER_STATUSES.includes(s)) errors.status = "Statut invalide.";
    else data.status = s;
  }
  if (raw.archived !== undefined) data.archived = Boolean(raw.archived);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}

export function parseCustomerSegment(value: string | null): CustomerSegment {
  const allowed: CustomerSegment[] = ["ALL", "ACTIVE", "VIP", "NEW", "INACTIVE", "AT_RISK"];
  if (value && allowed.includes(value as CustomerSegment)) {
    return value as CustomerSegment;
  }
  return "ALL";
}

export function parseListQuery(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const search = (searchParams.get("search") ?? "").trim();
  const status = searchParams.get("status") as CustomerStatus | null;
  const segment = parseCustomerSegment(searchParams.get("segment"));
  return { page, limit, search, status, segment };
}
