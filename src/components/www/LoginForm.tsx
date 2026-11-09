"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

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
    const fromPassword =
      searchParams.get("password")?.trim() || searchParams.get("pin")?.trim() || "";
    if (fromEmail) setEmail(fromEmail);
    if (fromPassword) {
      setPassword(fromPassword);
      setShowPassword(true);
    }
    if (fromEmail || fromPassword) {
      const url = new URL(window.location.href);
      url.searchParams.delete("password");
      url.searchParams.delete("pin");
      const qs = url.searchParams.toString();
      window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
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
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
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
    <div className="login-rise w-full max-w-[27.5rem]">
      <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
        Heureux de vous
        <br />
        <span className="text-primary">retrouver.</span>
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink/60">
        Connectez-vous à votre espace <span className="font-semibold text-ink">Rappel Beauty</span>.
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="email">
            Adresse e-mail
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink/35">
              <Mail size={18} />
            </div>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-[#eadfe3] bg-white/90 h-[3.4rem] pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/15"
              id="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex. : contact@moninstitut.ma"
              required
              type="email"
              maxLength={254}
              value={email}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-ink" htmlFor="password">
              Mot de passe
            </label>
            <Link href="/forgot-password/" className="text-sm font-medium text-primary hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink/35">
              <LockKeyhole size={18} />
            </div>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-[#eadfe3] bg-white/90 h-[3.4rem] pl-11 pr-11 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/15"
              id="password"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink/35 hover:text-ink/70"
              onClick={() => setShowPassword((v) => !v)}
              type="button"
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <input
            checked={remember}
              className="h-4 w-4 cursor-pointer rounded border-[#eadfe3] text-primary accent-primary focus:ring-primary/30"
            id="remember-me"
            name="remember-me"
            onChange={(e) => setRemember(e.target.checked)}
            type="checkbox"
          />
          <label className="ml-2.5 cursor-pointer select-none text-sm text-ink/75" htmlFor="remember-me">
            Se souvenir de moi
          </label>
        </div>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 h-[3.4rem] shadow-[0_12px_24px_-12px_rgba(180,0,75,0.6)] text-[15px] font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          <span>{loading ? "Connexion…" : "Se connecter"}</span>
          {!loading ? <ArrowRight aria-hidden size={17} /> : null}
        </button>

        {error ? (
          <p className="rounded-lg border border-line bg-paper px-3 py-2 text-center text-sm text-ink/70" role="status">
            {error}
          </p>
        ) : null}
      </form>

      <p className="mt-7 text-center text-sm text-ink/60">
        Vous n&apos;avez pas encore de compte ?{" "}
        <Link className="font-semibold text-primary hover:underline" href="/demo/">
          Demander une démo
        </Link>
      </p>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full max-w-[26rem] animate-pulse rounded-lg bg-paper" />
      }
    >
      <LoginFormFields />
    </Suspense>
  );
}
