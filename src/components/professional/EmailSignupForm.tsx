"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, MailCheck, UserRound } from "lucide-react";
import { Field } from "@/components/professional/ProfessionalAccessPage";
import { PasswordStrength, authMessage } from "@/components/auth/auth-ui";
import { RESENT_MESSAGE, postAuthJson, resendSignupEmail } from "@/components/auth/email-signup-api";
import { checkPasswordPolicy, PASSWORD_POLICY_MESSAGES } from "@/lib/auth/password-policy";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";

type FieldKey = "name" | "email" | "password" | "confirm";

const SERVER_FIELD: Record<string, FieldKey> = {
  NAME_INVALID: "name",
  EMAIL_INVALID: "email",
  PASSWORD_TOO_SHORT: "password",
  PASSWORD_TOO_LONG: "password",
  PASSWORD_TOO_COMMON: "password",
  PASSWORD_SAME_AS_EMAIL: "password",
};

/** Première étape de l'inscription par e-mail : nom, e-mail, mot de passe confirmé (POST /api/auth/signup/email/). */
export function EmailSignupForm({ onSent }: { onSent: (info: { email: string; message: string }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [trap, setTrap] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ field: FieldKey | null; text: string } | null>(null);
  const submitting = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const cleanEmail = email.trim();
    const policy = checkPasswordPolicy(password, { email: cleanEmail });
    if (policy) {
      setError({ field: "password", text: PASSWORD_POLICY_MESSAGES[policy] });
      return;
    }
    if (password !== confirm) {
      setError({ field: "confirm", text: "Les deux mots de passe ne sont pas identiques." });
      return;
    }
    submitting.current = true;
    setError(null);
    setLoading(true);
    const result = await postAuthJson("/api/auth/signup/email/", {
      email: cleanEmail,
      password,
      name: name.trim(),
      hp: trap,
    });
    submitting.current = false;
    setLoading(false);
    if (result.ok) {
      onSent({ email: cleanEmail, message: result.message || "Vérifiez votre boîte de réception." });
      return;
    }
    if (result.status === 429) {
      setError({ field: null, text: authMessage("RATE_LIMITED") });
      return;
    }
    const field = result.code ? SERVER_FIELD[result.code] : undefined;
    setError({ field: field ?? null, text: result.error || "Impossible de créer le compte. Réessayez." });
  }

  const errorId = "pro-s-error";
  const bad = (key: FieldKey) => error?.field === key;
  return (
    <form onSubmit={onSubmit} className="pro-form" aria-label="Inscription par e-mail">
      <fieldset disabled={loading}>
        <legend className="sr-only">Créer votre compte avec une adresse e-mail</legend>
        <Field id="pro-s-name" label="Votre prénom et nom" required>
          <div className="pro-input" data-invalid={bad("name")}>
            <UserRound aria-hidden="true" />
            <input
              id="pro-s-name"
              name="name"
              autoComplete="name"
              placeholder="Ex. : Kenza Berrada"
              required
              minLength={2}
              maxLength={L.name}
              value={name}
              aria-invalid={bad("name")}
              aria-describedby={bad("name") ? errorId : undefined}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </Field>
        <Field id="pro-s-email" label="Adresse e-mail" required>
          <div className="pro-input" data-invalid={bad("email")}>
            <Mail aria-hidden="true" />
            <input
              id="pro-s-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="contact@moninstitut.ma"
              required
              maxLength={L.email}
              value={email}
              aria-invalid={bad("email")}
              aria-describedby={bad("email") ? errorId : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </Field>
        <Field id="pro-s-password" label="Mot de passe" required>
          <div className="pro-input" data-invalid={bad("password")}>
            <KeyRound aria-hidden="true" />
            <input
              id="pro-s-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              maxLength={200}
              value={password}
              aria-invalid={bad("password")}
              aria-describedby={bad("password") ? `${errorId} pro-s-strength` : "pro-s-strength"}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="pro-eye"
              aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          <PasswordStrength id="pro-s-strength" password={password} email={email} />
        </Field>
        <Field id="pro-s-confirm" label="Confirmez le mot de passe" required>
          <div className="pro-input" data-invalid={bad("confirm")}>
            <KeyRound aria-hidden="true" />
            <input
              id="pro-s-confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              maxLength={200}
              value={confirm}
              aria-invalid={bad("confirm")}
              aria-describedby={bad("confirm") ? errorId : undefined}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </Field>
        {/* Leurre anti-robot : invisible, jamais rempli par une personne. */}
        <div className="pro-hp" aria-hidden="true">
          <label htmlFor="pro-s-hp">Ne pas remplir</label>
          <input id="pro-s-hp" name="hp" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>
        <p className="pro-help">
          Nous vous enverrons un lien pour confirmer votre adresse. Vous renseignerez ensuite les informations de votre
          institut.
        </p>
        {error && (
          <p role="alert" id={errorId} className="pro-error">
            {error.text}
          </p>
        )}
        <div className="pro-actions">
          <button className="pro-primary" type="submit" aria-busy={loading}>
            {loading ? "Envoi du lien…" : "Créer mon compte"}
            {!loading && <ArrowRight aria-hidden="true" />}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

const RESEND_DELAY_SEC = 60;

/** Écran « Vérifiez votre boîte e-mail » : message neutre, renvoi du lien après un compte à rebours de 60 s. */
export function CheckInboxPanel({
  email,
  message,
  onChangeEmail,
}: {
  email: string;
  message: string;
  onChangeEmail: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [remaining, setRemaining] = useState(RESEND_DELAY_SEC);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    // Une seule annonce à la fin du délai (pas une par seconde).
    if (remaining === 0) setAnnounce("Vous pouvez renvoyer le lien.");
  }, [remaining]);

  async function resend() {
    if (busyRef.current || remaining > 0) return;
    busyRef.current = true;
    setBusy(true);
    setAnnounce("");
    setFeedback(null);
    const result = await resendSignupEmail(email);
    busyRef.current = false;
    setBusy(false);
    if (result.ok) {
      setFeedback({ tone: "ok", text: RESENT_MESSAGE });
      setRemaining(RESEND_DELAY_SEC);
      return;
    }
    setFeedback({
      tone: "error",
      text: result.status === 429 ? authMessage("RATE_LIMITED") : result.error || "Impossible de renvoyer l'e-mail. Réessayez.",
    });
  }

  return (
    <div className="pro-check-mail">
      <span className="pro-success-icon" aria-hidden="true">
        <MailCheck />
      </span>
      <h2 ref={headingRef} tabIndex={-1}>
        Vérifiez votre boîte e-mail
      </h2>
      <p>{message}</p>
      <p>
        Le lien de confirmation a été envoyé à <strong>{email}</strong>. Pensez à regarder dans vos courriers
        indésirables.
      </p>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {feedback ? (
        <p role={feedback.tone === "error" ? "alert" : "status"} className={feedback.tone === "error" ? "pro-error" : "pro-ok"}>
          {feedback.text}
        </p>
      ) : null}
      <button type="button" className="pro-secondary" onClick={resend} disabled={remaining > 0 || busy} aria-busy={busy}>
        {busy ? "Envoi…" : remaining > 0 ? `Renvoyer le lien (${remaining} s)` : "Renvoyer le lien"}
      </button>
      <button type="button" className="pro-link" style={{ justifySelf: "start", background: "none", border: 0, cursor: "pointer", font: "inherit", padding: 0 }} onClick={onChangeEmail}>
        Modifier l’adresse e-mail
      </button>
    </div>
  );
}
