import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { scheduleResetRequest } from "@/lib/auth/password-reset-task";
import { getClientIp } from "@/lib/http/client-ip";
import { checkAuthPostOrigin } from "@/lib/http/json-same-origin";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { publicRoute } from "@/lib/http/route-scope";

const GENERIC = {
  message: "Si ce compte existe, un lien de réinitialisation a été envoyé.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Réponse et durée identiques que le compte existe, que l'adresse soit mal formée ou inconnue : seule une
 * limitation de débit (indépendante de l'existence du compte, clé = adresse saisie) change le statut. Le travail
 * réel (recherche, jeton, e-mail) part en tâche détachée.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const csrf = checkAuthPostOrigin(request);
  if (csrf) return csrf;

  const ip = getClientIp(request);
  let submitted = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    submitted = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const account = emailKey(submitted);
  const rl = await consumeDimensions([
    { key: `auth:forgot:ip:${ip}`, ...RATE_POLICIES.forgotPassword.ip, sensitivity: "sensitive" },
    {
      key: `auth:forgot:account:${account}`,
      ...RATE_POLICIES.forgotPassword.account,
      sensitivity: "sensitive",
    },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 3600) } },
    );
  }

  if (submitted && submitted.length <= 254 && EMAIL_RE.test(submitted)) {
    scheduleResetRequest(submitted, request.nextUrl.origin);
  }

  return NextResponse.json(GENERIC);
});
