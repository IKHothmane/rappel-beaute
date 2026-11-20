import { NextResponse } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { isGoogleAuthAvailable } from "@/lib/auth/google-oidc";
import { phoneLoginEnabled } from "@/lib/auth/env";

/**
 * GET /api/auth/config/ : {googleEnabled, phoneLoginEnabled}, pour que l'interface choisisse les parcours à
 * proposer (boutons Google, identifiant téléphone, inscription par téléphone). Public, sans secret ni identifiant ;
 * cache court (60 s) : un changement de variable d'environnement se voit après un redémarrage et ce délai.
 */
export const GET = publicRoute(async function GET() {
  return NextResponse.json(
    { googleEnabled: isGoogleAuthAvailable(), phoneLoginEnabled: phoneLoginEnabled() },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  );
});

export const dynamic = "force-dynamic";
