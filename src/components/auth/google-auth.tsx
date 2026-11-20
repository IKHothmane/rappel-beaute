"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Logo « G » officiel de Google (4 couleurs), à utiliser tel quel sur fond blanc. */
export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={{ flexShrink: 0 }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export type AuthConfig = {
  /** Faux tant que la configuration n'est pas lue (bouton masqué) ou si Google est désactivé. */
  googleEnabled: boolean;
  /** Vrai par défaut (comportement historique) : seul un « false » explicite du serveur le désactive. */
  phoneLoginEnabled: boolean;
  /** Faux tant que /api/auth/config/ n'a pas répondu. Vrai ensuite, y compris après un échec (valeurs par défaut). */
  loaded: boolean;
};

const DEFAULT_AUTH_CONFIG: AuthConfig = { googleEnabled: false, phoneLoginEnabled: true, loaded: false };

let configRequest: Promise<AuthConfig> | null = null;

function loadAuthConfig(): Promise<AuthConfig> {
  configRequest ??= fetch("/api/auth/config/", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { googleEnabled?: unknown; phoneLoginEnabled?: unknown } | null) => {
      if (!data) throw new Error("config");
      return {
        googleEnabled: data.googleEnabled === true,
        phoneLoginEnabled: data.phoneLoginEnabled !== false,
        loaded: true,
      };
    })
    .catch(() => {
      // Échec : parcours actuel (téléphone autorisé, Google masqué) ; une nouvelle page retentera la lecture.
      configRequest = null;
      return { ...DEFAULT_AUTH_CONFIG, loaded: true };
    });
  return configRequest;
}

/**
 * Configuration publique des parcours d'authentification (Google, identifiant téléphone). Une seule requête par
 * page ; tant qu'elle n'a pas répondu, valeurs par défaut (Google masqué, parcours téléphone actuel conservé).
 */
export function useAuthConfig(): AuthConfig {
  const [config, setConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  useEffect(() => {
    let alive = true;
    void loadAuthConfig().then((value) => {
      if (alive) setConfig(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return config;
}

/** Faux tant que la réponse n'est pas connue ou si Google est désactivé : le bouton reste alors masqué. */
export function useGoogleEnabled(): boolean {
  return useAuthConfig().googleEnabled;
}

/** Messages `?google_error=` du retour de connexion Google. */
export function googleLoginErrorMessage(code: string | null | undefined): string | null {
  switch (code) {
    case "cancelled":
      return "Connexion Google annulée.";
    case "no_account":
      return "Aucun compte lié. Connectez-vous avec votre e-mail puis liez Google, ou créez votre institut.";
    case "failed":
    case "unavailable":
      return "Connexion Google impossible. Réessayez ou utilisez votre e-mail.";
    default:
      return null;
  }
}

/** Retire `google_error` de l'URL pour qu'un rechargement n'affiche pas l'erreur de nouveau. */
export function stripQueryParam(name: string): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(name)) return;
    url.searchParams.delete(name);
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
  } catch {
    /* sans effet */
  }
}

type GoogleButtonProps = {
  intent: "login" | "signup";
  next?: string | null;
  className?: string;
  children: ReactNode;
  busyLabel?: string;
  /** Rendu sous le bouton uniquement quand Google est activé (ex. séparateur « ou »). */
  after?: ReactNode;
};

/**
 * Lien (navigation pleine page, pas fetch) vers /api/auth/google/start/. Rendu uniquement si Google est activé.
 * Un second clic pendant la redirection est ignoré.
 */
export function GoogleButton({
  intent,
  next,
  className,
  children,
  busyLabel = "Redirection vers Google…",
  after,
}: GoogleButtonProps) {
  const enabled = useGoogleEnabled();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    // Retour arrière (bfcache) : on réactive le bouton.
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) {
        busyRef.current = false;
        setBusy(false);
      }
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  if (!enabled) return null;

  const params = new URLSearchParams({ intent });
  if (next && next.startsWith("/") && !next.startsWith("//")) params.set("next", next);
  return (
    <>
      <a
        className={className}
        href={`/api/auth/google/start/?${params.toString()}`}
        aria-busy={busy}
        aria-disabled={busy || undefined}
        onClick={(e) => {
          if (busyRef.current) {
            e.preventDefault();
            return;
          }
          busyRef.current = true;
          setBusy(true);
        }}
      >
        <GoogleLogo />
        <span>{busy ? busyLabel : children}</span>
      </a>
      {after}
    </>
  );
}
