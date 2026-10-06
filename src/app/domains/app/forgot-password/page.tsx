"use client";

import Link from "next/link";
import { useState } from "react";

const GENERIC =
  "Si ce compte existe, un lien de réinitialisation a été envoyé.";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      const res = await fetch("/api/auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError("Trop de demandes. Réessayez plus tard.");
        return;
      }
      if (!res.ok && res.status !== 200) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Impossible d'envoyer la demande.");
        return;
      }
      setSent(true);
    } catch {
      setError("Réseau indisponible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4">
      <form className="surface w-full max-w-md p-8" onSubmit={onSubmit}>
        <h1 className="font-display text-2xl font-semibold">Mot de passe oublié ?</h1>
        <p className="mt-2 text-sm text-ink/60">Entrez votre e-mail pour recevoir un lien.</p>
        {sent ? (
          <p className="mt-6 text-sm text-ink/70">{GENERIC}</p>
        ) : (
          <>
            <label className="mt-6 block text-sm">
              <span className="mb-1.5 block font-medium">E-mail</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
              {loading ? "Envoi…" : "Recevoir le lien"}
            </button>
          </>
        )}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        <p className="mt-4 text-center text-sm">
          <Link href="/connexion/" className="text-primary">
            Retour connexion
          </Link>
        </p>
      </form>
    </div>
  );
}
