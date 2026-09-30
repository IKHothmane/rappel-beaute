import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { AUTH_RATE_LIMITS, authRateLimitKey, checkRateLimit } from "@/lib/rate-limit";
import { EmailSendError, isEmailConfigured, sendTransactionalEmail } from "@/lib/email/send";
import { signupPasswordEmail } from "@/lib/email/signup-password";
import {
  PublicSignupError,
  createPublicSignup,
  deletePublicSignupOrganization,
} from "@/lib/db/public-signup";
import { setOrganizationLogoUrl } from "@/lib/db/organization";
import { getStorageService } from "@/lib/storage";
import { CITIES, absoluteAppLoginUrl } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const CITIES_SET = new Set<string>(CITIES);

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  if (!isEmailConfigured()) {
    logger.warn("public signup blocked: email not configured", { route: "/api/public/signup" });
    return NextResponse.json(
      { error: "L'envoi d'e-mail n'est pas encore configuré. Réessayez plus tard." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return validationError("Formulaire invalide.");
  }

  const email = str(form, "email").toLowerCase();
  const rl = await checkRateLimit({
    key: authRateLimitKey("signup", ip, email),
    ...AUTH_RATE_LIMITS.signup,
  });
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

  if (personName.length < 2 || personName.length > 80) {
    return validationError("Indiquez votre prénom et nom.");
  }
  if (institut.length < 2 || institut.length > 80) {
    return validationError("Indiquez le nom de l'institut.");
  }
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return validationError("Adresse e-mail invalide.");
  }
  if (phone.replace(/\D/g, "").length < 8 || phone.length > 30) {
    return validationError("Numéro WhatsApp invalide.");
  }
  if (!CITIES_SET.has(city)) {
    return validationError("Sélectionnez une ville.");
  }
  if (address.length < 3 || address.length > 200) {
    return validationError("Indiquez l'adresse de l'institut.");
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
      phone,
      city,
      address,
    });

    const tempPassword = created.temporaryPassword;
    const loginUrl = absoluteAppLoginUrl({
      email: created.email,
      password: tempPassword,
    });
    const mail = signupPasswordEmail({
      firstName: created.firstName,
      institut: created.institut,
      email: created.email,
      password: tempPassword,
      loginUrl,
    });

    const passwordInText = mail.text.includes(tempPassword);
    const passwordInHtml = mail.html.includes(tempPassword);
    const maskedTemp =
      tempPassword.length >= 4
        ? `${tempPassword.slice(0, 2)}…${tempPassword.slice(-2)}`
        : "****";

    logger.info("public signup account ready", {
      route: "/api/public/signup",
      organizationId: created.organizationId,
      email: created.email,
      mustChangePassword: true,
      tempPasswordLength: tempPassword.length,
      tempPasswordMasked: maskedTemp,
      passwordInEmailText: passwordInText,
      passwordInEmailHtml: passwordInHtml,
      loginUrl,
    });

    if (!passwordInText || !passwordInHtml) {
      await deletePublicSignupOrganization(created.organizationId);
      logger.error("public signup email missing temporary password", {
        route: "/api/public/signup",
        organizationId: created.organizationId,
        passwordInEmailText: passwordInText,
        passwordInEmailHtml: passwordInHtml,
      });
      return NextResponse.json(
        { error: "Impossible de préparer l'e-mail de mot de passe. Réessayez." },
        { status: 500 },
      );
    }

    try {
      const sent = await sendTransactionalEmail({
        to: created.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });

      logger.info("public signup password email sent", {
        route: "/api/public/signup",
        organizationId: created.organizationId,
        email: created.email,
        messageId: sent.messageId,
        mustChangePassword: true,
        tempPasswordMasked: maskedTemp,
        note: "Connexion avec ce MDP temporaire → page changer-mot-de-passe",
      });
    } catch (error) {
      await deletePublicSignupOrganization(created.organizationId);
      throw error;
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PublicSignupError) {
      const status = error.code === "EMAIL_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof EmailSendError) {
      return NextResponse.json({ error: error.userMessage }, { status: 502 });
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
