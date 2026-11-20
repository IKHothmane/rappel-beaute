import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publicAppOrigin, SITE } from "@/lib/site";
import { resolvePublicHostname } from "@/lib/domain";
import { FOLDED_AUTH_HOSTS } from "@/lib/auth/google-oidc";

/**
 * MATRICE HÔTE / COOKIE de l'authentification (production : rappelbeauty.com = « apex », app.rappelbeauty.com).
 *
 * Un cookie `__Host-*` n'a pas d'attribut Domain : il n'existe QUE sur l'hôte qui l'a posé. La session
 * (`rappel_session`) est elle aussi propre à un hôte. Les pages publiques d'inscription et de connexion
 * (/connexion/, /professionnel/) ne sont servies que sur l'apex (sur app.*, le middleware les réécrit sous
 * /domains/app/ où elles n'existent pas). Tout ce qui pose puis relit le cookie d'inscription doit donc avoir
 * lieu sur l'apex, d'où le « repli » app.* / www.* vers SITE.url (même règle que l'URI de retour Google).
 *
 * | Étape                                   | Hôte                  | Cookie posé / lu                           |
 * |-----------------------------------------|-----------------------|--------------------------------------------|
 * | Google start / callback                 | apex (canonique)      | __Host-rb_oauth posé puis lu               |
 * | Google : formulaire d'institut          | apex /professionnel/  | __Host-rb_pending lu (GET pending, POST)   |
 * | Inscription e-mail : POST signup/resend | apex                  | aucun                                      |
 * | Lien de vérification d'inscription      | apex /verify-email/   | POST verify pose __Host-rb_pending         |
 * | Formulaire d'institut (e-mail)          | apex /professionnel/  | __Host-rb_pending lu, puis effacé          |
 * | Finalisation (Google ou e-mail)         | apex                  | rappel_session + __rappel_host=app posés,  |
 * |                                         |                       | __Host-rb_pending effacé                   |
 * | Lien de changement d'e-mail (verify-    | app.* ou apex         | aucun cookie (marche depuis un autre       |
 * | change), lien de reset /activate/       | (publicAppOrigin)     | appareil ; la session n'est pas touchée)   |
 * | Liaison Google (link/start)             | apex (canonique)      | session lue ; __Host-rb_oauth posé         |
 *
 * Le cookie `__rappel_host` (valeur www|app|admin, sans Domain) n'oriente que le routage du middleware sur
 * localhost / Railway ; il est posé par applyAppSession à la connexion et par le middleware.
 * Un POST reçu sur le mauvais hôte (WRONG_HOST) n'est jamais traité : il renvoie l'hôte attendu.
 */

const stripSlash = (value: string) => value.replace(/\/$/, "");

/** Replie app.* et www.* vers l'apex (SITE.url), comme l'URI de retour Google. */
export function foldAuthOrigin(origin: string): string {
  try {
    const parsed = new URL(origin.startsWith("http") ? origin : `https://${origin}`);
    if (FOLDED_AUTH_HOSTS.has(parsed.hostname.toLowerCase())) return stripSlash(SITE.url);
    return stripSlash(parsed.origin);
  } catch {
    return stripSlash(origin);
  }
}

/**
 * Origine qui porte le cookie d'inscription en attente : celle du lien de vérification d'inscription et de
 * l'hôte attendu pour le formulaire d'institut. Indépendante de la configuration Google.
 */
export function canonicalAuthOrigin(requestOrigin: string): string {
  return foldAuthOrigin(publicAppOrigin() || requestOrigin);
}

/** Origine des liens qui n'ont besoin d'aucun cookie (changement d'e-mail) : celle de l'application. */
export function appLinkOrigin(requestOrigin: string): string {
  return stripSlash(publicAppOrigin() || requestOrigin);
}

const isLoopback = (host: string) => /^(localhost|127\.|\[?::1\]?$)/i.test(host.split(":")[0] ?? "") || host.startsWith("[::1]");

/** L'hôte courant, port compris, tel que le navigateur l'a utilisé. */
function currentHost(request: NextRequest): string {
  return (
    resolvePublicHostname(
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.headers.get("x-rappel-public-host"),
    ) || request.nextUrl.hostname
  ).toLowerCase();
}

/**
 * Renvoie l'origine canonique si la requête n'est pas servie par l'hôte qui porte les cookies d'inscription, sinon
 * null. Jamais de refus sur localhost / 127.0.0.1 (développement, tests) ni quand aucune origine canonique
 * exploitable n'existe.
 */
export function authHostMismatch(request: NextRequest): string | null {
  const host = currentHost(request);
  if (!host || isLoopback(host)) return null;
  const canonical = canonicalAuthOrigin(request.nextUrl.origin);
  try {
    const target = new URL(canonical);
    if (isLoopback(target.hostname)) return null;
    return target.hostname.toLowerCase() === host.split(":")[0] ? null : canonical;
  } catch {
    return null;
  }
}

/** 409 WRONG_HOST avec un message directement affichable et l'hôte à ouvrir. */
export function wrongHostResponse(canonicalOrigin: string, action = "Cette action"): NextResponse {
  let host = canonicalOrigin;
  try {
    host = new URL(canonicalOrigin).host;
  } catch {
    /* origine telle quelle */
  }
  return NextResponse.json(
    {
      error: `${action} doit être faite depuis ${host}. Ouvrez ${canonicalOrigin} dans votre navigateur puis réessayez.`,
      code: "WRONG_HOST",
      host,
      origin: canonicalOrigin,
    },
    { status: 409, headers: { "Cache-Control": "no-store" } },
  );
}

/** Page d'arrivée après la vérification de l'e-mail d'inscription (formulaire d'institut, même hôte). */
export const EMAIL_SIGNUP_LANDING = "/professionnel/?email=1";
