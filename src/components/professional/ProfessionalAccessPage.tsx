"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CreditCard,
  Gift,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { APP_LOGIN_HREF, PUBLIC_OFFER } from "@/lib/site";
import { PHONE_MAX_DIGITS, limitPhoneDigits } from "@/lib/validation/customer";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";
import "./professional-access.css";

export type ProfessionalFormData = {
  fullName: string;
  instituteName: string;
  city: string;
  whatsapp: string;
  email: string;
  website: string;
  needs: string;
};
export type ProfessionalCredentials = { identifier: string; temporaryPassword: string };
type Props = {
  onSubmit: (data: ProfessionalFormData) => Promise<void>;
  cityGroups: readonly { region: string; cities: readonly string[] }[];
  loading?: boolean;
  error?: string | null;
  credentials?: ProfessionalCredentials | null;
};
const initialValues: ProfessionalFormData = {
  fullName: "",
  instituteName: "",
  city: "",
  whatsapp: "",
  email: "",
  website: "",
  needs: "",
};
const MODULES = [
  { icon: CalendarDays, label: "Agenda & rendez-vous" },
  { icon: Users, label: "Clientes & fidélité" },
  { icon: Wallet, label: "Caisse & paiements" },
  { icon: Package, label: "Stock & produits" },
  { icon: ChartNoAxesCombined, label: "Statistiques" },
];

