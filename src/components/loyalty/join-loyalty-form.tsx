"use client";

import { useState } from "react";
import { limitPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";

export function JoinLoyaltyForm({
  token,
  disabled,
  googleWallet,
}: {
  token: string;
  disabled: boolean;
  googleWallet: boolean;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/public/loyalty-join/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, firstName, lastName, phone, email }),
      });
      const data = (await res.json()) as { error?: string; cardPath?: string; googleWalletUrl?: string | null };
      if (!res.ok || !data.cardPath) {
        setError(data.error || "Impossible de créer la carte.");
        return;
      }
      if (data.googleWalletUrl) {
        window.location.assign(data.googleWalletUrl);
        return;
      }
      window.location.assign(data.cardPath);
    } catch {
      setError("Réseau indisponible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (disabled) {
    return (
      <p className="mt-8 rounded-2xl bg-white p-5 text-center text-sm text-ink/60">
        Le programme de fidélité est désactivé pour le moment.
      </p>
    );
  }

  const field =
    "h-12 w-full rounded-lg border border-line bg-white px-4 text-sm outline-none focus:border-primary";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-3xl bg-white p-6 shadow-md">
      <p className="text-sm font-semibold text-ink">
        {googleWallet ? "Ajouter ma carte à Google Wallet" : "Créer ma carte fidélité"}
      </p>
      <p className="text-xs text-ink/50">
        {googleWallet
          ? "Une seule fois : votre nom et votre téléphone. Google Wallet s'ouvre ensuite pour enregistrer la carte sur ce téléphone."
          : "Si ce téléphone est déjà dans l'institut, la carte existante s'ouvre."}
      </p>
      <input className={field} required placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <input className={field} required placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <input
        className={field}
        required
        inputMode="numeric"
        placeholder="Téléphone"
        maxLength={PHONE_MAX_DIGITS}
        value={phone}
        onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
      />
      <input
        className={field}
        type="email"
        placeholder="E-mail (facultatif)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-60"
      >
        {loading
          ? googleWallet
            ? "Ouverture de Google Wallet…"
            : "Création…"
          : googleWallet
            ? "Ajouter à Google Wallet"
            : "Créer ma carte"}
      </button>
    </form>
  );
}
