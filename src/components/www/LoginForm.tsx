"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Store } from "lucide-react";

function LoginFormFields() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const fromEmail = searchParams.get("identifier")?.trim() || searchParams.get("email")?.trim() || "";
    if (fromEmail) setEmail(fromEmail);
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

    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, remember }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as {
          user?: { scope?: string; accountType?: string };
          mustChangePassword?: boolean;
        } | null;
        const isPlatform =
          data?.user?.scope === "platform" || data?.user?.accountType === "PLATFORM";
        // `auth=1` contourne un éventuel 308 mis en cache sur /dashboard/?__host=app.
        if (isPlatform) {
          window.location.replace("/dashboard/?__host=admin&auth=1");
        } else if (data?.mustChangePassword) {
          window.location.replace("/changer-mot-de-passe/?__host=app&auth=1");
        } else {
          window.location.replace("/dashboard/?__host=app&auth=1");
        }
        return;
      }

      if (res.status === 429) {
        setError("Trop de tentatives. Réessayez plus tard.");
        return;
      }

      if (res.status === 503) {
        setError("Le service de connexion est temporairement indisponible. Réessayez dans quelques instants.");
        return;
      }

      setError("Identifiants invalides.");
    } catch {
      setError("Connexion impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rb-login-content">
      <h1>Connectez-<em>vous</em></h1>
      <p className="rb-login-intro">Accédez à votre espace et gérez votre institut en toute simplicité.</p>
      <form className="rb-login-form" onSubmit={onSubmit}>
        <div>
          <label className="sr-only" htmlFor="email">Numéro WhatsApp ou e-mail professionnel</label>
          <div className="rb-login-input"><Mail aria-hidden="true" /><input autoComplete="username" id="email" name="email" onChange={e => setEmail(e.target.value)} placeholder="WhatsApp ou e-mail professionnel" required type="text" maxLength={254} value={email} disabled={loading} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} autoCapitalize="none" spellCheck={false} /></div>
        </div>
        <div>
          <label className="sr-only" htmlFor="password">Mot de passe</label>
          <div className="rb-login-input"><LockKeyhole aria-hidden="true" /><input autoComplete="current-password" id="password" name="password" onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" required type={showPassword ? "text" : "password"} value={password} disabled={loading} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} /><button className="rb-login-eye" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)} type="button" disabled={loading}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div>
        </div>
        <div className="rb-login-options"><label htmlFor="remember-me"><input checked={remember} id="remember-me" name="remember-me" onChange={e => setRemember(e.target.checked)} type="checkbox" disabled={loading} />Se souvenir de moi</label><Link href="/forgot-password/">Mot de passe oublié ?</Link></div>
        <button className="rb-login-submit" disabled={loading} type="submit" aria-busy={loading}>{loading ? "Connexion…" : "Se connecter"}{!loading && <ArrowRight aria-hidden="true" />}</button>
        {error && <p id="login-error" className="rb-login-error" role="alert">{error}</p>}
      </form>
      <div className="rb-login-signup"><p>Vous n’avez pas encore de compte ?</p><Link href="/professionnel/"><Store aria-hidden="true" />Inscrire votre institut<ArrowRight aria-hidden="true" /></Link></div>
    </div>
  );
}

export function LoginForm() {
  return <Suspense fallback={<div className="rb-login-loading" role="status">Chargement du formulaire…</div>}><LoginFormFields /></Suspense>;
}
