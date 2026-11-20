"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Store } from "lucide-react";
import {
  GoogleButton,
  googleLoginErrorMessage,
  stripQueryParam,
  useAuthConfig,
} from "@/components/auth/google-auth";
import { loginDestination, useInstituteSignupHref } from "@/components/auth/auth-ui";

function LoginFormFields() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const nextPath = searchParams.get("next");
  const { phoneLoginEnabled, loaded: configLoaded } = useAuthConfig();
  const signupHref = useInstituteSignupHref();
  // Libellé actuel tant que la configuration n'est pas lue : le champ est le même élément dans les deux cas.
  const emailOnly = !phoneLoginEnabled;
  const identifierLabel = emailOnly ? "Adresse e-mail" : "E-mail professionnel";

  useEffect(() => {
    const message = googleLoginErrorMessage(searchParams.get("google_error"));
    if (message) {
      setGoogleError(message);
      stripQueryParam("google_error");
    }
  }, [searchParams]);

  useEffect(() => {
    // `identifier` (ancien lien d'inscription par téléphone) n'est repris que si le téléphone est un identifiant.
    const identifier = configLoaded && phoneLoginEnabled ? searchParams.get("identifier")?.trim() : "";
    const fromEmail = identifier || searchParams.get("email")?.trim() || "";
    if (fromEmail) setEmail((current) => current || fromEmail);
  }, [searchParams, configLoaded, phoneLoginEnabled]);

  useEffect(() => {
    // Un secret n'est jamais lu depuis l'URL : on efface seulement ceux d'anciens liens.
    if (searchParams.has("password") || searchParams.has("pin")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("password");
      url.searchParams.delete("pin");
      const qs = url.searchParams.toString();
      window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    let redirecting = false;

    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, remember }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as Parameters<typeof loginDestination>[0];
        // Le bouton reste bloqué jusqu'au changement de page.
        window.location.replace(loginDestination(data));
        redirecting = true;
        return;
      }

      if (res.status === 429) {
        setError("Trop de tentatives. Réessayez plus tard.");
        return;
      }

      if (res.status === 503) {
        setError(
          "Le service de connexion est temporairement indisponible. Réessayez dans quelques instants.",
        );
        return;
      }

      setError("Identifiants invalides.");
    } catch {
      setError("Connexion impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      if (!redirecting) setLoading(false);
    }
  }

  return (
    <div className="rb-login-content">
      <h1>
        Bienvenue sur <em>Rappel Beauty</em>
      </h1>
      <p className="rb-login-intro">
        Accédez à votre espace et gérez votre institut en toute simplicité.
      </p>
      {googleError && (
        <p className="rb-login-error rb-login-google-error" role="alert">
          {googleError}
        </p>
      )}
      <GoogleButton
        intent="login"
        next={nextPath}
        className="rb-login-google"
        after={
          <div className="rb-login-or" aria-hidden="true">
            <span>ou</span>
          </div>
        }
      >
        Continuer avec Google
      </GoogleButton>
      <form className="rb-login-form" method="post" action="/connexion/" onSubmit={onSubmit}>
        <div>
          <label className="sr-only" htmlFor="email">
            {identifierLabel}
          </label>
          <div className="rb-login-input">
            <Mail aria-hidden="true" />
            <input
              autoComplete={emailOnly ? "email" : "username"}
              id="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder={identifierLabel}
              required
              type={emailOnly ? "email" : "text"}
              inputMode={emailOnly ? "email" : undefined}
              maxLength={254}
              value={email}
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </div>
        <div>
          <label className="sr-only" htmlFor="password">
            Mot de passe
          </label>
          <div className="rb-login-input">
            <LockKeyhole aria-hidden="true" />
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
            />
            <button
              className="rb-login-eye"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              type="button"
              disabled={loading}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="rb-login-options">
          <label htmlFor="remember-me">
            <input
              checked={remember}
              id="remember-me"
              name="remember-me"
              onChange={(e) => setRemember(e.target.checked)}
              type="checkbox"
              disabled={loading}
            />
            Se souvenir de moi
          </label>
          <Link href="/forgot-password/">Mot de passe oublié ?</Link>
        </div>
        <button className="rb-login-submit" disabled={loading} type="submit" aria-busy={loading}>
          {loading ? "Connexion…" : "Se connecter"}
          {!loading && <ArrowRight aria-hidden="true" />}
        </button>
        {error && (
          <p id="login-error" className="rb-login-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <div className="rb-login-signup">
        <p>Vous n’avez pas encore de compte ?</p>
        <Link href={signupHref}>
          <Store aria-hidden="true" />
          Créer mon institut
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="rb-login-loading" role="status">
          Chargement du formulaire…
        </div>
      }
    >
      <LoginFormFields />
    </Suspense>
  );
}
