import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { requireAppSession } from "@/lib/auth/api-guard";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";
import { checkJsonSameOrigin, googleAuthUnavailable, jsonNoStore } from "@/lib/auth/google-http";
import { unlinkGoogleIdentity } from "@/lib/db/auth-identities";

/**
 * POST /api/auth/google/unlink/ : délie Google du compte connecté. Refusé si le compte n'a ni mot de passe
 * ni e-mail vérifié (il n'aurait plus aucun moyen de se reconnecter).
 */
export const POST = tenantRoute(async function POST(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;

  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const limited = await consumeDimensions([
    { key: `auth:google:unlink:user:${session.id}`, ...RATE_POLICIES.googleAuth.unlink.user, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) {
    return jsonNoStore({ error: "Trop de tentatives. Réessayez plus tard." }, 429, {
      "Retry-After": String(limited.retryAfterSec ?? 900),
    });
  }

  const result = await unlinkGoogleIdentity({ userId: session.id, organizationId: session.organizationId });
  switch (result) {
    case "unlinked":
      return jsonNoStore({ ok: true });
    case "not_linked":
      return jsonNoStore({ error: "Aucun compte Google lié.", code: "NOT_LINKED" }, 404);
    case "last_login_method":
      return jsonNoStore(
        { error: "Ajoutez un mot de passe ou vérifiez votre e-mail avant de délier Google.", code: "LAST_LOGIN_METHOD" },
        409,
      );
    default:
      return jsonNoStore({ error: "Session expirée." }, 401);
  }
});
