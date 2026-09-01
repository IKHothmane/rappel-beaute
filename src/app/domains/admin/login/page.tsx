"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { platformLogin } from "@/modules/admin/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await platformLogin(String(fd.get("email")), String(fd.get("password")));
      router.push("/dashboard/");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-console relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4 text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,28,95,0.12),_transparent_50%)]"
      />
      <form onSubmit={onSubmit} className="surface relative w-full max-w-md p-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-display font-semibold text-white">
            R
          </span>
          <div>
            <p className="font-display font-semibold">Rappel Beauté</p>
            <p className="font-mono text-[10px] tracking-[0.16em] text-primary">SUPER ADMIN</p>
          </div>
        </div>
        <h1 className="mt-8 font-display text-2xl font-semibold">Connexion</h1>
        <p className="mt-2 text-sm text-ink/60">Espace plateforme uniquement.</p>
        <label className="mt-6 block text-sm">
          <span className="mb-1.5 block font-medium">E-mail</span>
          <input name="email" type="email" required className="ac-input" />
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium">Mot de passe</span>
          <input name="password" type="password" required className="ac-input" />
        </label>
        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        {error ? (
          <p className="mt-3 text-sm text-red-600">Identifiants invalides ou accès refusé.</p>
        ) : null}
        <p className="mt-4 text-center text-xs text-ink/45">
          <a href="/?__host=www" className="font-semibold text-primary">
            Retour à la vitrine
          </a>
        </p>
      </form>
    </div>
  );
}
