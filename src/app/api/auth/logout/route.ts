import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie, getSessionFromRequest, sessionAbsoluteExpiry } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { checkAuthPostOrigin } from "@/lib/http/json-same-origin";
import { writeAuditLog } from "@/lib/db/audit";
import { COOKIE_HOST } from "@/lib/domain";
import { publicRoute } from "@/lib/http/route-scope";

export const POST = publicRoute(async function POST(request: NextRequest) {
  // Corps non requis (le bouton « se déconnecter » n'en envoie pas) : contrôle d'origine uniquement.
  const csrf = checkAuthPostOrigin(request, { requireJson: false });
  if (csrf) return csrf;

  const session = getSessionFromRequest(request);
  const res = NextResponse.json({ ok: true });
  // Purge le cache navigateur (308 stockés) pour casser ERR_TOO_MANY_REDIRECTS.
  res.headers.set("Clear-Site-Data", '"cache"');
  res.cookies.set(clearSessionCookie());
  // Évite un ?__host=app résiduel qui rejoue l’espace app après déconnexion.
  res.cookies.set({
    name: COOKIE_HOST,
    value: "",
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });

  // Déconnexion réelle : le jti est inscrit comme révoqué, le jeton copié ailleurs cesse de fonctionner. Le cookie
  // est effacé quoi qu'il arrive. Un ancien jeton sans jti ne peut pas être révoqué (il expire naturellement).
  if (session?.jti) {
    try {
      const { revokeSession } = await import("@/lib/db/session-revocation");
      await revokeSession({
        jti: session.jti,
        userId: session.id,
        organizationId: session.scope === "app" ? session.organizationId : null,
        scope: session.scope,
        expiresAt: sessionAbsoluteExpiry(session),
      });
    } catch (error) {
      logger.warn("session revocation failed", { error: error instanceof Error ? error.name : "unknown" });
    }
  }

  if (session?.scope === "app" && session.organizationId) {
    await writeAuditLog({
      organizationId: session.organizationId,
      actorId: session.id,
      actorName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "User",
      entityId: session.id,
      action: "LOGOUT",
    }).catch(() => undefined);
  }

  return res;
});
