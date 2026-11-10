"use client";

import { useState, type ReactNode } from "react";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";
import "./pricing-section.css";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Database,
  Headphones,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

const features = [
  "Agenda & réservation en ligne",
  "Rappels WhatsApp",
  "Caisse & paiements",
  "Produits & stock",
  "Fournisseurs & achats",
  "Carte fidélité QR",
  "Promotions & avis",
  "Analytics & assistant IA",
  "Toute l'équipe, avec rôles",
  "Support en français",
];

const monthlyPrice = PUBLIC_OFFER.monthlyPrice;
const annualPrice = PUBLIC_OFFER.annualPrice;

export default function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "annual">(
    "monthly"
  );

  const annual = billing === "annual";

  return (
    <section
      id="tarifs"
      aria-labelledby="pricing-heading"
      className="pricing-section relative isolate overflow-hidden bg-[#fff7fa] px-5 py-20 sm:px-8 lg:py-28"
    >
      <span id="tarif" className="pricing-legacy-anchor" aria-hidden="true" />
      {/* Décoration d'arrière-plan */}
      

      <div className="mx-auto max-w-6xl">
        {/* En-tête */}
        <div className="mb-14 text-center">
          <div className="mb-5 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#c50050]">
            <span className="h-px w-9 bg-[#c50050]" />
            Tarif
            <span className="h-px w-9 bg-[#c50050]" />
          </div>

          <h2 id="pricing-heading" className="font-serif text-4xl leading-tight tracking-tight text-[#390c27] sm:text-5xl lg:text-6xl">
            Une formule simple,{" "}
            <span className="relative inline-block italic text-[#c50050]">
              tout inclus
              <span className="absolute -bottom-2 left-0 h-[3px] w-full rotate-[-2deg] rounded-full bg-[#c50050]" />
            </span>
          </h2>

          <p className="mx-auto mt-7 max-w-2xl text-base text-[#765566] sm:text-lg">
            Pas de module en option, pas de frais par
            praticienne. Tout pour gérer votre institut
            depuis un seul espace.
          </p>
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[1.06fr_1fr]">
          {/* Carte tarifaire */}
          <div className="rounded-[30px] border border-[#efd3dd] bg-white/95 p-7 shadow-[0_25px_65px_-30px_rgba(91,15,51,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-serif text-3xl font-bold text-[#390c27]">
                Rappel Beauty
              </h3>

              <div role="group" aria-label="Période de facturation" className="flex items-center rounded-2xl border border-rose-100 bg-[#fff7fa] p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  aria-pressed={!annual}
                  className={`rounded-xl px-4 py-2.5 font-semibold transition ${
                    !annual
                      ? "bg-[#fce1eb] text-[#a80045] shadow-sm"
                      : "text-[#6f4c5d]"
                  }`}
                >
                  Mensuel
                </button>

                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  aria-pressed={annual}
                  className={`rounded-xl px-4 py-2.5 font-semibold transition ${
                    annual
                      ? "bg-[#fce1eb] text-[#a80045] shadow-sm"
                      : "text-[#6f4c5d]"
                  }`}
                >
                  Annuel
                </button>
              </div>
            </div>

            <div className="pricing-price mt-9" aria-live="polite" aria-atomic="true">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-serif text-6xl font-bold tracking-tight text-[#390c27] sm:text-7xl">
                  {annual
                    ? formatPrice(annualPrice)
                    : monthlyPrice}
                </span>
                <span className="text-lg text-[#694557]">
                  DH / {annual ? "an" : "mois"}
                </span>
              </div>

              <p className="mt-3 text-sm text-[#795b6a]">
                {annual
                  ? `Facturation annuelle · ${formatPrice(PUBLIC_OFFER.annualSavings)} DH économisés par an`
                  : "Facturé chaque mois · sans engagement"}
              </p>
            </div>

            <div className="my-8 h-px bg-[#f0dbe3]" />

            <h4 className="mb-6 text-lg font-bold text-[#390c27]">
              Tout est inclus
            </h4>

            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-3"
                >
                  <Check aria-hidden="true"
                    size={19}
                    strokeWidth={3}
                    className="mt-0.5 shrink-0 text-[#ce0052]"
                  />
                  <span className="text-sm leading-6 text-[#44293a]">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/professionnel/"
              className="mt-9 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#c50050] px-5 py-4 text-center text-sm font-bold text-white shadow-[0_12px_25px_-12px_#c50050] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#a90044] hover:shadow-lg"
            >
              Commencer l'essai gratuit
              <ArrowRight aria-hidden="true" size={19} />
            </Link>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#856575]">
              <span className="flex items-center gap-1.5">
                <Check aria-hidden="true" size={14} className="text-emerald-600" />
                Sans carte bancaire
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" size={14} className="text-emerald-600" />
                Données protégées
              </span>
            </div>
          </div>

          {/* Avantages */}
          <div className="flex flex-col gap-5">
            <BenefitCard
              icon={<CalendarDays aria-hidden="true" size={27} />}
              title={`${PUBLIC_OFFER.trialDays} jours sur vos vrais rendez-vous`}
              description="Testez avec vos services, votre équipe et vos clientes, sans carte bancaire. L'essai ne devient pas un abonnement tant que vous ne choisissez pas une formule."
            />

            <BenefitCard
              icon={<ShieldCheck aria-hidden="true" size={27} />}
              title="Vos données restent les vôtres"
              description="Chaque institut dispose de son espace. Les accès se règlent par rôle : propriétaire, manager, praticienne, caisse et comptabilité."
            />

            <div className="rounded-[25px] border border-[#f0d8e1] bg-white/90 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-7">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fce5ee] text-[#c50050]">
                  <MessageCircle aria-hidden="true" size={27} />
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold text-[#390c27] sm:text-2xl">
                    Une question avant de vous lancer ?
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#765566]">
                    Notre équipe vous accompagne dans la
                    découverte de Rappel Beauty.
                  </p>

                  <Link
                    href="/contact/"
                    className="mt-4 inline-flex items-center gap-2 font-semibold text-[#c50050] hover:underline"
                  >
                    Contactez-nous
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Clock3, label: "Mise en route simple" },
                { icon: Database, label: "Espace dédié" },
                { icon: Headphones, label: "Support français" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-white/80 bg-white/55 px-3 py-5 text-center"
                >
                  <Icon aria-hidden="true" size={22} className="text-[#c50050]" />
                  <span className="text-xs font-medium text-[#694557]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="group rounded-[25px] border border-[#f0d8e1] bg-white/90 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_-20px_rgba(100,20,60,0.3)] sm:p-7">
      <div className="flex items-start gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fce5ee] text-[#c50050] transition-colors group-hover:bg-[#f9d1e0]">
          {icon}
        </div>

        <div>
          <h3 className="font-serif text-xl font-bold text-[#390c27] sm:text-2xl">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#765566] sm:text-base">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}
