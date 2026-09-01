"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError("Identifiants invalides.");
        return;
      }

      router.push("/?__host=app");
      router.refresh();
    } catch {
      setError("Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface mx-auto max-w-md p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Connexion
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/65">
        Un e-mail, un mot de passe.{" "}
        <span className="font-medium text-ink">Le serveur détermine votre espace</span>{" "}
        — institut ou administration. Vous ne choisissez rien.
      </p>

      <label className="mt-8 block text-sm">
        <span className="mb-1.5 block font-medium">E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium">Mot de passe</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>

      <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
        {loading ? "Connexion…" : "Se connecter"}
      </button>

      {error ? (
        <p className="mt-4 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink/70" role="status">
          {error}
        </p>
      ) : null}

      <p className="mt-5 text-xs leading-relaxed text-ink/45">
        Le message d&apos;erreur est volontairement générique. Nous ne confirmons
        jamais si un e-mail existe.
      </p>
    </form>
  );
}
