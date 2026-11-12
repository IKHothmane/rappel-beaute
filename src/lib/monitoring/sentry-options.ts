/**
 * Options Sentry communes (serveur, edge, navigateur). Sans DSN, `Sentry.init` n'est jamais appelé
 * et rien ne quitte l'application.
 *
 * Confidentialité : on n'envoie ni corps de requête, ni cookies, ni en-têtes d'authentification,
 * ni chaîne de requête (jetons de réinitialisation), ni identité de l'utilisatrice, et on masque
 * téléphones et e-mails dans les données jointes aux erreurs.
 */

const SENSITIVE_EXTRA = /phone|tel|email|mail|password|token|secret|authorization|cookie|iban|card/i;

type ScrubbableEvent = {
  request?: { url?: string; data?: unknown; cookies?: unknown; headers?: Record<string, string>; query_string?: unknown };
  user?: unknown;
  extra?: Record<string, unknown>;
};

export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
    if (event.request.headers) {
      const { "user-agent": ua, referer } = event.request.headers;
      event.request.headers = { ...(ua ? { "user-agent": ua } : {}), ...(referer ? { referer: referer.split("?")[0] } : {}) };
    }
  }
  delete event.user;
  if (event.extra) {
    for (const k of Object.keys(event.extra)) {
      if (SENSITIVE_EXTRA.test(k)) event.extra[k] = "[masqué]";
    }
  }
  return event;
}


export const baseSentryOptions = {
  environment: process.env.APP_ENV || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
  // Erreurs uniquement : pas de traces de performance (coût et volume).
  tracesSampleRate: 0,
  sendDefaultPii: false,
  ignoreErrors: [
    /NEXT_REDIRECT/,
    /NEXT_NOT_FOUND/,
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
  ],
};
