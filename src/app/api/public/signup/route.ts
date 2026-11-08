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
import { setOrganizationLogoUrl } from "@/lib/db/organization";
import { getStorageService } from "@/lib/storage";
import { CITIES } from "@/lib/site";
import { localPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
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

export async function POST(request: NextRequest) {
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
  if (logoFile) {
    if (!LOGO_TYPES.has(logoFile.type)) {
      return validationError("Formats de logo acceptés : PNG, JPG, WEBP ou SVG.");
    }
    if (logoFile.size > LOGO_MAX_BYTES) {
      return validationError("Le logo ne doit pas dépasser 2 Mo.");
    }
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

    if (logoFile) {
      try {
        const stored = await getStorageService().put({
          category: "logos",
          organizationId: created.organizationId,
          filename: logoFile.name || "logo.png",
          data: Buffer.from(await logoFile.arrayBuffer()),
          contentType: logoFile.type,
        });
        await setOrganizationLogoUrl(created.organizationId, stored.url);
      } catch (error) {
        logger.warn("public signup logo skipped", {
          route: "/api/public/signup",
          organizationId: created.organizationId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
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
}
