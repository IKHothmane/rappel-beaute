import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Contrôle CSRF des POST d'authentification (login, logout, mot de passe oublié, activation…).
 *
 * Variante tolérante de `checkJsonSameOrigin` (google-http.ts) : un navigateur envoie toujours `Origin` ou
 * `Sec-Fetch-Site` sur un POST inter-sites, alors qu'un client non navigateur (tests d'intégration, Playwright
 * `request`, cURL) n'en envoie aucun et ne peut pas être détourné par une page tierce. Règle :
 *  - `Sec-Fetch-Site` présent : il décide. `same-origin` passe (quelle que soit la valeur d'`Origin`, ce qui évite
 *    tout faux refus lié à la reconstruction du schéma ou de l'hôte derrière Cloudflare / Railway) ; toute autre
 *    valeur est refusée. Une page tierce ne peut pas forger cet en-tête (« forbidden header name »).
 *  - sinon `Origin` présent (navigateurs anciens) : doit désigner exactement l'origine de la requête ;
 *  - les deux absents : accepté (client non navigateur).
 */
const firstValue = (value: string | null) => (value ?? "").split(",")[0].trim().toLowerCase();

function forbidden() {
  return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
}

export function checkAuthPostOrigin(
  request: NextRequest | Request,
  options: { requireJson?: boolean } = {},
): NextResponse | null {
  const requireJson = options.requireJson !== false;
  if (requireJson && !/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 415 });
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" ? null : forbidden();

  const origin = request.headers.get("origin");
  if (!origin) return null;

  let originValue: string;
  try {
    originValue = new URL(origin).origin.toLowerCase();
  } catch {
    return forbidden();
  }

  const url = new URL(request.url);
  const forwardedProto = firstValue(request.headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : url.protocol.replace(/:$/, "");
  const hosts = new Set<string>(
    [
      firstValue(request.headers.get("x-rappel-public-host")),
      firstValue(request.headers.get("x-forwarded-host")),
      firstValue(request.headers.get("host")),
      url.host.toLowerCase(),
    ].filter(Boolean),
  );
  const allowed = new Set<string>([url.origin.toLowerCase()]);
  for (const host of hosts) allowed.add(`${proto}://${host}`);
  return allowed.has(originValue) ? null : forbidden();
}
