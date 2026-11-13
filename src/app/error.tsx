"use client";

import { useEffect } from "react";
import { loadSentry } from "@/lib/monitoring/sentry-client";

/** Erreur dans une page : remontée à Sentry, et la cliente garde la mise en page du site. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void loadSentry().then((Sentry) => Sentry?.captureException(error));
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-2xl font-semibold text-ink">Un problème est survenu</h1>
        <p className="mt-3 text-sm text-ink/70">
          L&apos;erreur a été signalée à notre équipe. Vous pouvez réessayer, ou recharger la page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
