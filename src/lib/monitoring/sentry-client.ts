import { baseSentryOptions, scrubEvent } from "./sentry-options";

let loading: Promise<typeof import("@sentry/nextjs") | null> | null = null;

/** Charge le SDK navigateur à la demande et l'initialise une seule fois. */
export function loadSentry(): Promise<typeof import("@sentry/nextjs") | null> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return Promise.resolve(null);
  if (!loading) {
    loading = import("@sentry/nextjs")
      .then((Sentry) => {
        if (!Sentry.getClient()) {
          Sentry.init({
            dsn,
            ...baseSentryOptions,
            // Pas de rejeu de session : il enregistrerait des données de clientes.
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: 0,
            beforeSend: (event) => scrubEvent(event),
          });
        }
        return Sentry;
      })
      .catch(() => null);
  }
  return loading;
}

/** Vitrine publique : le SDK ne part qu'à la première erreur, pas avec la page. */
export function isMarketingHost(hostname: string): boolean {
  return hostname === "rappelbeauty.com" || hostname === "www.rappelbeauty.com";
}
