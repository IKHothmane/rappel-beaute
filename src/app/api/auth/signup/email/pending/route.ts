import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";
import { jsonNoStore, pendingCookieName } from "@/lib/auth/google-http";
import { tooManyRequests } from "@/lib/auth/auth-route-utils";
import { getOpenEmailPending } from "@/lib/db/email-signup";

/**
 * GET /api/auth/signup/email/pending/ : {name, email} de l'inscription e-mail VÉRIFIÉE en attente (cookie), pour
 * préremplir le formulaire d'institut. 404 générique dans tous les autres cas (cookie absent, expiré, consommé,
 * adresse non encore vérifiée).
 */
export const GET = publicRoute(async function GET(request: NextRequest) {
  const limited = await consumeDimensions([
    { key: `auth:signup-email:pending:ip:${clientIp(request)}`, ...RATE_POLICIES.emailSignup.pendingIp, sensitivity: "standard" },
  ]);
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

  const token = request.cookies.get(pendingCookieName())?.value;
  const pending = token ? await getOpenEmailPending(token) : null;
  if (!pending) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return jsonNoStore({ name: pending.name, email: pending.email });
});

export const dynamic = "force-dynamic";
