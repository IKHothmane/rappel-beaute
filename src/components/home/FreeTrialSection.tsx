import { ArrowRight, CalendarDays, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { PUBLIC_OFFER } from "@/lib/site";
import "./free-trial-section.css";

const benefits = [
  `${PUBLIC_OFFER.trialDays} jours gratuits, sans carte bancaire`,
  "Sans engagement",
  "Agenda, caisse, stock et fidélité inclus",
];

export default function FreeTrialSection() {
  return (
    <section
      id="essai"
      aria-labelledby="free-trial-title"
      className="free-trial-section relative overflow-hidden bg-white px-[var(--vt-space-1rem)] py-[var(--vt-space-3p5rem)] sm:px-[var(--vt-space-1p5rem)]"
    >
      <div className="mx-auto max-w-[var(--vt-size-1200px)]">
        <div className="relative isolate overflow-hidden rounded-[var(--vt-size-20px)] bg-gradient-to-br from-[#850039] via-vt-primary-rich to-vt-pink px-[var(--vt-space-1p5rem)] py-[var(--vt-space-2rem)] shadow-[0_16px_40px_rgba(120,0,55,0.14)] sm:px-[var(--vt-space-2rem)] lg:px-[var(--vt-space-2p5rem)] lg:py-[var(--vt-space-2p5rem)]">
          {/* Décorations de fond */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-[var(--vt-size-0rem)]">
            <div className="absolute -left-32 -top-40 h-[var(--vt-size-24rem)] w-[var(--vt-size-24rem)] rounded-full bg-[#5b002b]/30 blur-3xl" />
            <div className="absolute -bottom-48 right-[var(--vt-size-0rem)] h-[var(--vt-size-450px)] w-[var(--vt-size-450px)] rounded-full bg-[#ff91b8]/30 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-[var(--vt-size-14rem)] w-[var(--vt-size-500px)] rotate-[-12deg] rounded-[100%] bg-white/5 blur-2xl" />
          </div>

          <div className="free-trial-grid relative z-10 grid items-center gap-[var(--vt-space-2rem)] lg:grid-cols-[1.08fr_0.92fr] lg:gap-[var(--vt-space-2p5rem)]">
            {/* Colonne gauche */}
            <div className="text-white">
              <div className="mb-[var(--vt-space-1p75rem)] flex items-center gap-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-bold uppercase tracking-[0.18em]">
                <span className="h-[var(--vt-size-2px)] w-[var(--vt-size-2rem)] bg-white" />
                Essai gratuit
              </div>

              <h2
                id="free-trial-title"
                className="max-w-[var(--vt-size-650px)] font-serif font-semibold leading-[1.08] tracking-[-0.035em]"
              >
                Essayez Rappel Beauty
                <span className="block">dans votre institut</span>
              </h2>

              <p className="mt-[var(--vt-space-1p75rem)] max-w-[var(--vt-size-36rem)] text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] leading-8 text-white/90 sm:text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)]">
                Créez votre accès en quelques minutes et testez le logiciel avec vos vrais
                rendez-vous, votre équipe et vos clientes.
              </p>

              <ul className="mt-[var(--vt-space-2p25rem)] space-y-[var(--vt-space-1rem)]">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-[var(--vt-space-0p75rem)]">
                    <span className="flex h-[var(--vt-size-2p25rem)] w-[var(--vt-size-2p25rem)] shrink-0 items-center justify-center rounded-full bg-white/15">
                      <Check aria-hidden="true" size={18} strokeWidth={2.5} />
                    </span>
                    <span className="text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-medium sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne droite */}
            <div className="relative">
              <div className="rounded-[var(--vt-size-24px)] border border-white/70 bg-white p-[var(--vt-space-1p5rem)] shadow-[0_24px_60px_rgba(75,0,38,0.15)] transition-transform duration-500 hover:-translate-y-1 sm:p-[var(--vt-space-2p25rem)]">
                <div className="free-trial-card-head mb-[var(--vt-space-1p5rem)] flex items-center gap-[var(--vt-space-1rem)]">
                  <div className="flex h-[var(--vt-size-3p5rem)] w-[var(--vt-size-3p5rem)] shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary-rich">
                    <CalendarDays aria-hidden="true" size={26} />
                  </div>

                  <div>
                    <span className="text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-semibold uppercase tracking-widest text-vt-primary-rich">
                      Rappel Beauty
                    </span>
                    <h3 className="mt-[var(--vt-size-0p25rem)] text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)] font-bold text-vt-ink-plum">Demander mon essai</h3>
                  </div>
                </div>

                <p className="free-trial-card-text mb-[var(--vt-space-2rem)] text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] leading-7 text-vt-muted">
                  Renseignez les informations de votre institut. Votre essai gratuit de{" "}
                  {PUBLIC_OFFER.trialDays} jours démarre dès l’activation de votre accès.
                </p>

                <Link
                  href="/professionnel/"
                  className="free-trial-cta group flex min-h-[var(--vt-size-3p5rem)] items-center justify-center gap-[var(--vt-space-0p75rem)] rounded-xl bg-vt-primary-rich px-[var(--vt-space-1p25rem)] py-[var(--vt-space-1rem)] text-center text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-bold text-white shadow-[0_8px_20px_rgba(189,0,82,0.18)] transition-all duration-300 hover:bg-[#990044] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vt-primary-rich sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]"
                >
                  Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
                  <ArrowRight
                    aria-hidden="true"
                    size={19}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <div className="mt-[var(--vt-space-1p5rem)] flex items-center justify-center gap-[var(--vt-size-0p5rem)] text-center text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-[#74616b]">
                  <Sparkles
                    aria-hidden="true"
                    size={15}
                    className="shrink-0 text-vt-primary-rich"
                  />
                  <span>
                    Une question ?{" "}
                    <Link
                      href="/demo/"
                      className="font-semibold text-vt-primary-rich underline-offset-4 hover:underline"
                    >
                      Demander une démonstration
                    </Link>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reflet inférieur */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[var(--vt-size-0rem)] left-[var(--vt-size-0rem)] right-[var(--vt-size-0rem)] h-[var(--vt-size-1px)] bg-white/30"
          />
        </div>
      </div>
    </section>
  );
}
