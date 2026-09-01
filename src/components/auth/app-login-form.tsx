"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/auth/session-provider";

export function AppLoginForm() {
  const router = useRouter();
  const { refresh } = useSession();
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

      await refresh();
      router.push("/dashboard/");
      router.refresh();
    } catch {
      setError("Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="surface relative w-full max-w-md p-8" onSubmit={onSubmit}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-display font-semibold text-white">
          R
        </span>
        <span className="font-display font-semibold">Rappel Beauté</span>
      </div>
      <h1 className="mt-8 font-display text-3xl font-semibold">Bienvenue</h1>
      <p className="mt-2 text-sm text-ink/60">
        Connexion institut — le serveur détermine votre rôle et votre organisation.
      </p>
      <label className="mt-6 block text-sm">
        <span className="mb-1.5 block font-medium">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue="nadia@institutroyal.ma"
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium">Mot de passe</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue="demo1234"
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="mt-4 flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" name="remember" /> Se souvenir de moi
      </label>
      <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
        {loading ? "Connexion…" : "Se connecter"}
      </button>
      {error ? (
        <p className="mt-4 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink/70" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password/" className="font-semibold text-primary">
          Mot de passe oublié ?
        </Link>
      </p>
      <p className="mt-6 text-xs text-ink/45">
        Démo : nadia@institutroyal.ma / demo1234 (OWNER)
      </p>
    </form>
  );
}
