import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { checkJsonSameOrigin, jsonNoStore } from "@/lib/auth/google-http";
import { scheduleEmailResend } from "@/lib/auth/email-auth-tasks";
import { GENERIC_EMAIL_SENT, badRequest, parseEmailInput, readJsonObject, stringField, tooManyRequests } from "@/lib/auth/auth-route-utils";

/**
 * POST /api/auth/signup/email/resend/ (JSON {email, hp}) : renvoie le lien de vérification. Même réponse générique
 * que l'inscription, que l'adresse ait une inscription ouverte, soit un compte, ou rien. Le nouveau jeton invalide
 * l'ancien ; délai de 60 s entre deux envois, six jetons au plus par inscription, et limites de débit strictes.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;

  const body = await readJsonObject(request);
  if (!body) return badRequest();
  if (stringField(body, "hp").trim()) return jsonNoStore(GENERIC_EMAIL_SENT);

  const email = parseEmailInput(body.email);
  if (!email) return badRequest("Adresse e-mail invalide.", "EMAIL_INVALID");

  const limited = await consumeDimensions([
    { key: `auth:signup-email-resend:ip:${clientIp(request)}`, ...RATE_POLICIES.emailSignup.resendIp, sensitivity: "sensitive" },
    { key: `auth:signup-email-resend:email:${emailKey(email)}`, ...RATE_POLICIES.emailSignup.resendEmail, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

  scheduleEmailResend({ email, requestOrigin: request.nextUrl.origin });
  return jsonNoStore(GENERIC_EMAIL_SENT);
});

export const dynamic = "force-dynamic";
