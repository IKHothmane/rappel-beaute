import type { NextRequest } from "next/server";
import { CITIES } from "@/lib/site";
import { logger } from "@/lib/logger";
import { readBodyBytesCapped } from "@/lib/auth/auth-route-utils";
import { runInScope } from "@/lib/db/tenant-context";
import { localPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";
import type { LogoValidation } from "@/lib/storage/image-upload";

/**
 * Lecture et validation communes des formulaires de finalisation d'institut (Google et e-mail) : JSON ou
 * multipart/form-data (avec logo). Les règles sont celles de /api/public/signup ; le logo est validé AVANT la
 * transaction (type MIME en liste blanche + octets magiques, 2 Mo) mais stocké APRÈS elle, et son échec est toléré.
 */

export const SIGNUP_BODY_MAX_BYTES = 16 * 1024;
export const SIGNUP_LOGO_MAX_BYTES = 2 * 1024 * 1024;
/** Plafond de Content-Length d'un envoi multipart : logo + champs + enveloppe. */
const MULTIPART_MAX_BYTES = SIGNUP_LOGO_MAX_BYTES + 64 * 1024;
const CITIES_SET = new Set<string>(CITIES);

export type PreparedLogo = { data: Buffer; checked: Extract<LogoValidation, { ok: true }>; name: string };

export type SignupRequest =
  | { ok: true; fields: Record<string, unknown>; logoFile: File | null }
  | { ok: false; status: number; error: string };

const invalid = (error = "Requête invalide.", status = 400): { ok: false; status: number; error: string } => ({ ok: false, status, error });

/** Lit le corps JSON (16 Ko) ou multipart (2 Mo + champs). Le type de contenu a déjà passé le contrôle d'origine. */
export async function readSignupRequest(request: NextRequest): Promise<SignupRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (/^multipart\/form-data\b/i.test(contentType)) {
    // Content-Length obligatoire et valide : sans lui (Transfer-Encoding: chunked), le plafond ne serait pas
    // vérifiable avant lecture. Les octets sont de toute façon plafonnés pendant la lecture.
    const declared = request.headers.get("content-length")?.trim() ?? "";
    if (!/^\d+$/.test(declared)) return invalid("Longueur du formulaire requise.", 411);
    if (Number(declared) > MULTIPART_MAX_BYTES) return invalid("Le logo ne doit pas dépasser 2 Mo.", 413);
    const bytes = await readBodyBytesCapped(request, MULTIPART_MAX_BYTES);
    if (!bytes) return invalid("Le logo ne doit pas dépasser 2 Mo.", 413);
    let form: FormData;
    try {
      form = await new Response(bytes as BodyInit, { headers: { "content-type": contentType } }).formData();
    } catch {
      return invalid("Formulaire invalide.");
    }
    const fields: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) if (typeof value === "string") fields[key] = value;
    const logo = form.get("logo");
    return { ok: true, fields, logoFile: logo instanceof File && logo.size > 0 ? logo : null };
  }
  try {
    const bytes = await readBodyBytesCapped(request, SIGNUP_BODY_MAX_BYTES);
    if (!bytes) return invalid();
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return invalid();
    return { ok: true, fields: parsed as Record<string, unknown>, logoFile: null };
  } catch {
    return invalid();
  }
}

export const field = (fields: Record<string, unknown>, key: string): string => {
  const value = fields[key];
  return typeof value === "string" ? value.trim() : "";
};

/** undefined = invalide, null = aucun site, string = URL normalisée. */
function normalizeWebsite(raw: string): string | null | undefined {
  if (!raw) return null;
  if (raw.length > L.website) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (url.hostname.length < 3 || !url.hostname.includes(".")) return undefined;
    const normalized = url.toString();
    return normalized.length > L.website ? undefined : normalized;
  } catch {
    return undefined;
  }
}

export type InstituteFields = {
  personName: string;
  institut: string;
  phoneDigits: string;
  city: string;
  address: string;
  message: string;
  website: string | null;
};

