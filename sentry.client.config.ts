import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions, scrubEvent } from "./src/lib/monitoring/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    ...baseSentryOptions,
    // Pas de rejeu de session : il enregistrerait des données de clientes.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}
