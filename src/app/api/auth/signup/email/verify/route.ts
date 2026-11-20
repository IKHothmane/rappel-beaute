import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { checkJsonSameOrigin, jsonNoStore, pendingCookieName, setPendingCookie } from "@/lib/auth/google-http";
import { EMAIL_SIGNUP_LANDING, authHostMismatch, wrongHostResponse } from "@/lib/auth/auth-hosts";
import { badRequest, readJsonObject, stringField, tooManyRequests } from "@/lib/auth/auth-route-utils";
import { getOpenEmailPending, verifyEmailSignup } from "@/lib/db/email-signup";

/**
 * POST /api/auth/signup/email/verify/ (JSON {token}) : consomme le jeton du lien (usage unique, transaction avec
 * FOR UPDATE), marque l'e-mail vérifié et pose le cookie `__Host-rb_pending` (même mécanisme que Google). Réponse :
 * {ok, verified: true, email, name, redirect}. L'institut est créé plus tard par POST /api/auth/signup/email/complete/.
 *
 * Le cookie est propre à l'hôte qui répond : la requête doit arriver sur l'hôte canonique (voir auth-hosts.ts),
 * sinon 409 WRONG_HOST avec l'hôte à ouvrir. Un second appel (double clic) avec le cookie déjà posé renvoie le même
 * état « vérifié » sans rien consommer ; sans cookie, un jeton déjà utilisé, expiré ou inconnu donne 400 TOKEN_INVALID
 * (aucune distinction). La page du lien ne doit appeler cette route qu'en POST : un GET de prévisualisation (antivirus,
 * client de messagerie) ne consomme rien.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const wrongHost = authHostMismatch(request);
  if (wrongHost) return wrongHostResponse(wrongHost, "La confirmation de l'e-mail");

  const body = await readJsonObject(request, 2 * 1024);
  const token = body ? stringField(body, "token").trim() : "";
  if (!token || token.length > 256) return badRequest("Ce lien n'est plus valable. Demandez-en un nouveau.", "TOKEN_INVALID");

  const limited = await consumeDimensions([
    { key: `auth:signup-email-verify:ip:${clientIp(request)}`, ...RATE_POLICIES.emailSignup.verifyIp, sensitivity: "sensitive" },
    { key: `auth:signup-email-verify:token:${identityHash(token)}`, ...RATE_POLICIES.emailSignup.verifyToken, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

  try {
    const result = await verifyEmailSignup(token);
    if (result.kind === "verified") {
      const res = jsonNoStore({ ok: true, verified: true, email: result.email, name: result.name, redirect: EMAIL_SIGNUP_LANDING });
      setPendingCookie(res, result.cookieToken);
      return res;
    }
    // Double clic : le cookie du premier appel est déjà posé et l'inscription est toujours ouverte.
    const cookie = request.cookies.get(pendingCookieName())?.value;
    const open = cookie ? await getOpenEmailPending(cookie) : null;
    if (open) return jsonNoStore({ ok: true, verified: true, email: open.email, name: open.name, redirect: EMAIL_SIGNUP_LANDING });
    return badRequest("Ce lien n'est plus valable. Demandez-en un nouveau.", "TOKEN_INVALID");
  } catch (error) {
    logger.error("email signup verify failed", { route: "/api/auth/signup/email/verify", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible de confirmer l'adresse. Réessayez." }, 500);
  }
});

export const dynamic = "force-dynamic";
