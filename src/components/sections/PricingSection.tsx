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
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const annual = billing === "annual";

  return (
    <section
      id="tarifs"
      aria-labelledby="pricing-heading"
      className="pricing-section relative isolate overflow-hidden bg-vt-surface px-[var(--vt-space-1p5rem)] py-[var(--vt-space-3p5rem)] lg:py-[var(--vt-space-4rem)]"
    >
      <span id="tarif" className="pricing-legacy-anchor" aria-hidden="true" />
      {/* Décoration d'arrière-plan */}

      <div className="mx-auto max-w-[var(--vt-size-72rem)]">
        {/* En-tête */}
        <div className="mb-[var(--vt-space-3p5rem)] text-center">
          <div className="mb-[var(--vt-space-1p25rem)] flex items-center justify-center gap-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-bold uppercase tracking-[0.2em] text-vt-primary">
            <span className="h-[var(--vt-size-1px)] w-[var(--vt-size-2p25rem)] bg-vt-primary" />
            Tarif
            <span className="h-[var(--vt-size-1px)] w-[var(--vt-size-2p25rem)] bg-vt-primary" />
          </div>

          <h2
            id="pricing-heading"
            className="font-serif leading-[var(--vt-leading-1p25)] tracking-tight text-[#390c27]"
          >
            Une formule simple,{" "}
            <span className="relative inline-block italic text-vt-primary">
              tout inclus
              <span className="absolute -bottom-2 left-[var(--vt-size-0rem)] h-[var(--vt-size-3px)] w-full rotate-[-2deg] rounded-full bg-vt-primary" />
            </span>
          </h2>

          <p className="mx-auto mt-[var(--vt-space-1p75rem)] max-w-[var(--vt-size-42rem)] text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] text-[#765566] sm:text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)]">
            Pas de module en option, pas de frais par praticienne. Tout pour gérer votre institut
            depuis un seul espace.
          </p>
        </div>

        <div className="pricing-grid grid items-start gap-[var(--vt-space-1p75rem)] lg:grid-cols-[1.06fr_1fr]">
          {/* Carte tarifaire */}
          <div className="rounded-[var(--vt-size-30px)] border border-[#efd3dd] bg-white/95 p-[var(--vt-space-1p75rem)] shadow-[0_25px_65px_-30px_rgba(91,15,51,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-[var(--vt-space-2p25rem)]">
            <div className="flex flex-wrap items-center justify-between gap-[var(--vt-space-1rem)]">
              <h3 className="pricing-plan-title font-serif text-[length:var(--vt-text-1p875rem)]/[var(--vt-line-2p25rem)] font-bold text-[#390c27]">
                Rappel Beauty
              </h3>

              <div
                role="group"
                aria-label="Période de facturation"
                className="flex items-center rounded-2xl border border-rose-100 bg-vt-surface p-[var(--vt-size-0p25rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)]"
              >
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  aria-pressed={!annual}
                  className={`rounded-xl px-[var(--vt-space-1rem)] py-[var(--vt-space-0p625rem)] font-semibold transition ${
                    !annual
                      ? "bg-vt-surface-pink text-vt-primary-strong shadow-sm"
                      : "text-[#6f4c5d]"
                  }`}
                >
                  Mensuel
                </button>

                <button
                  type="button"
                  onClick={() => setBilling("annual")}
                  aria-pressed={annual}
                  className={`rounded-xl px-[var(--vt-space-1rem)] py-[var(--vt-space-0p625rem)] font-semibold transition ${
                    annual
                      ? "bg-vt-surface-pink text-vt-primary-strong shadow-sm"
                      : "text-[#6f4c5d]"
                  }`}
                >
                  Annuel
                </button>
              </div>
            </div>

            <div className="pricing-price mt-[var(--vt-space-2p25rem)]" aria-live="polite" aria-atomic="true">
              <div className="flex flex-wrap items-baseline gap-[var(--vt-size-0p5rem)]">
                <span className="pricing-amount font-serif text-[clamp(2.5rem,3vw,3rem)] font-bold tracking-tight text-[#390c27]">
                  {annual ? formatPrice(annualPrice) : monthlyPrice}
                </span>
                <span className="text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)] text-[#694557]">DH / {annual ? "an" : "mois"}</span>
              </div>

              <p className="mt-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-[#795b6a]">
                {annual
                  ? `Facturation annuelle · ${formatPrice(PUBLIC_OFFER.annualSavings)} DH économisés par an`
                  : "Facturé chaque mois · sans engagement"}
              </p>
            </div>

            <div className="my-[var(--vt-space-2rem)] h-[var(--vt-size-1px)] bg-[#f0dbe3]" />

            <h4 className="mb-[var(--vt-space-1p5rem)] text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)] font-bold text-[#390c27]">Tout est inclus</h4>

            <div className="grid gap-x-[var(--vt-space-1p25rem)] gap-y-[var(--vt-space-1p25rem)] sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-[var(--vt-space-0p75rem)]">
                  <Check
                    aria-hidden="true"
                    size={19}
                    strokeWidth={3}
                    className="mt-[var(--vt-size-0p125rem)] shrink-0 text-[#ce0052]"
                  />
                  <span className="text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-6 text-[#44293a]">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/professionnel/"
              className="mt-[var(--vt-space-2p25rem)] flex min-h-[var(--vt-size-3p5rem)] items-center justify-center gap-[var(--vt-space-0p75rem)] rounded-2xl bg-vt-primary px-[var(--vt-space-1p25rem)] py-[var(--vt-space-1rem)] text-center text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-bold text-white shadow-[0_12px_25px_-12px_#c50050] transition-all duration-300 hover:-translate-y-0.5 hover:bg-vt-primary-strong hover:shadow-lg"
            >
              Commencer l’essai gratuit
              <ArrowRight aria-hidden="true" size={19} />
            </Link>

            <div className="mt-[var(--vt-space-1p25rem)] flex flex-wrap items-center justify-center gap-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-vt-muted-soft">
              <span className="flex items-center gap-[var(--vt-size-0p375rem)]">
                <Check aria-hidden="true" size={14} className="text-emerald-600" />
                Sans carte bancaire
              </span>
              <span className="flex items-center gap-[var(--vt-size-0p375rem)]">
                <ShieldCheck aria-hidden="true" size={14} className="text-emerald-600" />
                Données protégées
              </span>
            </div>
          </div>

          {/* Avantages */}
          <div className="pricing-aside flex flex-col gap-[var(--vt-space-1p25rem)]">
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

            <div className="rounded-[var(--vt-size-25px)] border border-[#f0d8e1] bg-white/90 p-[var(--vt-space-1p5rem)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-[var(--vt-space-1p75rem)]">
              <div className="pricing-info flex items-start gap-[var(--vt-space-1p25rem)]">
                <div className="pricing-info-icon flex h-[var(--vt-size-3p5rem)] w-[var(--vt-size-3p5rem)] shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary">
                  <MessageCircle aria-hidden="true" size={27} />
                </div>

                <div>
                  <h3 className="font-serif text-[length:var(--vt-text-1p25rem)]/[var(--vt-line-1p75rem)] font-bold text-[#390c27] sm:text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)]">
                    Une question avant de vous lancer ?
                  </h3>
                  <p className="mt-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-7 text-[#765566]">
                    Notre équipe vous accompagne dans la découverte de Rappel Beauty.
                  </p>

                  <Link
                    href="/contact/"
                    className="mt-[var(--vt-space-1rem)] inline-flex items-center gap-[var(--vt-size-0p5rem)] font-semibold text-vt-primary hover:underline"
                  >
                    Contactez-nous
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-[var(--vt-space-0p75rem)] pt-[var(--vt-size-0p5rem)]">
              {[
                { icon: Clock3, label: "Mise en route simple" },
                { icon: Database, label: "Espace dédié" },
                { icon: Headphones, label: "Support français" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-[var(--vt-space-0p75rem)] rounded-2xl border border-white/80 bg-white/55 px-[var(--vt-space-0p75rem)] py-[var(--vt-space-1p25rem)] text-center"
                >
                  <Icon aria-hidden="true" size={22} className="text-vt-primary" />
                  <span className="text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-medium text-[#694557]">{label}</span>
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
    <article className="group rounded-[var(--vt-size-25px)] border border-[#f0d8e1] bg-white/90 p-[var(--vt-space-1p5rem)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_-20px_rgba(100,20,60,0.3)] sm:p-[var(--vt-space-1p75rem)]">
      <div className="pricing-info flex items-start gap-[var(--vt-space-1p25rem)]">
        <div className="pricing-info-icon flex h-[var(--vt-size-3p5rem)] w-[var(--vt-size-3p5rem)] shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary transition-colors group-hover:bg-vt-line">
          {icon}
        </div>

        <div>
          <h3 className="font-serif text-[length:var(--vt-text-1p25rem)]/[var(--vt-line-1p75rem)] font-bold text-[#390c27] sm:text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)]">{title}</h3>
          <p className="mt-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-7 text-[#765566] sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">{description}</p>
        </div>
      </div>
    </article>
  );
}
