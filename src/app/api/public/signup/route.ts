import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL, signupLeadEmail } from "@/lib/email/signup-lead";
import {
  PublicSignupError,
  createPublicSignup,
} from "@/lib/db/public-signup";
import { storeSignupLogo } from "@/lib/auth/signup-form";
import { validateLogoUpload, type LogoValidation } from "@/lib/storage/image-upload";
import { CITIES } from "@/lib/site";
import { localPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";
import { publicRoute } from "@/lib/http/route-scope";
import { phoneLoginEnabled } from "@/lib/auth/env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const CITIES_SET = new Set<string>(CITIES);

function normalizeWebsite(raw: string): string | null | NextResponse {
  if (!raw) return null;
  if (raw.length > L.website) {
    return validationError(`Le site web ne doit pas dépasser ${L.website} caractères.`);
  }
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return validationError("Site web invalide.");
    }
    if (url.hostname.length < 3 || !url.hostname.includes(".")) {
      return validationError("Site web invalide.");
    }
    const normalized = url.toString();
    if (normalized.length > L.website) {
      return validationError(`Le site web ne doit pas dépasser ${L.website} caractères.`);
    }
    return normalized;
  } catch {
    return validationError("Site web invalide.");
  }
}

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * POST /api/public/signup : inscription HISTORIQUE par téléphone (WhatsApp) + mot de passe provisoire.
 *
 * Remplacée par l'inscription e-mail vérifiée (/api/auth/signup/email/) et par Google. Dès que
 * AUTH_PHONE_LOGIN_ENABLED est faux, cette route répond 410 sans rien lire ni créer. Tant que la variable n'est
 * pas fausse (défaut : vrai), le comportement historique est CONSERVÉ, y compris le renvoi unique du mot de passe
 * provisoire (`credentials`) : sans adresse e-mail vérifiée, c'est le seul moyen de remettre l'accès à la
 * personne qui s'inscrit. Cette exception disparaît avec le drapeau ; aucune route d'inscription par e-mail ou
 * Google ne renvoie jamais de mot de passe.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  if (!phoneLoginEnabled()) {
    return NextResponse.json(
      { error: "Inscription par téléphone désactivée, utilisez e-mail ou Google", code: "PHONE_SIGNUP_DISABLED" },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }
  const ip = clientIp(request);


  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return validationError("Formulaire invalide.");
  }

  const email = str(form, "email").toLowerCase();
  const signupPhone = localPhoneDigits(str(form, "phone"));
  const account = signupPhone ? emailKey(signupPhone) : "unknown";
  const rl = await consumeDimensions([
    { key: `auth:signup:ip:${ip}`, ...RATE_POLICIES.signup.ip, sensitivity: "sensitive" },
    { key: `auth:signup:account:${account}`, ...RATE_POLICIES.signup.account, sensitivity: "sensitive" },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 3600) } },
    );
  }

  const personName = str(form, "name");
  const institut = str(form, "institut");
  const phone = str(form, "phone");
  const city = str(form, "ville");
  const address = str(form, "localisation");
  const message = str(form, "message");
  const noWebsite = form.get("no_website") === "1";
  const website = noWebsite ? null : normalizeWebsite(str(form, "website"));
  if (website instanceof NextResponse) return website;

  if (personName.length < 2 || personName.length > L.name) {
    return validationError(`Indiquez votre prénom et nom (2 à ${L.name} caractères).`);
  }
  if (institut.length < 2 || institut.length > L.institut) {
    return validationError(`Indiquez le nom de l'institut (2 à ${L.institut} caractères).`);
  }
  if (email && (!EMAIL_RE.test(email) || email.length > L.email)) {
    return validationError("Adresse e-mail invalide.");
  }
  const phoneDigits = localPhoneDigits(phone);
  if (phoneDigits.length < 8 || phoneDigits.length > PHONE_MAX_DIGITS) {
    return validationError("Le numéro WhatsApp doit comporter entre 8 et 10 chiffres.");
  }
  if (!CITIES_SET.has(city) || city.length > L.city) {
    return validationError("Sélectionnez une ville.");
  }
  if (address.length > L.address) {
    return validationError(`L'adresse ne doit pas dépasser ${L.address} caractères.`);
  }
  if (message.length > L.message) {
    return validationError(`Les précisions ne doivent pas dépasser ${L.message} caractères.`);
  }

  const logo = form.get("logo");
  const logoFile = logo instanceof File && logo.size > 0 ? logo : null;
  let logoData: Buffer | null = null;
  let logoChecked: Extract<LogoValidation, { ok: true }> | null = null;
  if (logoFile) {
    if (logoFile.size > LOGO_MAX_BYTES) {
      return validationError("Le logo ne doit pas dépasser 2 Mo.");
    }
    logoData = Buffer.from(await logoFile.arrayBuffer());
    // Type MIME en liste blanche + octets magiques ; extension dérivée du MIME validé.
    const checked = validateLogoUpload(logoFile.type, logoData, { maxBytes: LOGO_MAX_BYTES });
    if (!checked.ok) {
      return validationError(
        checked.error.startsWith("Formats acceptés")
          ? "Formats de logo acceptés : PNG, JPG, WEBP ou SVG."
          : checked.error,
      );
    }
    logoChecked = checked;
  }

  try {
    const created = await createPublicSignup({
      personName,
      institut,
      email,
      phone: phoneDigits,
      city,
      address,
      website,
    });

    if (isEmailConfigured()) try {
      const lead = signupLeadEmail({
        personName,
        institut: created.institut,
        email: created.email ?? "",
        phone: phoneDigits,
        city,
        address,
        website,
        noWebsite,
        message,
        logoName: logoFile?.name || null,
      });
      const notified = await sendTransactionalEmail({
        to: PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
        replyTo: created.email || undefined,
        subject: lead.subject,
        html: lead.html,
        text: lead.text,
      });
      logger.info("public signup lead email sent", {
        route: "/api/public/signup",
        organizationId: created.organizationId,
        to: PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
        messageId: notified.messageId,
      });
    } catch (error) {
      logger.error("public signup lead email failed", {
        route: "/api/public/signup",
        organizationId: created.organizationId,
        to: PROFESSIONAL_SIGNUP_NOTIFY_EMAIL,
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    if (logoFile && logoData && logoChecked) {
      // Même stockage (catégorie "logos") et même tolérance qu'avant ; l'enregistrement de l'URL passe par la
      // portée de l'institut créé (voir storeSignupLogo : rappel_public ne peut pas modifier Organization).
      await storeSignupLogo(created.organizationId, { data: logoData, checked: logoChecked, name: logoFile.name }, "/api/public/signup");
    }

    return NextResponse.json({ ok: true, credentials: { identifier: created.phone, temporaryPassword: created.temporaryPassword } }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
  } catch (error) {
    if (error instanceof PublicSignupError) {
      const status = (error.code === "EMAIL_TAKEN" || error.code === "PHONE_TAKEN") ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    logger.error("public signup failed", {
      route: "/api/public/signup",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Impossible de créer le compte. Réessayez." },
      { status: 500 },
    );
  }
});
