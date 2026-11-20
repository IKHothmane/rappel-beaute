import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";
import { googleAuthUnavailable, jsonNoStore, pendingCookieName } from "@/lib/auth/google-http";
import { getOpenGooglePending } from "@/lib/db/auth-identities";

/**
 * GET /api/auth/google/pending/ : {name, email} de l'inscription Google en attente (cookie), pour préremplir
 * le formulaire d'institut. 404 générique dans tous les autres cas (cookie absent, expiré, consommé).
 */
export const GET = publicRoute(async function GET(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;

  const limited = await consumeDimensions([
    { key: `auth:google:pending:ip:${clientIp(request)}`, ...RATE_POLICIES.googleAuth.pending.ip, sensitivity: "standard" },
  ]);
  if (!limited.allowed) {
    return jsonNoStore({ error: "Trop de tentatives. Réessayez plus tard." }, 429, {
      "Retry-After": String(limited.retryAfterSec ?? 900),
    });
  }

  const token = request.cookies.get(pendingCookieName())?.value;
  const pending = token ? await getOpenGooglePending(token) : null;
  if (!pending) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return jsonNoStore({ name: pending.name, email: pending.email });
});
