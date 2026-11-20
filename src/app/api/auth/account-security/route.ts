import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { requireAppSession } from "@/lib/auth/api-guard";
import { jsonNoStore } from "@/lib/auth/google-http";
import { getAccountSecurity } from "@/lib/db/account-security";

/**
 * GET /api/auth/account-security/ : {email, emailVerified, hasPassword, googleLinked, emailSetupRequired} du compte
 * connecté. `emailSetupRequired` est vrai quand l'e-mail est absent ou non vérifié (l'interface propose alors
 * « Sécuriser mon compte »). Aucune donnée d'un autre compte ; aucun secret (jamais le haché du mot de passe).
 */
export const GET = tenantRoute(async function GET(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const security = await getAccountSecurity(auth.session.id, auth.session.organizationId);
  if (!security) return jsonNoStore({ error: "Session expirée." }, 401);
  return jsonNoStore(security);
});

export const dynamic = "force-dynamic";
