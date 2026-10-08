"use client";

import { useState } from "react";

function isGoogleWalletSaveUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "pay.google.com" || url.hostname === "wallet.google.com")
    );
  } catch {
    return false;
  }
}

export function WalletInstall({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  async function open(kind: "apple" | "google") {
    setBusy(kind);
    setMessage(null);
    try {
      const res = await fetch(`/api/public/loyalty-pass/${token}/${kind}/`);
      const type = res.headers.get("content-type") ?? "";
      if (kind === "apple" && res.ok && type.includes("application/vnd.apple.pkpass")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "fidelite.pkpass";
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
      const data = (await res.json()) as { error?: string; url?: string };
      if (kind === "google" && res.ok && data.url && isGoogleWalletSaveUrl(data.url)) {
        window.location.assign(data.url);
        return;
      }
      setMessage(data.error || "Impossible d'ajouter la carte pour le moment.");
    } catch {
      setMessage("Réseau indisponible. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-ink/60">
        Ajoutez la carte à votre téléphone. Ensuite, ouvrez-la depuis Wallet, sans revenir sur ce site.
      </p>
      <button
        type="button"
        disabled={busy != null}
        onClick={() => void open("apple")}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-ink text-sm font-bold text-white disabled:opacity-60"
      >
        {busy === "apple" ? "Préparation…" : "Ajouter à Apple Wallet"}
      </button>
      <button
        type="button"
        disabled={busy != null}
        onClick={() => void open("google")}
        className="flex h-12 w-full items-center justify-center rounded-xl border border-ink bg-white text-sm font-bold text-ink disabled:opacity-60"
      >
        {busy === "google" ? "Préparation…" : "Ajouter à Google Wallet"}
      </button>
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
    </div>
  );
}
