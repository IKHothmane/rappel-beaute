"use client";

import { useEffect, useState } from "react";
import ProfessionalAccessPage, {
  type ProfessionalCredentials,
  type ProfessionalFormData,
} from "@/components/professional/ProfessionalAccessPage";
import { GoogleButton, stripQueryParam, useAuthConfig } from "@/components/auth/google-auth";
import { authMessage } from "@/components/auth/auth-ui";
import {
  EmailSignupCompleteForm,
  GoogleSignupExpired,
  GoogleSignupForm,
} from "@/components/professional/GoogleSignupForm";
import { CheckInboxPanel, EmailSignupForm } from "@/components/professional/EmailSignupForm";
import { CITY_GROUPS } from "@/lib/site";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";

export function ProfessionnelRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<ProfessionalCredentials | null>(null);
  const { phoneLoginEnabled, loaded: configLoaded } = useAuthConfig();
  // Retour de Google (?google=1) ou de la vérification e-mail (?email=1) : lecture du cookie d'inscription en attente.
  // idle = aucun parcours en attente, checking = lecture en cours, expired/limited = cookie absent ou trop de lectures.
  const [pending, setPending] = useState<
    | { kind: "google" | "email"; state: "idle" | "checking" | "expired" | "limited" }
    | { kind: "google" | "email"; state: "ready"; info: { name: string; email: string } }
  >({ kind: "google", state: "idle" });
  const [sent, setSent] = useState<{ email: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("google") === "1" ? "google" : params.get("email") === "1" ? "email" : null;
    if (!kind) return;
    let alive = true;
    setPending({ kind, state: "checking" });
    const url = kind === "google" ? "/api/auth/google/pending/" : "/api/auth/signup/email/pending/";
    fetch(url, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (res.status === 429) return "limited" as const;
        if (!res.ok) throw new Error("pending");
        const data = (await res.json()) as { name?: unknown; email?: unknown };
        if (typeof data.email !== "string" || !data.email) throw new Error("pending");
        return { name: typeof data.name === "string" ? data.name : "", email: data.email };
      })
      .then((result) => {
        if (!alive) return;
        setPending(result === "limited" ? { kind, state: "limited" } : { kind, state: "ready", info: result });
      })
      .catch(() => alive && setPending({ kind, state: "expired" }));
    return () => {
      alive = false;
    };
  }, [retry]);

  function restartEmailSignup() {
    stripQueryParam("email");
    setPending({ kind: "email", state: "idle" });
  }

  useEffect(() => {
    if (!credentials && !sent) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [credentials, sent]);

  async function handleSubmit(data: ProfessionalFormData) {
    setError(null);
    if (!data.city) {
      setError("Sélectionnez votre ville.");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.set("name", data.fullName);
      body.set("institut", data.instituteName);
      body.set("ville", data.city);
      body.set("phone", data.whatsapp);
      body.set("email", data.email);
      if (data.website) body.set("website", data.website);
      const message = data.needs.trim().slice(0, L.message);
      if (message) body.set("message", message);

      const res = await fetch("/api/public/signup/", { method: "POST", body });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        credentials?: ProfessionalCredentials;
      };

      if (!res.ok) {
        setError(payload.error || "Impossible de créer le compte. Réessayez.");
        return;
      }
      if (!payload.credentials?.identifier || !payload.credentials.temporaryPassword) {
        setError(
          "Votre compte a été créé, mais les accès n’ont pas pu être affichés. Contactez notre équipe avant de réessayer.",
        );
        return;
      }
      setCredentials(payload.credentials);
    } catch {
      setError("Réseau indisponible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const emailFlow = configLoaded && !phoneLoginEnabled;
  const inPending = pending.state !== "idle";

  let topSlot: React.ReactNode = null;
  let formOverride: React.ReactNode = undefined;

  if (pending.state === "checking") {
    topSlot = (
      <p className="pro-google-note" role="status">
        {pending.kind === "email" ? "Vérification de votre inscription…" : "Vérification de votre connexion Google…"}
      </p>
    );
    formOverride = <div className="pro-form-loading" aria-hidden="true" />;
  } else if (pending.state === "ready") {
    formOverride =
      pending.kind === "google" ? (
        <GoogleSignupForm
          pending={pending.info}
          cityGroups={CITY_GROUPS}
          onExpired={() => setPending({ kind: "google", state: "expired" })}
        />
      ) : (
        <EmailSignupCompleteForm
          pending={pending.info}
          cityGroups={CITY_GROUPS}
          onExpired={() => setPending({ kind: "email", state: "expired" })}
        />
      );
  } else if (pending.state === "limited") {
    topSlot = (
      <div className="pro-notice" role="alert">
        <p>{authMessage("RATE_LIMITED")}</p>
        <button type="button" className="pro-secondary" onClick={() => setRetry((n) => n + 1)}>
          Réessayer
        </button>
      </div>
    );
    formOverride = <div className="pro-form-loading" aria-hidden="true" />;
  } else if (pending.state === "expired" && pending.kind === "email") {
    topSlot = (
      <div className="pro-notice" role="alert">
        <p>{authMessage("PENDING_EXPIRED")}</p>
        <button type="button" className="pro-secondary" onClick={restartEmailSignup}>
          Recommencer l’inscription
        </button>
      </div>
    );
    formOverride = <div className="pro-form-loading" aria-hidden="true" />;
  }

  if (!inPending || (pending.state === "expired" && pending.kind === "google")) {
    // Aucun parcours en attente (ou inscription Google expirée : message puis choix habituel).
    const googleExpired = pending.state === "expired" && pending.kind === "google";
    const googleChoice = googleExpired ? (
      <GoogleSignupExpired />
    ) : (
      <GoogleButton
        intent="signup"
        className="pro-google"
        after={
          <div className="pro-or" aria-hidden="true">
            <span>ou</span>
          </div>
        }
      >
        S’inscrire avec Google
      </GoogleButton>
    );
    if (!configLoaded) {
      topSlot = googleExpired ? <GoogleSignupExpired /> : null;
      formOverride = <div className="pro-form-loading" aria-hidden="true" />;
    } else if (emailFlow) {
      topSlot = sent ? null : googleChoice;
      formOverride = sent ? (
        <CheckInboxPanel email={sent.email} message={sent.message} onChangeEmail={() => setSent(null)} />
      ) : (
        <EmailSignupForm onSent={setSent} />
      );
    } else {
      // Téléphone autorisé comme identifiant : inscription par téléphone actuelle, inchangée.
      topSlot = googleChoice;
    }
  }

  return (
    <ProfessionalAccessPage
      cityGroups={CITY_GROUPS}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      credentials={credentials}
      topSlot={topSlot}
      formOverride={formOverride}
    />
  );
}
