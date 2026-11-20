"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/www/BrandLogo";
import { WrongHostNotice, authMessage, readWrongHost, safeInternalPath, type WrongHost } from "@/components/auth/auth-ui";
import { RESENT_MESSAGE, postAuthJson, resendSignupEmail, type AuthApiResult } from "@/components/auth/email-signup-api";

type Kind = "signup" | "change";

type View =
  | { name: "init" }
  | { name: "missing" }
  | { name: "ready" }
  | { name: "working" }
  | { name: "done"; email: string; redirect?: string }
  | { name: "invalid" }
  | { name: "wrong-host"; host: WrongHost }
  | { name: "limited" }
  | { name: "error"; text: string };

const ENDPOINT: Record<Kind, string> = {
  signup: "/api/auth/signup/email/verify/",
  change: "/api/auth/email/verify-change/",
};

/**
 * Une seule requête par lien, même si le composant est monté deux fois (React strict mode) ou si le bouton est
 * actionné plusieurs fois : les appels simultanés partagent la même promesse. Le jeton est à usage unique.
 */
const inflight = new Map<string, Promise<AuthApiResult>>();

function confirmOnce(kind: Kind, token: string): Promise<AuthApiResult> {
  const key = `${kind}:${token}`;
  let request = inflight.get(key);
  if (!request) {
    request = postAuthJson(ENDPOINT[kind], { token }).finally(() => {
      window.setTimeout(() => inflight.delete(key), 1500);
    });
    inflight.set(key, request);
  }
  return request;
}

const alertBox = "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800";
const okBox = "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800";

/**
 * Page du lien reçu par e-mail : /verify-email/?token=…[&type=change]. RIEN n'est consommé au chargement (les
 * antivirus et clients de messagerie préchargent les liens) : la requête POST part uniquement après le clic sur
 * « Confirmer mon e-mail ».
 */
