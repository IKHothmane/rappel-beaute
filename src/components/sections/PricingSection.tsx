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
          <div className="rounded-[16px] border border-[#efd3dd] bg-white/95 p-4 shadow-[0_25px_65px_-30px_rgba(91,15,51,0.28)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-[var(--vt-space-1rem)]">
              <h3 className="pricing-plan-title font-serif text-[1.2rem] font-bold leading-tight text-[#390c27]">
                Rappel Beauty
              </h3>

              <div
                role="group"
                aria-label="Période de facturation"
                className="flex items-center rounded-xl border border-rose-100 bg-vt-surface p-0.5 text-[0.8125rem]"
              >
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  aria-pressed={!annual}
                  className={`rounded-lg px-3 py-1 font-semibold ${
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
                  className={`rounded-lg px-3 py-1 font-semibold ${
                    annual
                      ? "bg-vt-surface-pink text-vt-primary-strong shadow-sm"
                      : "text-[#6f4c5d]"
                  }`}
                >
                  Annuel
                </button>
              </div>
            </div>

            <div className="pricing-price mt-3" aria-live="polite" aria-atomic="true">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="pricing-amount font-serif text-[2rem] font-bold leading-none tracking-tight text-[#390c27]">
                  {annual ? formatPrice(annualPrice) : monthlyPrice}
                </span>
                <span className="text-[0.95rem] text-[#694557]">DH / {annual ? "an" : "mois"}</span>
              </div>

              <p className="mt-1 text-[0.8125rem] leading-snug text-[#795b6a]">
                {annual
                  ? `Facturation annuelle · ${formatPrice(PUBLIC_OFFER.annualSavings)} DH économisés par an`
                  : "Facturé chaque mois · sans engagement"}
              </p>
            </div>

            <div className="my-3 h-px bg-[#f0dbe3]" />

            <h4 className="mb-2 text-[0.95rem] font-bold leading-tight text-[#390c27]">Tout est inclus</h4>

            <div className="grid gap-x-3 gap-y-1.5 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-1.5">
                  <Check
                    aria-hidden="true"
                    size={14}
                    strokeWidth={3}
                    className="shrink-0 text-[#ce0052]"
                  />
                  <span className="text-[0.8125rem] leading-snug text-[#44293a]">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/professionnel/"
              className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-vt-primary px-4 py-2 text-center text-[0.875rem] font-bold leading-tight text-white shadow-[0_12px_25px_-12px_#c50050] hover:bg-vt-primary-strong"
            >
              Commencer l’essai gratuit
              <ArrowRight aria-hidden="true" size={15} />
            </Link>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[0.75rem] leading-snug text-vt-muted-soft">
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
              icon={<CalendarDays aria-hidden="true" size={15} />}
              title={`${PUBLIC_OFFER.trialDays} jours sur vos vrais rendez-vous`}
              description="Testez avec vos services, votre équipe et vos clientes, sans carte bancaire. L'essai ne devient pas un abonnement tant que vous ne choisissez pas une formule."
            />

            <BenefitCard
              icon={<ShieldCheck aria-hidden="true" size={15} />}
              title="Vos données restent les vôtres"
              description="Chaque institut dispose de son espace. Les accès se règlent par rôle : propriétaire, manager, praticienne, caisse et comptabilité."
            />

            <div className="rounded-[14px] border border-[#f0d8e1] bg-white/90 p-3 shadow-sm">
              <div className="pricing-info flex items-start gap-[var(--vt-size-0p5rem)]">
                <div className="pricing-info-icon flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-[0.55rem] bg-vt-surface-soft text-vt-primary">
                  <MessageCircle aria-hidden="true" size={15} />
                </div>

                <div>
                  <h3 className="font-serif text-[0.95rem] font-bold leading-tight text-[#390c27]">
                    Une question avant de vous lancer ?
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-snug text-[#765566]">
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
                  className="flex items-center gap-2 rounded-[14px] border border-white/80 bg-white/55 px-2.5 py-2 text-left"
                >
                  <Icon aria-hidden="true" size={15} className="shrink-0 text-vt-primary" />
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
    <article className="rounded-[14px] border border-[#f0d8e1] bg-white/90 p-3 shadow-sm">
      <div className="pricing-info flex items-start gap-[var(--vt-size-0p5rem)]">
        <div className="pricing-info-icon flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-[0.55rem] bg-vt-surface-soft text-vt-primary">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="font-serif text-[0.95rem] font-bold leading-tight text-[#390c27]">{title}</h3>
          <p className="mt-1 text-[0.8125rem] leading-snug text-[#765566]">{description}</p>
        </div>
      </div>
    </article>
  );
}
