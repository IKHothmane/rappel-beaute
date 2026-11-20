import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { requireAppSession } from "@/lib/auth/api-guard";
import { googleAuthUnavailable, jsonNoStore } from "@/lib/auth/google-http";
import { getLinkContext } from "@/lib/db/auth-identities";

/**
 * GET /api/auth/google/status/ : état de la connexion Google du compte connecté, uniquement pour sa propre
 * session : {linked, hasPassword, email}. 404 vide si Google est désactivé (la page masque alors le bloc).
 */
export const GET = tenantRoute(async function GET(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;

  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const context = await getLinkContext(session.id, session.organizationId);
  if (!context) return jsonNoStore({ error: "Session expirée." }, 401);
  return jsonNoStore({
    linked: context.linked,
    hasPassword: Boolean(context.passwordHash),
    email: session.email || null,
  });
});

export const dynamic = "force-dynamic";
