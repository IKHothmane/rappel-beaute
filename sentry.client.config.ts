import { isMarketingHost, loadSentry } from "./src/lib/monitoring/sentry-client";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && typeof window !== "undefined") {
  if (isMarketingHost(window.location.hostname)) {
    const report = (error: unknown) => {
      if (error == null) return;
      void loadSentry().then((Sentry) => Sentry?.captureException(error));
    };
    window.addEventListener("error", (event) => {
      report(event.error ?? event.message);
    });
    window.addEventListener("unhandledrejection", (event) => {
      report(event.reason);
    });
  } else {
    void loadSentry();
  }
}
