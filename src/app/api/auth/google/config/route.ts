import { publicRoute } from "@/lib/http/route-scope";
import { isGoogleAuthAvailable } from "@/lib/auth/google-oidc";
import { jsonNoStore } from "@/lib/auth/google-http";

/**
 * GET /api/auth/google/config/ : {enabled} pour que l'interface masque les boutons Google quand la
 * connexion Google est désactivée ou non configurée. Ne renvoie jamais d'identifiant ni de secret.
 */
export const GET = publicRoute(async function GET() {
  return jsonNoStore({ enabled: isGoogleAuthAvailable() });
});

export const dynamic = "force-dynamic";
