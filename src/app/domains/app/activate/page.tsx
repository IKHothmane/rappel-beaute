"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function ActivateForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/activate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Erreur");
      }
      router.push("/login/?activated=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface mx-auto mt-16 max-w-md p-8">
      <h1 className="font-display text-2xl font-semibold">Activer votre compte</h1>
      <p className="mt-2 text-sm text-ink/60">Choisissez votre mot de passe (8 caractères minimum).</p>
      <label className="mt-6 block text-sm">
        <span className="mb-1.5 block font-medium">Mot de passe</span>
        <input
          type="password"
          required
          minLength={8}
          className="ac-input w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" disabled={loading || !token} className="btn-primary mt-6 w-full">
        {loading ? "Activation…" : "Activer"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}

export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateForm />
    </Suspense>
  );
}
