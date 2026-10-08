"use client";

import { useState } from "react";
import { limitPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";

export function JoinLoyaltyForm({ token, disabled }: { token: string; disabled: boolean }) {
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
      const data = (await res.json()) as { error?: string; cardPath?: string };
      if (!res.ok || !data.cardPath) {
        setError(data.error || "Impossible de créer la carte.");
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
      <p className="text-sm font-semibold text-ink">Créer ma carte fidélité</p>
      <p className="text-xs text-ink/50">
        Si ce téléphone est déjà dans l&apos;institut, la carte existante s&apos;ouvre.
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
        {loading ? "Création…" : "Créer ma carte"}
      </button>
    </form>
  );
}
