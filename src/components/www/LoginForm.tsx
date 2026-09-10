"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      // 1) Essai connexion institut (app)
      const appRes = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (appRes.ok) {
        router.push("/?__host=app");
        router.refresh();
        return;
      }

      // 2) Si échec → essai Super Admin (platform)
      // (admin@… n’existe que dans PlatformUser, l’API app renvoie volontairement 401)
      const platformRes = await fetch("/api/auth/platform/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (platformRes.ok) {
        router.push("/dashboard/?__host=admin");
        router.refresh();
        return;
      }

      if (appRes.status === 429 || platformRes.status === 429) {
        setError("Trop de tentatives. Réessayez plus tard.");
        return;
      }

      if (appRes.status === 503 || platformRes.status === 503) {
        const data = (await platformRes.json().catch(() => null)) as { error?: string } | null;
        setError(
          data?.error ??
            "Base de données indisponible. Démarrez PostgreSQL (port 5432) puis réessayez.",
        );
        return;
      }

      setError("Identifiants invalides.");
    } catch {
      setError("Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-3xl border border-white/60 bg-white/95 p-8 shadow-[0_25px_50px_-12px_rgba(36,26,34,0.12)] backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary-light text-primary shadow-inner">
            <svg aria-hidden className="h-7 w-7 fill-primary" viewBox="0 0 24 24">
              <path d="M12 2C11.5 5 9.5 8 6 9.5C9 11 11.2 13.5 11.5 18C12.5 13.5 14.8 11 18 9.5C14.5 8 12.5 5 12 2Z" />
              <path
                d="M5 14C5 17 8 20 12 21C16 20 19 17 19 14C16.5 15.5 13.5 16 12 16C10.5 16 7.5 15.5 5 14Z"
                opacity="0.6"
              />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            Se connecter
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm font-normal leading-relaxed text-ink/55">
            Un e-mail, un mot de passe.{" "}
            <span className="font-medium text-ink/80">
              Le serveur détermine automatiquement votre espace
            </span>{" "}
            — institut ou administration.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/80"
              htmlFor="email"
            >
              E-mail professionnel
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink/40">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
              <input
                autoComplete="username"
                className="w-full rounded-xl border border-line bg-white/90 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-all placeholder:text-ink/30 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                id="email"
                name="email"
                placeholder="contact@institut.ma"
                required
                type="email"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                className="block text-xs font-semibold uppercase tracking-wider text-ink/80"
                htmlFor="password"
              >
                Mot de passe
              </label>
              <span className="text-xs font-medium text-ink/40">Mot de passe oublié ?</span>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink/40">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-line bg-white/90 py-3 pl-11 pr-11 text-sm text-ink outline-none transition-all placeholder:text-ink/30 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                id="password"
                name="password"
                placeholder="••••••••••••"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink/40 hover:text-ink/70"
                onClick={() => setShowPassword((v) => !v)}
                type="button"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center pt-1">
            <input
              className="h-4 w-4 cursor-pointer rounded border-line text-primary focus:ring-primary/30"
              id="remember-me"
              name="remember-me"
              type="checkbox"
            />
            <label
              className="ml-2.5 cursor-pointer select-none text-xs font-medium text-ink/70"
              htmlFor="remember-me"
            >
              Mémoriser cet appareil pour 30 jours
            </label>
          </div>

          <div className="pt-2">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.99] disabled:opacity-70"
              disabled={loading}
              type="submit"
            >
              <span>{loading ? "Connexion…" : "Se connecter à mon espace"}</span>
              {!loading ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              ) : null}
            </button>
          </div>

          {error ? (
            <p
              className="rounded-xl border border-line bg-paper px-3 py-2 text-center text-sm text-ink/70"
              role="status"
            >
              {error}
            </p>
          ) : null}

          <div className="border-t border-line/70 pt-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-ink/40">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <span>
                Message d&apos;erreur générique. Chiffrement conforme CNDP (Loi 09-08).
              </span>
            </p>
          </div>
        </form>
      </div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-5 py-2 text-xs text-ink/60 shadow-sm backdrop-blur-md">
          <span>Pas encore de compte ?</span>
          <Link
            className="flex items-center gap-1 font-semibold text-primary hover:text-primary-dark hover:underline"
            href="/professionnel/"
          >
            Demander l&apos;activation professionnelle
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
