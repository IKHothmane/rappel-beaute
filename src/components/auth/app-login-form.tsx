"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GoogleButton, googleLoginErrorMessage, stripQueryParam, useAuthConfig } from "@/components/auth/google-auth";
import { loginDestination, useInstituteSignupHref } from "@/components/auth/auth-ui";
import { useSession } from "@/components/auth/session-provider";
import { BrandLogo } from "@/components/www/BrandLogo";

export function AppLoginForm() {
  const { refresh } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const submitting = useRef(false);
  const { phoneLoginEnabled } = useAuthConfig();
  const signupHref = useInstituteSignupHref();
  // Libellé actuel tant que la configuration n'est pas lue ; le champ reste le même élément (pas de saut).
  const emailOnly = !phoneLoginEnabled;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = googleLoginErrorMessage(params.get("google_error"));
    if (message) {
      setGoogleError(message);
      stripQueryParam("google_error");
    }
    setNextPath(params.get("next"));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setLoading(true);
    let redirecting = false;

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const remember = form.get("remember") === "on";

    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      if (res.status === 429) {
        setError("Trop de tentatives. Réessayez plus tard.");
        return;
      }
      if (res.status === 503) {
        setError("Le service de connexion est temporairement indisponible. Réessayez dans quelques instants.");
        return;
      }
      if (!res.ok) {
        setError("Identifiants invalides.");
        return;
      }

      const data = (await res.json().catch(() => null)) as Parameters<typeof loginDestination>[0];
      await refresh();
      // Le bouton reste bloqué jusqu'au changement de page.
      redirecting = true;
      window.location.replace(loginDestination(data));
    } catch {
      setError("Connexion impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      if (!redirecting) {
        submitting.current = false;
        setLoading(false);
      }
    }
  }

  return (
    <form className="surface relative w-full max-w-md p-8" method="post" action="/login/" onSubmit={onSubmit}>
      <BrandLogo href={null} height={56} className="max-h-14" />
      <h1 className="mt-8 font-display text-3xl font-semibold">Bienvenue sur Rappel Beauty</h1>
      <p className="mt-2 text-sm text-ink/60">
        Accédez à votre espace et gérez votre institut en toute simplicité.
      </p>
      {googleError ? (
        <p className="mt-4 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink/70" role="alert">
          {googleError}
        </p>
      ) : null}
      <GoogleButton
        intent="login"
        next={nextPath}
        className="mt-6 flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-busy:cursor-wait aria-busy:opacity-75"
        after={
          <div className="mt-5 flex items-center gap-3 text-xs text-ink/50" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            ou
            <span className="h-px flex-1 bg-line" />
          </div>
        }
      >
        Continuer avec Google
      </GoogleButton>
      <label className="mt-6 block text-sm">
        <span className="mb-1.5 block font-medium">{emailOnly ? "Adresse e-mail" : "WhatsApp ou e-mail"}</span>
        <input
          name="email"
          type={emailOnly ? "email" : "text"}
          inputMode={emailOnly ? "email" : undefined}
          maxLength={254}
          required
          autoCapitalize="none"
          spellCheck={false}
          autoComplete={emailOnly ? "email" : "username"}
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "app-login-error" : undefined}
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
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "app-login-error" : undefined}
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="mt-4 flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" name="remember" defaultChecked /> Se souvenir de moi pendant 30 jours
      </label>
      <p className="mt-3 text-right text-sm">
        <Link href="/forgot-password/" className="font-semibold text-primary">
          Mot de passe oublié ?
        </Link>
      </p>
      <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary mt-4 w-full">
        {loading ? "Connexion…" : "Se connecter"}
      </button>
      {error ? (
        <p id="app-login-error" className="mt-4 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink/70" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-6 border-t border-line pt-4 text-center text-sm text-ink/70">
        Pas encore de compte ?{" "}
        <a href={signupHref} className="font-semibold text-primary">
          Créer mon institut
        </a>
      </p>
    </form>
  );
}
