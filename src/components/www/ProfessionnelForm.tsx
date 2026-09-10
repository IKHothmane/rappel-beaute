"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CITIES, SITE } from "@/lib/site";

const PLANS = new Set(["starter", "institut", "premium"]);

export function ProfessionnelForm() {
  const params = useSearchParams();
  const raw = (params.get("plan") ?? "").toLowerCase();
  const defaultPlan = PLANS.has(raw) ? raw : "institut";
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 700);
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-line bg-primary-light/50 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </span>
        <div>
          <p className="font-display text-xl font-semibold text-ink">
            Demande transmise avec succès !
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">
            Notre équipe vous contactera via WhatsApp sous 24h pour configurer vos prestations et
            ouvrir votre console.
          </p>
        </div>
      </div>
    );
  }

  const field =
    "h-12 w-full rounded-lg border border-line bg-paper px-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="mb-2 flex items-start gap-3 rounded-xl bg-primary-light/50 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div>
          <span className="text-sm font-bold tracking-wide text-ink">Accès calibré à la main</span>
          <p className="mt-0.5 text-xs leading-normal text-ink/55">
            Votre accès sur-mesure sera activé sous 24h par notre équipe. Aucun compte en
            libre-service — nous paramétrons chaque institut avec soin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Votre prénom &amp; nom</span>
          <input
            className={field}
            name="name"
            placeholder="ex. Kenza Berrada"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Nom de l&apos;institut ou spa</span>
          <input
            className={field}
            name="institut"
            placeholder="ex. Maison de Beauté L'Écrin"
            required
            type="text"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Ville d&apos;implantation</span>
          <select className={`${field} cursor-pointer appearance-none`} name="ville" required defaultValue="">
            <option disabled value="">
              Sélectionner votre ville
            </option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">WhatsApp professionnel</span>
          <input
            className={field}
            name="phone"
            placeholder="+212 6 XX XX XX XX"
            required
            type="tel"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Adresse e-mail professionnelle</span>
        <input
          className={field}
          name="email"
          placeholder="contact@institut.ma"
          required
          type="email"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-center justify-between font-medium text-ink">
          <span>Formule souhaitée pour l&apos;essai</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
            14 jours sans engagement
          </span>
        </span>
        <select
          className={`${field} cursor-pointer appearance-none font-medium`}
          name="plan"
          defaultValue={defaultPlan}
        >
          <option value="institut">
            Formule Institut — 499 MAD/mois (Recommandé · 300 RDV/mois)
          </option>
          <option value="starter">Formule Starter — 299 MAD/mois (150 RDV/mois)</option>
          <option value="premium">
            Formule Premium — 899 MAD/mois (Illimité, Multi-sites)
          </option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Précisions &amp; besoins spécifiques</span>
        <textarea
          className="resize-none rounded-lg border border-line bg-paper p-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-primary focus:ring-2 focus:ring-primary/20"
          name="message"
          placeholder="Nombre de cabines, prestations phares (soins visage, hammam, onglerie), logiciel actuellement utilisé..."
          rows={3}
        />
      </label>

      <div className="flex flex-col gap-3 pt-1">
        <button
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg transition-all hover:bg-primary-dark active:scale-[0.99] disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <>Configuration en cours...</>
          ) : (
            <>
              Demander l&apos;activation de mon institut
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </>
          )}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink/45">
          <svg className="h-4 w-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          14 jours offerts · Sans carte bancaire · Conformité Loi 09-08 (CNDP Maroc)
        </p>
        <p className="text-center text-[11px] text-ink/35">
          Formulaire vitrine · {SITE.name} — aucune donnée métier n&apos;est lue ici.
        </p>
      </div>
    </form>
  );
}
