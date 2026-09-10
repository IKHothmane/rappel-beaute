"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/site";

type Billing = "monthly" | "yearly";

const YEARLY: Record<(typeof PLANS)[number]["id"], number> = {
  starter: 239,
  institut: 399,
  premium: 719,
};

function Check({ className = "text-primary" }: { className?: string }) {
  return (
    <svg
      className={`mt-0.5 h-5 w-5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const STARTER_FEATURES: { label: ReactNode }[] = [
  {
    label: (
      <>
        <strong>Agenda anti-chevauchement</strong> ultra rapide
      </>
    ),
  },
  { label: "Fiches clientes avec historique complet" },
  {
    label: (
      <>
        Rappels WhatsApp <strong>wa.me assistés</strong> sans surcoût
      </>
    ),
  },
  { label: "1 accès gérante sécurisé" },
  { label: "Assistance technique par e-mail sous 24h" },
];

const INSTITUT_FEATURES: { label: ReactNode }[] = [
  {
    label: (
      <>
        <strong>Caisse enregistreuse &amp; Clôture Z</strong> conforme
      </>
    ),
  },
  {
    label: (
      <>
        Gestion avancée des <strong>stocks &amp; alertes ruptures</strong>
      </>
    ),
  },
  { label: "Cartes cadeaux & programme de fidélité" },
  { label: "Multi-rôles (Gérante, Réception, Praticiennes)" },
  {
    label: (
      <>
        <strong>Rapports financiers &amp; commissions</strong> collaboratrices
      </>
    ),
  },
  { label: "Support prioritaire via WhatsApp" },
];

const PREMIUM_FEATURES: { label: ReactNode }[] = [
  {
    label: (
      <>
        <strong>Rendez-vous illimités</strong> et cabines illimitées
      </>
    ),
  },
  {
    label: (
      <>
        <strong>Cockpit Multi-Sites consolidé</strong> en temps réel
      </>
    ),
  },
  { label: "Export comptable pour expert-comptable" },
  { label: "Onboarding VIP & formation de votre équipe" },
  { label: "Manager de compte dédié (Casa / Rabat / Marrakech)" },
];


export function TarifsPricingCards() {
  const [billing, setBilling] = useState<Billing>("monthly");

  const price = (id: (typeof PLANS)[number]["id"]) =>
    billing === "yearly" ? YEARLY[id] : PLANS.find((p) => p.id === id)!.price;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8" id="tarifs-grid">
      <div className="mb-10 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-line bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all sm:text-sm ${
              billing === "monthly"
                ? "bg-institut text-white shadow-sm"
                : "text-ink/55 hover:text-primary"
            }`}
          >
            Facturation Mensuelle
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all sm:text-sm ${
              billing === "yearly"
                ? "bg-institut text-white shadow-sm"
                : "text-ink/55 hover:text-primary"
            }`}
          >
            Facturation Annuelle
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                billing === "yearly" ? "bg-white/20 text-white" : "bg-primary text-white"
              }`}
            >
              2 mois offerts
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
        {/* Starter */}
        <article className="relative flex flex-col justify-between rounded-3xl border border-line bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink/45">
              Solo &amp; Praticiennes
            </span>
            <h2 className="mt-1 font-display text-3xl font-semibold text-ink">Starter</h2>
            <p className="mb-6 mt-4 text-sm leading-relaxed text-ink/55">
              Idéal pour sécuriser son agenda, éliminer les no-shows et remplacer l&apos;agenda
              papier sans complexité.
            </p>
            <div className="mb-6 border-b border-line/60 pb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tabular-nums text-ink">
                  {price("starter")}
                </span>
                <span className="text-sm font-semibold uppercase text-ink/70">MAD</span>
                <span className="text-xs font-normal text-ink/45">/ mois HT</span>
              </div>
              <p className="mt-1.5 text-[12px] text-ink/45">
                Jusqu&apos;à 150 rendez-vous / mois · 1 site
              </p>
              {billing === "yearly" ? (
                <p className="mt-1 text-[11px] font-medium text-primary">
                  Équivalent annuel · 2 mois offerts
                </p>
              ) : null}
            </div>
            <ul className="mb-8 space-y-3.5 text-sm text-ink/70">
              {STARTER_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check />
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/essai/?plan=starter"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-institut/20 py-3 px-4 text-sm font-semibold text-ink transition-all hover:bg-institut hover:text-white"
          >
            Demander l&apos;essai 14 jours
          </Link>
        </article>

        {/* Institut */}
        <article className="relative flex flex-col justify-between rounded-3xl border-2 border-gold/60 bg-institut p-8 text-white shadow-2xl transition-all duration-300 hover:shadow-[0_10px_35px_-8px_rgba(199,154,59,0.4)] lg:-translate-y-3">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-gold via-amber-300 to-gold px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-institut shadow-md">
              ★ Recommandé · Le choix des salons
            </span>
          </div>
          <div>
            <div className="mt-2 mb-4 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gold">
                  Maison de Beauté &amp; Spas
                </span>
                <h2 className="mt-1 font-display text-3xl font-semibold text-white">Institut</h2>
              </div>
              <span className="rounded-md border border-gold/30 bg-gold/20 px-2.5 py-1 text-[11px] font-medium text-gold">
                Formule Star
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-white/70">
              Le standard pour piloter l&apos;intégralité du salon : encaissement, stock et
              fidélisation.
            </p>
            <div className="mb-6 border-b border-white/10 pb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tabular-nums text-white">
                  {price("institut")}
                </span>
                <span className="text-sm font-semibold uppercase text-gold">MAD</span>
                <span className="text-xs font-normal text-white/45">/ mois HT</span>
              </div>
              <p className="mt-1.5 text-[12px] text-white/45">
                Jusqu&apos;à 300 rendez-vous / mois · 1 site · rôles équipe
              </p>
              {billing === "yearly" ? (
                <p className="mt-1 text-[11px] font-medium text-gold">
                  Équivalent annuel · 2 mois offerts
                </p>
              ) : null}
            </div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gold">
              Tout Starter inclus, plus :
            </div>
            <ul className="mb-8 space-y-3.5 text-sm text-white/85">
              {INSTITUT_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 rounded bg-gold/20 p-0.5 text-gold">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/essai/?plan=institut"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-amber-400 to-gold py-3.5 px-4 text-sm font-bold text-institut shadow-[0_10px_35px_-8px_rgba(199,154,59,0.4)] transition-all hover:from-[#b0832a] hover:to-gold"
          >
            Essayer l&apos;offre Institut sans frais
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M14 5l7 7m0 0l-7 7m7-7H3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </Link>
        </article>

        {/* Premium */}
        <article className="relative flex flex-col justify-between rounded-3xl border-2 border-primary/60 bg-white p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary">
          <div>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Cliniques &amp; Multi-Sites
                </span>
                <h2 className="mt-1 font-display text-3xl font-semibold text-ink">Premium</h2>
              </div>
              <span className="rounded-md bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
                VIP Dédié
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-ink/55">
              Pour les réseaux d&apos;instituts, franchises et établissements exigeant une vue
              globale consolidée.
            </p>
            <div className="mb-6 border-b border-line/60 pb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tabular-nums text-ink">
                  {price("premium")}
                </span>
                <span className="text-sm font-semibold uppercase text-primary">MAD</span>
                <span className="text-xs font-normal text-ink/45">/ mois HT</span>
              </div>
              <p className="mt-1.5 text-[12px] text-ink/45">
                RDV illimités · Multi-établissements · Équipe étendue
              </p>
              {billing === "yearly" ? (
                <p className="mt-1 text-[11px] font-medium text-primary">
                  Équivalent annuel · 2 mois offerts
                </p>
              ) : null}
            </div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
              Tout Institut inclus, plus :
            </div>
            <ul className="mb-8 space-y-3.5 text-sm text-ink/70">
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check />
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/demo/?plan=premium"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 px-4 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(227,28,95,0.35)] transition-all hover:bg-primary-dark"
          >
            Contacter le Concierge Premium
          </Link>
        </article>
      </div>
    </section>
  );
}
