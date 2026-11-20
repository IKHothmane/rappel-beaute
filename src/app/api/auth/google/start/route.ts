import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";
import {
  buildGoogleAuthorizationUrl,
  generatePkceMaterial,
  googleAuthCredentials,
} from "@/lib/auth/google-oidc";
import { canonicalAuthHostMismatch, googleAuthUnavailable, googleRedirectUriFor, sanitizeRedirectAfter, setOAuthCookie } from "@/lib/auth/google-http";
import { createOAuthState } from "@/lib/db/auth-oauth-state";

/**
 * GET /api/auth/google/start/?intent=login|signup[&next=/chemin]
 * Crée l'état (PKCE, state, nonce), pose le cookie lié au state et redirige vers Google.
 * (La liaison d'un compte connecté passe par POST /api/auth/google/link/start/.)
 */
export const GET = publicRoute(async function GET(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const limited = await consumeDimensions([
    { key: `auth:google:start:ip:${ip}`, ...RATE_POLICIES.googleAuth.start.ip, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 900), "Cache-Control": "no-store" } },
    );
  }

  const params = request.nextUrl.searchParams;
  const intent = params.get("intent");
  if (intent !== "login" && intent !== "signup") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const credentials = googleAuthCredentials();
  const redirectUri = googleRedirectUriFor(request);
  if (!credentials || !redirectUri) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  // Le cookie lié au state est propre à un hôte : le départ doit avoir lieu sur l'hôte de l'URI de retour.
  const target = canonicalAuthHostMismatch(request, redirectUri);
  if (target) {
    if (params.get("canon") === "1") {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const canonical = new URL("/api/auth/google/start/", target.origin);
    for (const [key, value] of params) canonical.searchParams.set(key, value);
    canonical.searchParams.set("canon", "1");
    return NextResponse.redirect(canonical, 307);
  }

  const material = generatePkceMaterial();
  try {
    await createOAuthState({
      material,
      intent,
      redirectAfter: sanitizeRedirectAfter(params.get("next")),
    });
  } catch (error) {
    logger.error("google start: state creation failed", { route: "/api/auth/google/start", error: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "Service indisponible." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const res = NextResponse.redirect(
    buildGoogleAuthorizationUrl({
      clientId: credentials.clientId,
      redirectUri,
      state: material.state,
      nonce: material.nonce,
      codeChallenge: material.codeChallenge,
    }),
    302,
  );
  res.headers.set("Cache-Control", "no-store");
  setOAuthCookie(res, material.state);
  return res;
});
