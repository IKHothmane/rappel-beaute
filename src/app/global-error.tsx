"use client";

import { useEffect } from "react";
import { loadSentry } from "@/lib/monitoring/sentry-client";

/** Dernier filet : erreur dans le layout racine. Remonte l'erreur à Sentry et propose de réessayer. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void loadSentry().then((Sentry) => Sentry?.captureException(error));
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#faf7f5", color: "#1f1a1a" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Un problème est survenu</h1>
            <p style={{ margin: "0 0 20px", lineHeight: 1.5 }}>
              L&apos;erreur a été signalée à notre équipe. Vous pouvez réessayer ou recharger la page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ background: "#B90058", color: "#fff", border: 0, borderRadius: 8, padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