/** Validation des champs de l'institut (mêmes messages que /api/public/signup). */
export function validateInstituteFields(fields: Record<string, unknown>): { ok: true; value: InstituteFields } | { ok: false; error: string } {
  const personName = field(fields, "name");
  const institut = field(fields, "institut");
  const city = field(fields, "ville");
  const address = field(fields, "localisation");
  const message = field(fields, "message");
  const noWebsite = fields.no_website === true || fields.no_website === "1" || fields.no_website === "true";
  const website = noWebsite ? null : normalizeWebsite(field(fields, "website"));

  if (personName && (personName.length < 2 || personName.length > L.name)) {
    return { ok: false, error: `Indiquez votre prénom et nom (2 à ${L.name} caractères).` };
  }
  if (institut.length < 2 || institut.length > L.institut) {
    return { ok: false, error: `Indiquez le nom de l'institut (2 à ${L.institut} caractères).` };
  }
  const phoneDigits = localPhoneDigits(field(fields, "phone"));
  if (phoneDigits.length < 8 || phoneDigits.length > PHONE_MAX_DIGITS) {
    return { ok: false, error: "Le numéro de téléphone doit comporter entre 8 et 10 chiffres." };
  }
  if (!CITIES_SET.has(city) || city.length > L.city) return { ok: false, error: "Sélectionnez une ville." };
  if (address.length > L.address) return { ok: false, error: `L'adresse ne doit pas dépasser ${L.address} caractères.` };
  if (message.length > L.message) return { ok: false, error: `Les précisions ne doivent pas dépasser ${L.message} caractères.` };
  if (website === undefined) return { ok: false, error: "Site web invalide." };
  return { ok: true, value: { personName, institut, phoneDigits, city, address, message, website } };
}

/** Validation du logo (avant toute écriture) : mêmes règles et mêmes messages que /api/public/signup. */
export async function prepareLogo(file: File | null): Promise<{ ok: true; logo: PreparedLogo | null } | { ok: false; error: string }> {
  if (!file) return { ok: true, logo: null };
  if (file.size > SIGNUP_LOGO_MAX_BYTES) return { ok: false, error: "Le logo ne doit pas dépasser 2 Mo." };
  const { validateLogoUpload } = await import("@/lib/storage/image-upload");
  const data = Buffer.from(await file.arrayBuffer());
  const checked = validateLogoUpload(file.type, data, { maxBytes: SIGNUP_LOGO_MAX_BYTES });
  if (!checked.ok) {
    return {
      ok: false,
      error: checked.error.startsWith("Formats acceptés") ? "Formats de logo acceptés : PNG, JPG, WEBP ou SVG." : checked.error,
    };
  }
  return { ok: true, logo: { data, checked, name: file.name } };
}

/**
 * Stockage du logo APRÈS la transaction de création (jamais pour un rejeu), par le service de stockage configuré
 * (category "logos" : aucun chemin de stockage modifié). Un échec est journalisé et toléré : l'inscription est faite.
 */
export async function storeSignupLogo(organizationId: string, logo: PreparedLogo | null, route: string): Promise<void> {
  if (!logo) return;
  try {
    const [{ getStorageService }, { setOrganizationLogoUrl }] = await Promise.all([import("@/lib/storage"), import("@/lib/db/organization")]);
    // Portée TENANT liée à l'institut que cette requête vient de créer : rappel_public n'a pas le droit de modifier
    // Organization (UPDATE révoqué), rappel_app le peut pour son propre institut (RLS). Sans cela, l'enregistrement
    // de l'URL du logo échouait silencieusement sous les rôles séparés.
    await runInScope({ kind: "tenant", organizationId }, async () => {
      const stored = await getStorageService().put({
        category: "logos",
        organizationId,
        filename: logo.checked.filename,
        data: logo.data,
        contentType: logo.checked.contentType,
      });
      await setOrganizationLogoUrl(organizationId, stored.url);
    });
  } catch (error) {
    logger.warn("signup logo skipped", { route, organizationId, error: error instanceof Error ? error.name : "unknown" });
  }
}

/** E-mail de lead interne existant ; son échec n'annule jamais l'inscription déjà validée. */
export async function notifySignupLead(input: {
  route: string;
  organizationId: string;
  personName: string;
  institut: string;
  email: string;
  fields: InstituteFields;
  logoName: string | null;
}): Promise<void> {
  const [{ isEmailConfigured, sendTransactionalEmail }, { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL, signupLeadEmail }] = await Promise.all([
    import("@/lib/email/send"),
    import("@/lib/email/signup-lead"),
  ]);
  if (!isEmailConfigured()) return;
  try {
    const lead = signupLeadEmail({
      personName: input.personName,
      institut: input.institut,
      email: input.email,
      phone: input.fields.phoneDigits,
      city: input.fields.city,
      address: input.fields.address,
      website: input.fields.website,
      noWebsite: input.fields.website === null,
      message: input.fields.message,
      logoName: input.logoName,
    });
    await sendTransactionalEmail({
      to: PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
      replyTo: input.email || undefined,
      subject: lead.subject,
      html: lead.html,
      text: lead.text,
    });
  } catch (error) {
    logger.error("signup lead email failed", { route: input.route, organizationId: input.organizationId, error: error instanceof Error ? error.name : "unknown" });
  }
}
