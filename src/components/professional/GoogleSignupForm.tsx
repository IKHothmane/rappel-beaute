"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Globe, KeyRound, Lock, MapPin, Phone, Store, UserRound } from "lucide-react";
import { CitySelect, Field } from "@/components/professional/ProfessionalAccessPage";
import { GoogleButton, useGoogleEnabled } from "@/components/auth/google-auth";
import {
  LogoField,
  WrongHostNotice,
  authMessage,
  readWrongHost,
  safeInternalPath,
  type WrongHost,
} from "@/components/auth/auth-ui";
import { PHONE_MAX_DIGITS, limitPhoneDigits } from "@/lib/validation/customer";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";

type Props = {
  pending: { name: string; email: string };
  cityGroups: readonly { region: string; cities: readonly string[] }[];
  /** Appelé quand le cookie d'inscription a expiré (PENDING_EXPIRED). */
  onExpired: () => void;
};

type Mode = "google" | "email";

const ENDPOINT: Record<Mode, string> = {
  google: "/api/auth/google/signup/",
  email: "/api/auth/signup/email/complete/",
};

/**
 * Formulaire d'institut après authentification : Google (POST /api/auth/google/signup/, sans mot de passe) ou e-mail
 * vérifié (POST /api/auth/signup/email/complete/, mot de passe de l'inscription redemandé). JSON sans logo ;
 * multipart/form-data (champ `logo`) avec un logo.
 */
