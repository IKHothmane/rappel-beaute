"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
} from "lucide-react";
import { APP_LOGIN_HREF } from "@/lib/site";
import { SiteFeatureBar } from "@/components/www/LoginScreen";
import { PHONE_MAX_DIGITS, limitPhoneDigits } from "@/lib/validation/customer";
import { PROFESSIONAL_SIGNUP_LIMITS as L } from "@/lib/validation/professional-signup";

export type ProfessionalFormData = {
  fullName: string;
  instituteName: string;
  city: string;
  whatsapp: string;
  website: string;
  needs: string;
  noWebsite: boolean;
};

export type ProfessionalCredentials = {
  identifier: string;
  temporaryPassword: string;
};

type Props = {
  onSubmit: (data: ProfessionalFormData) => Promise<void>;
  cities: readonly string[];
  loading?: boolean;
  error?: string | null;
  credentials?: ProfessionalCredentials | null;
};

const initialValues: ProfessionalFormData = {
  fullName: "",
  instituteName: "",
  city: "",
  whatsapp: "",
  website: "",
  needs: "",
  noWebsite: false,
};

const fieldClass =
  "h-[3.4rem] w-full rounded-xl border border-[#eadfe3] bg-white/90 px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-[#F7F3F2] disabled:text-ink/35";

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-1 text-primary">*</span> : null}
        {hint ? <span className="ml-1 font-normal text-[#817780]">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

export default function ProfessionalAccessPage({
  onSubmit,
  cities,
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
      website: form.noWebsite ? "" : form.website.trim(),
      needs: form.needs.trim(),
    });
  }

  return (
    <section className="salon-backdrop">
      <div className="flex w-full flex-col justify-center px-5 py-12 sm:px-8 lg:ml-[50%] lg:w-1/2 lg:px-8 lg:py-14 xl:pr-12">
        <div className="login-rise w-full">
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Créez votre accès
              <br />
              <span className="text-primary">professionnel.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink/60">
              Rejoignez <span className="font-semibold text-ink">Rappel Beauty</span> et simplifiez la gestion de votre institut.
            </p>

          {credentials ? (
            <div className="rounded-2xl border border-[#EEE5E8] bg-white p-6 sm:p-8">
              <h2 className="font-display text-2xl font-semibold text-[#251D22]">Votre compte est prêt</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#817780]">
                Votre essai de 7 jours est actif. Connectez-vous avec votre numéro WhatsApp et ce mot de passe temporaire, à modifier à la première connexion.
              </p>
              <dl className="mt-5 space-y-3 rounded-xl border border-[#EEE5E8] bg-[#FBF8F7] p-4 text-sm">
                <div>
                  <dt className="text-[#817780]">Numéro WhatsApp</dt>
                  <dd className="mt-1 select-text font-semibold text-[#251D22]">{credentials.identifier}</dd>
                </div>
                <div>
                  <dt className="text-[#817780]">Mot de passe temporaire</dt>
                  <dd className="mt-1 select-text font-mono text-xl font-bold tracking-widest text-[#B5004C]">
                    {credentials.temporaryPassword}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-[#817780]">Conservez ces accès avant de quitter cette page.</p>
              <a
                className="mt-5 inline-flex h-12 items-center justify-center rounded-lg bg-[#B5004C] px-5 text-sm font-semibold text-white hover:bg-[#93003E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B5004C]"
                href={`${APP_LOGIN_HREF}?identifier=${encodeURIComponent(credentials.identifier)}`}
              >
                Se connecter
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate={false}>
              <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="pro-name" label="Votre prénom & nom" required>
                      <input
                        id="pro-name"
                        className={fieldClass}
                        name="name"
                        placeholder="Ex. Kenza Berrada"
                        autoComplete="name"
                        required
                        maxLength={L.name}
                        value={form.fullName}
                        aria-invalid={Boolean(error)}
                        onChange={(e) => update("fullName", e.target.value)}
                      />
                    </Field>

                    <Field id="pro-institut" label="Nom de l'institut ou spa" required>
                      <input
                        id="pro-institut"
                        className={fieldClass}
                        name="institut"
                        placeholder="Ex. Maison de Beauté"
                        autoComplete="organization"
                        required
                        maxLength={L.institut}
                        value={form.instituteName}
                        aria-invalid={Boolean(error)}
                        onChange={(e) => update("instituteName", e.target.value)}
                      />
                    </Field>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="pro-city" label="Ville d'implantation" required>
                      <select
                        id="pro-city"
                        className={fieldClass}
                        name="ville"
                        required
                        value={form.city}
                        aria-invalid={Boolean(error)}
                        onChange={(e) => update("city", e.target.value)}
                      >
                        <option value="">Sélectionner votre ville</option>
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="pro-phone" label="WhatsApp professionnel" required>
                      <input
                        id="pro-phone"
                        className={fieldClass}
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="numeric"
                        placeholder="06 12 34 56 78"
                        required
                        maxLength={PHONE_MAX_DIGITS}
                        value={form.whatsapp}
                        aria-invalid={Boolean(error)}
                        onChange={(e) => update("whatsapp", limitPhoneDigits(e.target.value))}
                      />
                    </Field>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="pro-website" className="text-sm font-semibold text-ink">
                        Site web de l&apos;institut
                        <span className="ml-1 font-normal text-[#817780]">(optionnel)</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-[#817780]">
                        <input
                          type="checkbox"
                          checked={form.noWebsite}
                          onChange={(e) => update("noWebsite", e.target.checked)}
                          className="accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        />
                        Pas de site
                      </label>
                    </div>
                    <input
                      id="pro-website"
                      className={fieldClass}
                      name={form.noWebsite ? undefined : "website"}
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder={form.noWebsite ? "Pas de site web" : "www.moninstitut.ma"}
                      disabled={form.noWebsite}
                      maxLength={L.website}
                      value={form.noWebsite ? "" : form.website}
                      onChange={(e) => update("website", e.target.value.slice(0, L.website))}
                    />
                  </div>

                  <Field id="pro-needs" label="Précisions & besoins spécifiques" hint="(optionnel)">
                    <textarea
                      id="pro-needs"
                      className="min-h-[108px] w-full resize-y rounded-xl border border-[#eadfe3] bg-white/90 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      name="message"
                      placeholder="Parlez-nous de votre institut, de vos prestations et de vos besoins..."
                      maxLength={L.message}
                      value={form.needs}
                      onChange={(e) => update("needs", e.target.value.slice(0, L.message))}
                    />
                    <p className="mt-1 text-right text-[11px] text-[#9D9298]">
                      {form.needs.length}/{L.message}
                    </p>
                  </Field>

                  {error ? (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="inline-flex h-[3.4rem] w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(180,0,75,0.6)] transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Création du compte…" : "Créer mon accès"}
                    {!loading ? <ArrowRight size={17} aria-hidden /> : null}
                  </button>

                  <p className="text-center text-sm text-ink/60">
                    Déjà un compte ?{" "}
                    <Link
                      href={APP_LOGIN_HREF}
                      className="font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Se connecter
                    </Link>
                  </p>
                </form>
          )}
        </div>
      </div>
      <SiteFeatureBar showPrices />
    </section>
  );
}
