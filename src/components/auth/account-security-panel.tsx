"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { GoogleButton } from "@/components/auth/google-auth";
import { GoogleSecurityCard } from "@/components/auth/google-security-card";
import { PasswordStrength, authMessage } from "@/components/auth/auth-ui";
import { postAuthJson } from "@/components/auth/email-signup-api";
import { PASSWORD_POLICY_MESSAGES, checkPasswordPolicy, type PasswordPolicyCode } from "@/lib/auth/password-policy";

type Security = {
  email: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  emailSetupRequired: boolean;
};

const inputClass = "w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-primary";
const alertBox = "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800";
const okBox = "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800";
const infoBox = "rounded-lg border border-line bg-paper px-3 py-2 text-ink/70";
const COOLDOWN_SEC = 60;

function useCooldown() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);
  return [remaining, () => setRemaining(COOLDOWN_SEC)] as const;
}

/** « Reconnectez-vous » : une session sans mot de passe doit être récente ; la reconnexion passe par Google. */
function ReauthNotice({ googleLinked }: { googleLinked: boolean }) {
  return (
    <div role="alert" className={`space-y-2 ${alertBox}`}>
      <p>{authMessage("REAUTH_REQUIRED")}</p>
      {googleLinked ? (
        <GoogleButton
          intent="login"
          next="/security/"
          className="btn-ghost inline-flex items-center gap-2 bg-white"
          busyLabel="Redirection vers Google…"
        >
          Me reconnecter avec Google
        </GoogleButton>
      ) : null}
    </div>
  );
}

