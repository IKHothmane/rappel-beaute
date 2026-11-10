import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions, scrubEvent } from "./src/lib/monitoring/sentry-options";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, ...baseSentryOptions, beforeSend: (event) => scrubEvent(event) });
}
