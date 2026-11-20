import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { checkJsonSameOrigin, jsonNoStore } from "@/lib/auth/google-http";
import { badRequest, readJsonObject, stringField, tooManyRequests } from "@/lib/auth/auth-route-utils";
import { verifyEmailChange } from "@/lib/db/account-security";

/**
 * POST /api/auth/email/verify-change/ (JSON {token}) : confirme l'adresse e-mail d'un compte (ajout, changement ou
 * vérification de l'adresse actuelle). Public (aucun cookie requis) : le lien doit marcher depuis un autre appareil.
 * Une transaction verrouille l'adresse, le compte puis le jeton, REVÉRIFIE l'unicité globale, pose User.email et
 * emailVerifiedAt et écrit l'audit. sessionVersion n'est PAS touchée : personne n'est déconnecté. Ensuite, le
 * « mot de passe oublié » par e-mail fonctionne pour ce compte. Jeton inconnu, expiré, déjà utilisé ou adresse reprise
 * entre-temps : 400 TOKEN_INVALID, sans distinction. Réponse : {ok, verified: true, email}.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;

  const body = await readJsonObject(request, 2 * 1024);
  const token = body ? stringField(body, "token").trim() : "";
  if (!token || token.length > 256) return badRequest("Ce lien n'est plus valable. Demandez-en un nouveau.", "TOKEN_INVALID");

  const limited = await consumeDimensions([
    { key: `auth:verify-change:ip:${clientIp(request)}`, ...RATE_POLICIES.accountSecurity.verifyIp, sensitivity: "sensitive" },
    { key: `auth:verify-change:token:${identityHash(token)}`, ...RATE_POLICIES.accountSecurity.verifyToken, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

  try {
    const result = await verifyEmailChange(token);
    if (result.kind !== "verified") return badRequest("Ce lien n'est plus valable. Demandez-en un nouveau.", "TOKEN_INVALID");
    return jsonNoStore({ ok: true, verified: true, email: result.email });
  } catch (error) {
    logger.error("email change verify failed", { route: "/api/auth/email/verify-change", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible de confirmer l'adresse. Réessayez." }, 500);
  }
});

export const dynamic = "force-dynamic";