function Card({ id, title, status, children }: { id: string; title: string; status?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="surface mb-4 max-w-md scroll-mt-24 space-y-3 p-5 text-sm">
      <div>
        <h2 id={`${id}-title`} className="font-medium text-ink">
          {title}
        </h2>
        {status ? <p className="text-xs text-ink/55">{status}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** (a) Définir ou confirmer l'adresse e-mail du compte. */
function EmailCard({ security }: { security: Security }) {
  const [email, setEmail] = useState(security.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<{ field: "email" | "password" | null; text: string } | null>(null);
  const [reauth, setReauth] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const busyRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current || cooldown > 0) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setReauth(false);
    const result = await postAuthJson("/api/auth/account-security/email/", { email: email.trim(), password });
    busyRef.current = false;
    setBusy(false);
    if (result.ok) {
      // Message générique : identique que l'adresse soit libre, déjà utilisée ou déjà confirmée.
      setSent("Si cette adresse peut être utilisée, un lien vient d'être envoyé. Ouvrez-le pour la confirmer.");
      setPassword("");
      startCooldown();
      return;
    }
    if (result.code === "REAUTH_REQUIRED") return setReauth(true);
    if (result.code === "INVALID_PASSWORD" || result.code === "CURRENT_PASSWORD_REQUIRED") {
      return setError({ field: "password", text: authMessage(result.code) });
    }
    if (result.code === "EMAIL_INVALID") return setError({ field: "email", text: result.error || "Adresse e-mail invalide." });
    if (result.status === 429) return setError({ field: null, text: authMessage("RATE_LIMITED") });
    setError({ field: null, text: result.error || "Impossible d'envoyer l'e-mail. Réessayez." });
  }

  const status = security.email
    ? security.emailVerified
      ? `Adresse confirmée : ${security.email}`
      : `Adresse à confirmer : ${security.email}`
    : "Aucune adresse e-mail définie";
  const changing = Boolean(security.email && security.emailVerified);

  return (
    <Card id="email" title="Adresse e-mail" status={status}>
      <p className="text-ink/65">
        {changing
          ? "Pour utiliser une autre adresse, indiquez-la ci-dessous : elle ne remplace l'actuelle qu'une fois confirmée."
          : "Votre adresse e-mail permet de récupérer votre accès et de recevoir vos notifications. Nous vous envoyons un lien de confirmation."}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block font-medium">{changing ? "Nouvelle adresse e-mail" : "Adresse e-mail"}</span>
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={busy}
            aria-invalid={error?.field === "email"}
            aria-describedby={error?.field === "email" ? "email-card-error" : undefined}
            className={inputClass}
          />
        </label>
        {security.hasPassword ? (
          <label className="block">
            <span className="mb-1.5 block font-medium">Mot de passe actuel</span>
            <input
              type="password"
              name="current-password"
              required
              maxLength={200}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              readOnly={busy}
              aria-invalid={error?.field === "password"}
              aria-describedby={error?.field === "password" ? "email-card-error" : undefined}
              className={inputClass}
            />
          </label>
        ) : null}
        {sent ? (
          <p role="status" className={okBox}>
            {sent}
          </p>
        ) : null}
        {reauth ? <ReauthNotice googleLinked={security.googleLinked} /> : null}
        {error ? (
          <p id="email-card-error" role="alert" className={alertBox}>
            {error.text}
          </p>
        ) : null}
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={busy || cooldown > 0 || !email.trim() || (security.hasPassword && !password)}
          aria-busy={busy}
        >
          {busy
            ? "Envoi…"
            : cooldown > 0
              ? `Renvoyer le lien (${cooldown} s)`
              : sent
                ? "Renvoyer le lien"
                : changing
                  ? "Envoyer le lien de confirmation"
                  : security.email
                    ? "Confirmer cette adresse"
                    : "Envoyer le lien de confirmation"}
        </button>
      </form>
    </Card>
  );
}

/** (c) Définir (compte Google) ou changer le mot de passe. */
function PasswordCard({ security, onChanged }: { security: Security; onChanged: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<{ field: "current" | "next" | "confirm" | null; text: string } | null>(null);
  const [reauth, setReauth] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const busyRef = useRef(false);

  const blockedByEmail = !security.hasPassword && !security.emailVerified;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    setError(null);
    setReauth(false);
    setNeedsEmail(false);
    setDone(null);
    const policy = checkPasswordPolicy(next, { email: security.email });
    if (policy) return setError({ field: "next", text: PASSWORD_POLICY_MESSAGES[policy] });
    if (next !== confirm) return setError({ field: "confirm", text: "Les deux mots de passe ne sont pas identiques." });
    busyRef.current = true;
    setBusy(true);
    const result = await postAuthJson("/api/auth/account-security/password/", {
      newPassword: next,
      ...(security.hasPassword ? { currentPassword: current } : {}),
    });
    busyRef.current = false;
    setBusy(false);
    if (result.ok) {
      setDone(
        security.hasPassword
          ? "Mot de passe modifié. Vos autres appareils ont été déconnectés."
          : "Mot de passe défini. Vous pouvez maintenant lier Google ou vous connecter avec votre e-mail.",
      );
      setCurrent("");
      setNext("");
      setConfirm("");
      onChanged();
      return;
    }
    const code = result.code ?? "";
    if (code === "REAUTH_REQUIRED") return setReauth(true);
    if (code === "EMAIL_NOT_VERIFIED") return setNeedsEmail(true);
    if (code === "PASSWORD_ALREADY_SET") {
      onChanged();
      return setError({ field: null, text: authMessage(code) });
    }
    if (code in PASSWORD_POLICY_MESSAGES) {
      return setError({ field: "next", text: PASSWORD_POLICY_MESSAGES[code as PasswordPolicyCode] });
    }
    if (code === "CURRENT_PASSWORD_INVALID" || code === "CURRENT_PASSWORD_REQUIRED") {
      return setError({ field: "current", text: result.error || authMessage(code) });
    }
    if (code === "PASSWORD_REUSE") return setError({ field: "next", text: result.error || "Choisissez un mot de passe différent de l'actuel." });
    if (result.status === 429) return setError({ field: null, text: authMessage("RATE_LIMITED") });
    setError({ field: null, text: result.error || "Impossible de modifier le mot de passe. Réessayez." });
  }

  const bad = (key: "current" | "next" | "confirm") => error?.field === key;
  return (
    <Card
      id="password"
      title={security.hasPassword ? "Changer le mot de passe" : "Définir un mot de passe"}
      status={security.hasPassword ? "Un mot de passe est défini" : "Aucun mot de passe : connexion avec Google uniquement"}
    >
      {blockedByEmail ? (
        <p className={infoBox}>
          Confirmez d’abord votre adresse e-mail (étape ci-dessus) : c’est elle qui permet de sécuriser votre mot de passe.{" "}
          <a href="#email" className="font-semibold text-primary">
            Aller à l’adresse e-mail
          </a>
        </p>
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <fieldset disabled={blockedByEmail || busy} className="space-y-3 disabled:opacity-60">
          <legend className="sr-only">{security.hasPassword ? "Changer le mot de passe" : "Définir un mot de passe"}</legend>
          {security.hasPassword ? (
            <label className="block">
              <span className="mb-1.5 block font-medium">Mot de passe actuel</span>
              <input
                type="password"
                name="current-password"
                required
                maxLength={200}
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                aria-invalid={bad("current")}
                aria-describedby={bad("current") ? "password-card-error" : undefined}
                className={inputClass}
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block font-medium">Nouveau mot de passe</span>
            <input
              type="password"
              name="new-password"
              required
              maxLength={200}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              aria-invalid={bad("next")}
              aria-describedby={bad("next") ? "password-card-error password-card-strength" : "password-card-strength"}
              className={inputClass}
            />
          </label>
          <PasswordStrength id="password-card-strength" password={next} email={security.email ?? ""} />
          <label className="block">
            <span className="mb-1.5 block font-medium">Confirmation</span>
            <input
              type="password"
              name="confirm-password"
              required
              maxLength={200}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={bad("confirm")}
              aria-describedby={bad("confirm") ? "password-card-error" : undefined}
              className={inputClass}
            />
          </label>
        </fieldset>
        {done ? (
          <p role="status" className={okBox}>
            {done}
          </p>
        ) : null}
        {reauth ? <ReauthNotice googleLinked={security.googleLinked} /> : null}
        {needsEmail ? (
          <p role="alert" className={alertBox}>
            {authMessage("EMAIL_NOT_VERIFIED")}{" "}
            <a href="#email" className="font-semibold underline">
              Confirmer mon adresse e-mail
            </a>
          </p>
        ) : null}
        {error ? (
          <p id="password-card-error" role="alert" className={alertBox}>
            {error.text}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={blockedByEmail || busy} aria-busy={busy}>
            {busy ? "Enregistrement…" : security.hasPassword ? "Modifier le mot de passe" : "Définir le mot de passe"}
          </button>
          <a href="/forgot-password/" className="text-center text-sm font-semibold text-primary sm:text-left">
            Mot de passe oublié ?
          </a>
        </div>
      </form>
    </Card>
  );
}

/** « Sécuriser mon compte » : adresse e-mail, connexion Google, mot de passe (état lu sur /api/auth/account-security/). */
export function AccountSecurityPanel() {
  const [security, setSecurity] = useState<Security | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "expired">("loading");
  // Remonter la carte Google après un changement de mot de passe : « Lier Google » devient disponible.
  const [googleKey, setGoogleKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/account-security/", { credentials: "include", cache: "no-store" });
      if (res.status === 401 || res.status === 403) return setState("expired");
      if (!res.ok) throw new Error("security");
      const data = (await res.json()) as Partial<Security>;
      setSecurity({
        email: typeof data.email === "string" ? data.email : null,
        emailVerified: data.emailVerified === true,
        hasPassword: data.hasPassword === true,
        googleLinked: data.googleLinked === true,
        emailSetupRequired: data.emailSetupRequired === true,
      });
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Ancre (#email, #password) : la cible n'existe qu'après le chargement.
  useEffect(() => {
    if (state !== "ready") return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [state]);

  if (state === "loading") {
    return (
      <p className="text-sm text-ink/55" role="status">
        Chargement…
      </p>
    );
  }
  if (state === "expired") {
    return (
      <p role="alert" className={`max-w-md ${alertBox} text-sm`}>
        Votre session a expiré. <a href="/login/" className="font-semibold underline">Se reconnecter</a>
      </p>
    );
  }
  if (state === "error" || !security) {
    return (
      <div role="alert" className="surface max-w-md space-y-2 p-5 text-sm">
        <p className="text-ink/65">Impossible de lire l’état de sécurité de votre compte.</p>
        <button type="button" className="btn-ghost" onClick={() => { setState("loading"); void load(); }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <>
      <EmailCard security={security} />
      <GoogleSecurityCard key={googleKey} />
      <PasswordCard
        security={security}
        onChanged={() => {
          setGoogleKey((v) => v + 1);
          void load();
        }}
      />
    </>
  );
}