export function VerifyEmail() {
  const [kind, setKind] = useState<Kind>("signup");
  const [token, setToken] = useState("");
  const [view, setView] = useState<View>({ name: "init" });
  const busy = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get("token") ?? "").trim();
    setKind(params.get("type") === "change" ? "change" : "signup");
    setToken(value);
    setView(value && value.length <= 256 ? { name: "ready" } : { name: "missing" });
  }, []);

  useEffect(() => {
    // Après chaque résultat, le focus revient sur le titre : l'état est lu par les lecteurs d'écran.
    if (view.name !== "init" && view.name !== "ready") headingRef.current?.focus();
  }, [view.name]);

  async function confirm() {
    if (busy.current || !token) return;
    busy.current = true;
    setView({ name: "working" });
    const result = await confirmOnce(kind, token);
    busy.current = false;

    if (result.ok && result.verified !== false) {
      // Le jeton est consommé : il ne reste pas dans l'adresse (historique, en-tête Referer).
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      } catch {
        /* sans effet */
      }
      setView({ name: "done", email: result.email ?? "", redirect: result.redirect });
      if (kind === "signup") {
        const target = safeInternalPath(result.redirect, "/professionnel/?email=1");
        window.setTimeout(() => window.location.replace(target), 900);
      }
      return;
    }
    const host = readWrongHost(result);
    if (host) return setView({ name: "wrong-host", host });
    if (result.code === "TOKEN_INVALID") return setView({ name: "invalid" });
    if (result.status === 429) return setView({ name: "limited" });
    setView({ name: "error", text: result.error || "Impossible de confirmer l'adresse. Réessayez." });
  }

  const title =
    view.name === "done"
      ? "Adresse e-mail confirmée"
      : view.name === "invalid" || view.name === "missing"
        ? "Lien non valable"
        : view.name === "wrong-host"
          ? "Ouvrez la bonne adresse"
          : kind === "change"
            ? "Confirmer votre nouvelle adresse e-mail"
            : "Confirmer votre adresse e-mail";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-8">
      <div className="surface w-full max-w-md p-8">
        <BrandLogo href={null} height={56} className="max-h-14" />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-8 font-display text-2xl font-semibold outline-none"
        >
          {title}
        </h1>

        {view.name === "init" || view.name === "working" ? (
          <p className="mt-4 text-sm text-ink/60" role="status">
            {view.name === "working" ? "Confirmation en cours…" : "Chargement…"}
          </p>
        ) : null}

        {view.name === "ready" || view.name === "working" ? (
          <>
            <p className="mt-2 text-sm text-ink/60">
              {kind === "change"
                ? "Confirmez que cette adresse peut être utilisée pour votre compte Rappel Beauty."
                : "Une dernière étape avant de créer votre institut : confirmez votre adresse e-mail."}
            </p>
            <button
              type="button"
              className="btn-primary mt-6 w-full"
              onClick={() => void confirm()}
              disabled={view.name === "working"}
              aria-busy={view.name === "working"}
            >
              {view.name === "working" ? "Confirmation…" : "Confirmer mon e-mail"}
            </button>
          </>
        ) : null}

        {view.name === "done" ? (
          <div className="mt-4 space-y-4" role="status">
            <p className={okBox}>
              {view.email ? (
                <>
                  L’adresse <span className="font-semibold">{view.email}</span> est confirmée.
                </>
              ) : (
                "Votre adresse est confirmée."
              )}
            </p>
            {kind === "signup" ? (
              <p className="text-sm text-ink/60">
                Redirection vers la création de votre institut…{" "}
                <a
                  className="font-semibold text-primary"
                  href={safeInternalPath(view.redirect, "/professionnel/?email=1")}
                >
                  Continuer
                </a>
              </p>
            ) : (
              <p className="text-sm">
                <a className="font-semibold text-primary" href="/dashboard/?__host=app&auth=1">
                  Ouvrir mon espace
                </a>
              </p>
            )}
          </div>
        ) : null}

        {view.name === "missing" ? (
          <div className="mt-4 space-y-3 text-sm">
            <p role="alert" className={alertBox}>
              Ce lien est incomplet. Ouvrez-le depuis l’e-mail reçu ou demandez-en un nouveau.
            </p>
            {kind === "signup" ? <ResendBox /> : <ChangeRetry />}
          </div>
        ) : null}

        {view.name === "invalid" ? (
          <div className="mt-4 space-y-3 text-sm">
            <p role="alert" className={alertBox}>
              {authMessage("TOKEN_INVALID")}
            </p>
            {kind === "signup" ? <ResendBox /> : <ChangeRetry />}
          </div>
        ) : null}

        {view.name === "wrong-host" ? (
          <WrongHostNotice
            wrongHost={view.host}
            path={`/verify-email/?token=${encodeURIComponent(token)}${kind === "change" ? "&type=change" : ""}`}
            className={`mt-4 space-y-2 ${alertBox}`}
            linkClassName="font-semibold underline"
          />
        ) : null}

        {view.name === "limited" ? (
          <div className="mt-4 space-y-3 text-sm">
            <p role="alert" className={alertBox}>
              {authMessage("RATE_LIMITED")}
            </p>
            <button type="button" className="btn-ghost w-full" onClick={() => setView({ name: "ready" })}>
              Réessayer
            </button>
          </div>
        ) : null}

        {view.name === "error" ? (
          <div className="mt-4 space-y-3 text-sm">
            <p role="alert" className={alertBox}>
              {view.text}
            </p>
            <button type="button" className="btn-ghost w-full" onClick={() => setView({ name: "ready" })}>
              Réessayer
            </button>
          </div>
        ) : null}

        <p className="mt-6 border-t border-line pt-4 text-center text-sm text-ink/70">
          <Link href="/login/" className="font-semibold text-primary">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Lien expiré (inscription) : le jeton ne donne pas l'adresse, on la redemande pour renvoyer un lien. */
function ResendBox() {
  const [email, setEmail] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current || remaining > 0 || !email.trim()) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback(null);
    const result = await resendSignupEmail(email);
    busyRef.current = false;
    setBusy(false);
    if (result.ok) {
      setFeedback({ ok: true, text: RESENT_MESSAGE });
      setRemaining(60);
    } else {
      setFeedback({
        ok: false,
        text: result.status === 429 ? authMessage("RATE_LIMITED") : result.error || "Impossible de renvoyer l'e-mail. Réessayez.",
      });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Votre adresse e-mail</span>
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
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={feedback.ok ? okBox : alertBox}>
          {feedback.text}
        </p>
      ) : null}
      <button type="submit" className="btn-primary w-full" disabled={busy || remaining > 0} aria-busy={busy}>
        {busy ? "Envoi…" : remaining > 0 ? `Renvoyer un lien (${remaining} s)` : "Renvoyer un lien"}
      </button>
    </form>
  );
}

/** Lien de changement d'adresse expiré : une nouvelle demande se fait connecté, depuis « Sécuriser mon compte ». */
function ChangeRetry() {
  return (
    <p>
      Pour recevoir un nouveau lien, connectez-vous puis demandez-le depuis{" "}
      <a className="font-semibold text-primary" href="/security/?__host=app#email">
        Sécuriser mon compte
      </a>
      .
    </p>
  );
}