function InstituteSignupForm({ mode, pending, cityGroups, onExpired }: Props & { mode: Mode }) {
  const p = mode === "google" ? "pro-g" : "pro-e";
  const [name, setName] = useState(pending.name);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [institut, setInstitut] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [needs, setNeeds] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [trap, setTrap] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<"phone" | "password" | null>(null);
  const [wrongHost, setWrongHost] = useState<WrongHost | null>(null);
  const [notAvailable, setNotAvailable] = useState(false);
  const submitting = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    setFieldError(null);
    setWrongHost(null);
    setNotAvailable(false);
    if (!city) {
      setError("Sélectionnez votre ville.");
      return;
    }
    if (mode === "email" && !password) {
      setFieldError("password");
      setError("Saisissez le mot de passe choisi à l'inscription.");
      return;
    }
    submitting.current = true;
    setLoading(true);
    let redirecting = false;
    try {
      const values: Record<string, string> = {
        institut: institut.trim(),
        ville: city,
        phone: limitPhoneDigits(phone),
        name: name.trim(),
        hp: trap,
      };
      if (mode === "email") values.password = password;
      if (address.trim()) values.localisation = address.trim();
      if (website.trim()) values.website = website.trim();
      else values.no_website = "1";
      if (needs.trim()) values.message = needs.trim().slice(0, L.message);

      let init: RequestInit;
      if (logo) {
        // Pas de Content-Type manuel : le navigateur ajoute la frontière multipart.
        const body = new FormData();
        for (const [key, value] of Object.entries(values)) body.set(key, value);
        body.set("logo", logo);
        init = { method: "POST", credentials: "include", body };
      } else {
        init = {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        };
      }

      const res = await fetch(ENDPOINT[mode], init);
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        host?: string;
        origin?: string;
        redirect?: string;
      };

      if (res.ok) {
        const target = safeInternalPath(payload.redirect, "/dashboard/?__host=app&auth=1");
        redirecting = true;
        window.location.replace(target);
        return;
      }
      if (payload.code === "PENDING_EXPIRED") {
        onExpired();
        return;
      }
      const host = readWrongHost(payload);
      if (host) {
        setWrongHost(host);
        return;
      }
      if (payload.code === "PASSWORD_MISMATCH") {
        setFieldError("password");
        setError(authMessage("PASSWORD_MISMATCH"));
        return;
      }
      if (payload.code === "PHONE_TAKEN") {
        setFieldError("phone");
        setError("Ce numéro de téléphone possède déjà un compte.");
        return;
      }
      if (payload.code === "NOT_AVAILABLE") {
        setNotAvailable(true);
        setError(authMessage("NOT_AVAILABLE"));
        return;
      }
      if (res.status === 429) {
        setError(authMessage("RATE_LIMITED"));
        return;
      }
      if (res.status === 403 || res.status === 415) {
        setError("Requête refusée. Rechargez la page et réessayez.");
        return;
      }
      setError(payload.error || "Impossible de créer le compte. Réessayez.");
    } catch {
      setError("Réseau indisponible. Réessayez.");
    } finally {
      // En cas de redirection on garde le bouton bloqué jusqu'au changement de page.
      if (!redirecting) {
        submitting.current = false;
        setLoading(false);
      }
    }
  }

  const errorId = `${p}-error`;
  return (
    <form
      onSubmit={onSubmit}
      method="post"
      action="/professionnel/"
      className="pro-form"
      aria-label={mode === "google" ? "Finaliser votre inscription avec Google" : "Finaliser votre inscription"}
    >
      <fieldset disabled={loading}>
        <legend className="sr-only">Informations de votre institut</legend>
        <p className="pro-google-note" role="status">
          {mode === "google"
            ? "Compte Google connecté. Il ne reste que quelques informations sur votre institut."
            : "Adresse e-mail confirmée. Il ne reste que quelques informations sur votre institut."}
        </p>
        <Field id={`${p}-name`} label="Votre prénom et nom" required>
          <div className="pro-input">
            <UserRound aria-hidden="true" />
            <input
              id={`${p}-name`}
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={L.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </Field>
        <Field id={`${p}-email`} label={mode === "google" ? "E-mail Google" : "Adresse e-mail"}>
          <div className="pro-input pro-input-readonly">
            <Lock aria-hidden="true" />
            <input
              id={`${p}-email`}
              name="email"
              type="email"
              value={pending.email}
              readOnly
              aria-readonly="true"
              autoComplete="email"
            />
          </div>
        </Field>
        {mode === "email" ? (
          <Field id={`${p}-password`} label="Mot de passe" required>
            <div className="pro-input">
              <KeyRound aria-hidden="true" />
              <input
                id={`${p}-password`}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                aria-invalid={fieldError === "password"}
                aria-describedby={fieldError === "password" ? errorId : `${p}-password-help`}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="pro-eye"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            <span id={`${p}-password-help`} className="pro-counter" style={{ textAlign: "left" }}>
              Saisissez à nouveau le mot de passe choisi à l’inscription.
            </span>
          </Field>
        ) : null}
        <Field id={`${p}-institut`} label="Nom de l’institut" required>
          <div className="pro-input">
            <Store aria-hidden="true" />
            <input
              id={`${p}-institut`}
              name="institut"
              placeholder="Ex. : Institut Belle Femme"
              autoComplete="organization"
              required
              minLength={2}
              maxLength={L.institut}
              value={institut}
              onChange={(e) => setInstitut(e.target.value)}
            />
          </div>
        </Field>
        <div className="pro-row">
          <Field id={`${p}-city`} label="Ville" required>
            <CitySelect id={`${p}-city`} groups={cityGroups} value={city} onChange={setCity} />
          </Field>
          <Field id={`${p}-phone`} label="Téléphone de contact" required>
            <div className="pro-input">
              <Phone aria-hidden="true" />
              <input
                id={`${p}-phone`}
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                placeholder="06 12 34 56 78"
                required
                pattern="[0-9]{8,10}"
                title="Saisissez entre 8 et 10 chiffres."
                maxLength={PHONE_MAX_DIGITS}
                value={phone}
                aria-invalid={fieldError === "phone"}
                aria-describedby={fieldError === "phone" ? errorId : undefined}
                onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
              />
            </div>
          </Field>
        </div>
        <Field id={`${p}-address`} label="Adresse (facultatif)">
          <div className="pro-input">
            <MapPin aria-hidden="true" />
            <input
              id={`${p}-address`}
              name="localisation"
              autoComplete="street-address"
              placeholder="Quartier, rue…"
              maxLength={L.address}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </Field>
        <Field id={`${p}-website`} label="Site web (facultatif)">
          <div className="pro-input">
            <Globe aria-hidden="true" />
            <input
              id={`${p}-website`}
              name="website"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="https://www.moninstitut.ma"
              maxLength={L.website}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </Field>
        <Field id={`${p}-needs`} label="Précisions et besoins (facultatif)">
          <textarea
            id={`${p}-needs`}
            name="message"
            placeholder="Parlez-nous de votre institut et de vos besoins…"
            maxLength={L.message}
            value={needs}
            onChange={(e) => setNeeds(e.target.value)}
          />
          <span className="pro-counter">
            {needs.length}/{L.message}
          </span>
        </Field>
        <div className="pro-field">
          <span className="pro-label-like">Logo de l’institut (facultatif)</span>
          <LogoField file={logo} onChange={setLogo} disabled={loading} />
        </div>
        {/* Leurre anti-robot : invisible, jamais rempli par une personne. */}
        <div className="pro-hp" aria-hidden="true">
          <label htmlFor={`${p}-hp`}>Ne pas remplir</label>
          <input
            id={`${p}-hp`}
            name="hp"
            tabIndex={-1}
            autoComplete="off"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
          />
        </div>
        <p className="pro-help">
          {mode === "google"
            ? "Vous vous connecterez ensuite avec Google. Aucun mot de passe n’est nécessaire."
            : "Vous vous connecterez ensuite avec votre adresse e-mail et votre mot de passe."}
        </p>
        {wrongHost ? (
          <WrongHostNotice
            wrongHost={wrongHost}
            path={mode === "google" ? "/professionnel/?google=1" : "/professionnel/?email=1"}
            className="pro-error"
            linkClassName="pro-link"
          />
        ) : null}
        {error && !wrongHost && (
          <p role="alert" id={errorId} className="pro-error">
            {error}
            {notAvailable ? (
              <>
                {" "}
                <Link href="/connexion/" className="pro-link">
                  Se connecter
                </Link>
              </>
            ) : null}
          </p>
        )}
        <div className="pro-actions">
          <button className="pro-primary" type="submit" aria-busy={loading}>
            {loading ? "Création du compte…" : "Créer mon institut"}
            {!loading && <ArrowRight aria-hidden="true" />}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

/** Formulaire d'institut allégé après l'authentification Google (POST /api/auth/google/signup/). */
export function GoogleSignupForm(props: Props) {
  return <InstituteSignupForm mode="google" {...props} />;
}

/** Formulaire d'institut après vérification de l'e-mail (POST /api/auth/signup/email/complete/). */
export function EmailSignupCompleteForm(props: Props) {
  return <InstituteSignupForm mode="email" {...props} />;
}

/** Message + bouton quand l'inscription Google en attente a expiré ou est introuvable. */
export function GoogleSignupExpired() {
  // Google désactivé (la route « pending » répond alors 404 comme pour un cookie absent) : aucun message qui
  // renverrait vers un bouton absent, le formulaire classique reste seul affiché.
  const enabled = useGoogleEnabled();
  if (!enabled) return null;
  return (
    <div className="pro-notice" role="alert">
      <p>Votre inscription Google a expiré. Recommencez avec Google.</p>
      <GoogleButton intent="signup" className="pro-google">
        Recommencer avec Google
      </GoogleButton>
    </div>
  );
}
