"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { AUTH_ERROR_MESSAGES, type AuthErrorCode } from "@/lib/auth/auth-errors";
import { PASSWORD_MIN_LENGTH, checkPasswordPolicy } from "@/lib/auth/password-policy";
import "./auth-ui.css";

/** Texte du catalogue pour un code connu, sinon le message du serveur, sinon le repli. */
export function authMessage(
  code: string | null | undefined,
  serverMessage?: string | null,
  fallback = "Une erreur est survenue. Réessayez.",
): string {
  if (code && code in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[code as AuthErrorCode];
  return serverMessage || fallback;
}

/** Chemin interne sûr (jamais une URL absolue ni `//hôte`) ; sinon le repli. */
export function safeInternalPath(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export type WrongHost = { host: string; origin: string };

/** Hôte attendu d'une réponse 409 WRONG_HOST : seule une origine http(s) valide est acceptée. */
export function readWrongHost(
  payload: { code?: string; host?: unknown; origin?: unknown } | null | undefined,
): WrongHost | null {
  if (!payload || payload.code !== "WRONG_HOST" || typeof payload.origin !== "string") return null;
  try {
    const url = new URL(payload.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return { host: typeof payload.host === "string" && payload.host ? payload.host : url.host, origin: url.origin };
  } catch {
    return null;
  }
}

/** Message WRONG_HOST avec lien vers l'hôte indiqué (`path` : page à rouvrir sur cet hôte). */
export function WrongHostNotice({
  wrongHost,
  path = "/",
  className,
  linkClassName,
}: {
  wrongHost: WrongHost;
  path?: string;
  className?: string;
  linkClassName?: string;
}) {
  return (
    <div role="alert" className={className}>
      <p>{AUTH_ERROR_MESSAGES.WRONG_HOST}</p>
      <p>
        <a href={`${wrongHost.origin}${path}`} className={linkClassName}>
          Ouvrir {wrongHost.host}
        </a>
      </p>
    </div>
  );
}

/**
 * Lien « Créer mon institut » : /professionnel/ n'existe que sur l'hôte public. Relatif au premier rendu (serveur,
 * localhost, vitrine) ; sur app.*, il vise l'apex correspondant (même protocole et port, sans le préfixe « app. »).
 */
export function useInstituteSignupHref(): string {
  const [href, setHref] = useState("/professionnel/");
  useEffect(() => {
    const { protocol, hostname, port } = window.location;
    if (hostname.startsWith("app.")) {
      setHref(`${protocol}//${hostname.slice(4)}${port ? `:${port}` : ""}/professionnel/`);
    }
  }, []);
  return href;
}

/** Destination après connexion (ordre : plateforme, changement de mot de passe, sécurisation du compte, tableau de bord). */
export function loginDestination(
  data: {
    user?: { scope?: string; accountType?: string; emailSetupRequired?: boolean };
    mustChangePassword?: boolean;
  } | null,
): string {
  // `auth=1` contourne un éventuel 308 mis en cache sur /dashboard/?__host=*.
  if (data?.user?.scope === "platform" || data?.user?.accountType === "PLATFORM") {
    return "/dashboard/?__host=admin&auth=1";
  }
  if (data?.mustChangePassword) return "/changer-mot-de-passe/?__host=app&auth=1";
  if (data?.user?.emailSetupRequired === true) return "/security/?__host=app&auth=1#email";
  return "/dashboard/?__host=app&auth=1";
}

type Level = 0 | 1 | 2 | 3;

function strengthOf(password: string, email: string) {
  const lengthOk = password.length >= PASSWORD_MIN_LENGTH;
  const policy = lengthOk ? checkPasswordPolicy(password, { email }) : "PASSWORD_TOO_SHORT";
  const rules = [
    { ok: lengthOk, text: `Au moins ${PASSWORD_MIN_LENGTH} caractères` },
    { ok: lengthOk && policy !== "PASSWORD_TOO_COMMON", text: "Pas un mot de passe courant ou trop simple" },
    { ok: lengthOk && policy !== "PASSWORD_SAME_AS_EMAIL", text: "Différent de votre adresse e-mail" },
  ];
  if (!password) return { level: 0 as Level, label: "", rules };
  if (policy) return { level: 1 as Level, label: lengthOk ? "À éviter" : "Trop court", rules };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const level: Level = password.length >= 14 && variety >= 3 ? 3 : variety >= 3 || password.length >= 14 ? 2 : 1;
  return { level, label: level === 3 ? "Solide" : level === 2 ? "Correct" : "Acceptable", rules };
}

/** Indicateur de force et règles de la politique de mot de passe (mêmes règles que le serveur). */
export function PasswordStrength({ password, email = "", id }: { password: string; email?: string; id: string }) {
  const { level, label, rules } = strengthOf(password, email);
  return (
    <div className="rb-pw" id={id} data-level={level}>
      <div className="rb-pw-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="rb-pw-label">{label ? `Force : ${label}` : "Choisissez un mot de passe robuste."}</p>
      <ul className="rb-pw-rules">
        {rules.map((rule) => (
          <li key={rule.text} data-ok={rule.ok}>
            {rule.text}
            <span className="sr-only">{rule.ok ? " (respecté)" : " (à respecter)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mêmes valeurs que le serveur (signup-form.ts) : 2 Mo, PNG, JPG, WEBP ou SVG. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function validateLogoFile(file: File): string | null {
  if (!LOGO_TYPES.includes(file.type)) return "Formats de logo acceptés : PNG, JPG, WEBP ou SVG.";
  if (file.size > LOGO_MAX_BYTES) return "Le logo ne doit pas dépasser 2 Mo.";
  return null;
}

/** Sélecteur de logo facultatif avec aperçu (l'URL d'aperçu est révoquée au changement et au démontage). */
export function LogoField({
  file,
  onChange,
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) return;
    const problem = validateLogoFile(picked);
    if (problem) {
      setError(problem);
      event.target.value = "";
      return;
    }
    setError(null);
    onChange(picked);
  }

  function clear() {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rb-logo-field">
      <div className="rb-logo-row">
        <span className="rb-logo-preview" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" /> : "Logo"}
        </span>
        <span style={{ position: "relative" }}>
          <input
            ref={inputRef}
            id={inputId}
            className="rb-logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={disabled}
            aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
            onChange={onPick}
          />
          <label className="rb-logo-pick" htmlFor={inputId}>
            {file ? "Changer de logo" : "Choisir un logo"}
          </label>
        </span>
        {file ? (
          <button type="button" className="rb-logo-remove" onClick={clear} disabled={disabled}>
            Retirer le logo
          </button>
        ) : null}
      </div>
      <p id={`${inputId}-hint`} className="rb-logo-hint">
        {file ? `${file.name} · ` : ""}PNG, JPG, WEBP ou SVG, 2 Mo maximum.
      </p>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="rb-logo-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
