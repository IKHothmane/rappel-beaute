import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/db/audit";
import { COOKIE_HOST } from "@/lib/domain";
import { publicRoute } from "@/lib/http/route-scope";

export const POST = publicRoute(async function POST(request: NextRequest) {
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
