import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/** En dessous, un secret est jugé mal configuré : aucun détail n'est servi. */
const MIN_SECRET_LENGTH = 16;

/** Les sondes ne sont jamais mises en cache (CDN, navigateur). */
export const HEALTH_HEADERS = { "Cache-Control": "no-store" } as const;

/**
 * Secret des détails de santé : HEALTH_TOKEN, ou à défaut CRON_SECRET.
 * Un HEALTH_TOKEN défini mais trop court ne retombe pas sur CRON_SECRET : la configuration est refusée.
 */
function expectedSecret(): string | null {
  const health = process.env.HEALTH_TOKEN?.trim();
  if (health) return health.length >= MIN_SECRET_LENGTH ? health : null;
  const cron = process.env.CRON_SECRET?.trim();
  return cron && cron.length >= MIN_SECRET_LENGTH ? cron : null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * `Authorization: Bearer <secret>` comparé à temps constant.
 * Les deux valeurs sont hachées avant comparaison : la longueur du secret ne fuit pas.
 */
export function healthTokenAuthorized(request: Pick<Request, "headers"> | undefined): boolean {
  const secret = expectedSecret();
  if (!secret || !request) return false;
  const header = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return false;
  return timingSafeEqual(digest(match[1]), digest(secret));
}

export function healthUnauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Non autorisé." },
    { status: 401, headers: { ...HEALTH_HEADERS, "WWW-Authenticate": 'Bearer realm="health"' } },
  );
}

/**
 * Regroupe les appels simultanés sur une seule exécution : une rafale de requêtes publiques
 * n'occupe jamais plus d'une connexion à la fois, sans servir de résultat périmé.
 */
export function singleFlight<T>(run: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = run().finally(() => {
        pending = null;
      });
    }
    return pending;
  };
}
