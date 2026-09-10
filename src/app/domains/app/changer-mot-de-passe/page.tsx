"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { BrandLogo } from "@/components/www/BrandLogo";
import { isAppSession } from "@/lib/auth/types";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { refresh, user, logout } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mustChange =
    user && isAppSession(user) ? Boolean(user.mustChangePassword) : true;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    try {
      const res = await fetch("/api/auth/change-password/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Impossible de changer le mot de passe.");
        return;
      }
      await refresh();
      router.push("/dashboard/");
      router.refresh();
    } catch {
      setError("Impossible de changer le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="surface relative mx-auto mt-10 w-full max-w-md p-8 sm:mt-16" onSubmit={onSubmit}>
      <BrandLogo href={null} height={56} className="max-h-14" />
      <h1 className="mt-8 font-display text-2xl font-semibold">
        {mustChange ? "Changement de mot de passe obligatoire" : "Changer mon mot de passe"}
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        {mustChange
          ? "Pour des raisons de sécurité, vous devez choisir un nouveau mot de passe avant de continuer."
          : "Choisissez un nouveau mot de passe (8 caractères minimum)."}
      </p>

      <label className="mt-6 block text-sm">
        <span className="mb-1.5 block font-medium">Nouveau mot de passe</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium">Confirmer le mot de passe</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>

      <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
        {loading ? "Enregistrement…" : "Changer mon mot de passe"}
      </button>

      {error ? (
        <p className="mt-4 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-4 w-full text-center text-sm text-ink/50 hover:text-ink"
        onClick={() => void logout()}
      >
        Se déconnecter
      </button>
    </form>
  );
}