function CitySelect({
  id,
  groups,
  value,
  onChange,
}: {
  id: string;
  groups: readonly { region: string; cities: readonly string[] }[];
  value: string;
  onChange: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = value === "Autre" ? "Autre ville" : value || "Choisissez votre ville";

  return (
    <div className="pro-input pro-input-city" ref={rootRef}>
      <MapPin aria-hidden="true" />
      <button
        id={id}
        type="button"
        className="pro-city-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? undefined : "is-placeholder"}>{label}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div className="pro-city-menu" id={`${id}-list`} role="listbox" aria-label="Villes">
          {groups.map((group) => (
            <div key={group.region}>
              <p className="pro-city-region">{group.region}</p>
              {group.cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  role="option"
                  aria-selected={value === city}
                  onClick={() => {
                    onChange(city);
                    setOpen(false);
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          ))}
          <p className="pro-city-region">Autre</p>
          <button
            type="button"
            role="option"
            aria-selected={value === "Autre"}
            onClick={() => {
              onChange("Autre");
              setOpen(false);
            }}
          >
            Autre ville
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="pro-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function ProfessionalAccessPage({
  onSubmit,
  cityGroups,
  loading = false,
  error = null,
  credentials = null,
}: Props) {
  const [form, setForm] = useState(initialValues);
  function update(key: keyof ProfessionalFormData, value: string | boolean) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    await onSubmit({
      ...form,
      fullName: form.fullName.trim(),
      instituteName: form.instituteName.trim(),
      whatsapp: limitPhoneDigits(form.whatsapp),
      email: form.email.trim(),
      website: form.website.trim(),
      needs: form.needs.trim(),
    });
  }

  return (
    <section className="pro-access">
      <Image
        src="/brand/about-reception.webp"
        alt=""
        fill
        sizes="100vw"
        className="pro-background"
        priority
      />
      <div className="pro-layout">
        <aside className="pro-story" aria-label="Rappel Beauty pour votre institut">
          <Link href="/" className="pro-logo" aria-label="Rappel Beauty — Accueil">
            <Image
              src="/brand/logo.png"
              alt="Rappel Beauty"
              width={220}
              height={100}
              sizes="180px"
            />
          </Link>
          {/* Paragraphe et non titre : il précède le h1 de la page dans le DOM. */}
          <p className="pro-story-title">
            Inscrivez votre institut sur <em>Rappel Beauty</em>
          </p>
          <p>Créez votre espace en quelques minutes et gérez votre institut en toute simplicité.</p>
          <ul>
            {MODULES.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span>
                  <Icon aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <Image
            className="pro-spa"
            src="/brand/footer-spa-cutout.png"
            alt=""
            width={1774}
            height={887}
            sizes="(max-width: 800px) 180px, 440px"
          />
        </aside>

        <div className="pro-panel">
          <header className="pro-heading">
            <h1>
              {credentials ? (
                <>
                  Bienvenue dans <em>votre institut</em>
                </>
              ) : (
                <>
                  Créer <em>votre institut</em>
                </>
              )}
            </h1>
            <p>
              {credentials ? (
                "Votre espace Rappel Beauty est prêt."
              ) : (
                <>
                  Inscrivez votre institut et profitez de{" "}
                  <strong>{PUBLIC_OFFER.trialDays} jours d’essai gratuit,</strong>
                  <br className="pro-desktop-break" /> sans carte bancaire et sans engagement.
                </>
              )}
            </p>
          </header>

          {credentials ? (
            <div className="pro-success" role="status">
              <span className="pro-success-icon">
                <Check aria-hidden="true" />
              </span>
              <h2>Votre compte est prêt</h2>
              <p>
                Votre essai de {PUBLIC_OFFER.trialDays} jours est actif. Utilisez votre numéro
                WhatsApp et ce mot de passe temporaire, à modifier à la première connexion.
              </p>
              <dl>
                <div>
                  <dt>Numéro WhatsApp</dt>
                  <dd>{credentials.identifier}</dd>
                </div>
                <div>
                  <dt>Mot de passe temporaire</dt>
                  <dd className="pro-password">{credentials.temporaryPassword}</dd>
                </div>
              </dl>
              <p>Conservez ces accès avant de quitter cette page.</p>
              <a
                className="pro-primary"
                href={`${APP_LOGIN_HREF}?identifier=${encodeURIComponent(credentials.identifier)}`}
              >
                Se connecter
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                className="pro-form"
                aria-label="Inscription de votre institut"
              >
                <fieldset disabled={loading}>
                  <legend className="sr-only">
                    Informations de votre institut et de votre compte
                  </legend>
                  <Field id="pro-name" label="Votre prénom et nom" required>
                    <div className="pro-input">
                      <UserRound aria-hidden="true" />
                      <input
                        id="pro-name"
                        name="name"
                        autoComplete="name"
                        placeholder="Ex. : Kenza Berrada"
                        required
                        minLength={2}
                        maxLength={L.name}
                        value={form.fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                      />
                    </div>
                  </Field>
                  <Field id="pro-institut" label="Nom de l’institut" required>
                    <div className="pro-input">
                      <Store aria-hidden="true" />
                      <input
                        id="pro-institut"
                        name="institut"
                        placeholder="Ex. : Institut Belle Femme"
                        autoComplete="organization"
                        required
                        minLength={2}
                        maxLength={L.institut}
                        value={form.instituteName}
                        onChange={(e) => update("instituteName", e.target.value)}
                      />
                    </div>
                  </Field>
                  <div className="pro-row">
                    <Field id="pro-city" label="Ville" required>
                      <CitySelect
                        id="pro-city"
                        groups={cityGroups}
                        value={form.city}
                        onChange={(city) => update("city", city)}
                      />
                    </Field>
                    <Field id="pro-phone" label="Téléphone WhatsApp" required>
                      <div className="pro-input">
                        <Phone aria-hidden="true" />
                        <input
                          id="pro-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="numeric"
                          placeholder="06 12 34 56 78"
                          required
                          pattern="[0-9]{8,10}"
                          title="Saisissez entre 8 et 10 chiffres."
                          maxLength={PHONE_MAX_DIGITS}
                          value={form.whatsapp}
                          onChange={(e) => update("whatsapp", limitPhoneDigits(e.target.value))}
                        />
                      </div>
                    </Field>
                  </div>
                  <Field id="pro-email" label="E-mail professionnel" required>
                    <div className="pro-input">
                      <Mail aria-hidden="true" />
                      <input
                        id="pro-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="contact@moninstitut.ma"
                        required
                        maxLength={L.email}
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </div>
                  </Field>
                  <div className="pro-website">
                    <Field id="pro-website" label="Site web (facultatif)">
                      <div className="pro-input">
                        <Globe aria-hidden="true" />
                        <input
                          id="pro-website"
                          name="website"
                          type="text"
                          inputMode="url"
                          autoComplete="url"
                          placeholder="https://www.moninstitut.ma"
                          maxLength={L.website}
                          value={form.website}
                          onChange={(e) => update("website", e.target.value)}
                        />
                      </div>
                    </Field>
                  </div>
                  <Field id="pro-needs" label="Précisions et besoins (facultatif)">
                    <textarea
                      id="pro-needs"
                      name="message"
                      placeholder="Parlez-nous de votre institut et de vos besoins…"
                      maxLength={L.message}
                      value={form.needs}
                      onChange={(e) => update("needs", e.target.value)}
                    />
                    <span className="pro-counter">
                      {form.needs.length}/{L.message}
                    </span>
                  </Field>
                  <p className="pro-help">
                    Votre numéro WhatsApp servira d’identifiant. Un mot de passe temporaire
                    s’affichera une fois votre compte créé.
                  </p>
                  {error && (
                    <p role="alert" className="pro-error">
                      {error}
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
              <div className="pro-trust">
                <div>
                  <Gift aria-hidden="true" />
                  <p>
                    Essai gratuit
                    <br />
                    {PUBLIC_OFFER.trialDays} jours
                  </p>
                </div>
                <div>
                  <CreditCard aria-hidden="true" />
                  <p>
                    Sans carte
                    <br />
                    bancaire
                  </p>
                </div>
                <div>
                  <ShieldCheck aria-hidden="true" />
                  <p>
                    Sans
                    <br />
                    engagement
                  </p>
                </div>
              </div>
              <p className="pro-login">
                Déjà un compte ? <Link href={APP_LOGIN_HREF}>Se connecter</Link>
              </p>
            </>
          )}
          <nav className="pro-legal" aria-label="Informations légales">
            <Link href="/">Accueil</Link>
            <Link href="/confidentialite/">Confidentialité</Link>
            <Link href="/contact/">Besoin d’aide ?</Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
