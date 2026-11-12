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
      className="free-trial-section relative overflow-hidden bg-white px-[var(--vt-space-1rem)] py-8 sm:px-[var(--vt-space-1p5rem)]"
    >
      <div className="mx-auto max-w-[var(--vt-size-1200px)]">
        <div className="relative isolate overflow-hidden rounded-[16px] bg-gradient-to-br from-[#850039] via-vt-primary-rich to-vt-pink px-5 py-5 shadow-[0_16px_40px_rgba(120,0,55,0.14)] sm:px-6 lg:px-8 lg:py-6">
          {/* Décorations de fond */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-[var(--vt-size-0rem)]">
            <div className="absolute -left-32 -top-40 h-[var(--vt-size-24rem)] w-[var(--vt-size-24rem)] rounded-full bg-[#5b002b]/30 blur-3xl" />
            <div className="absolute -bottom-48 right-[var(--vt-size-0rem)] h-[var(--vt-size-450px)] w-[var(--vt-size-450px)] rounded-full bg-[#ff91b8]/30 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-[var(--vt-size-14rem)] w-[var(--vt-size-500px)] rotate-[-12deg] rounded-[100%] bg-white/5 blur-2xl" />
          </div>

          <div className="free-trial-grid relative z-10 grid items-center gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6">
            {/* Colonne gauche */}
            <div className="text-white">
              <div className="mb-3 flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-[0.18em]">
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

              <p className="mt-3 max-w-[var(--vt-size-36rem)] text-[0.9375rem] leading-snug text-white/90">
                Créez votre accès en quelques minutes et testez le logiciel avec vos vrais
                rendez-vous, votre équipe et vos clientes.
              </p>

              <ul className="mt-4 space-y-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <span className="flex h-[1.5rem] w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-white/15">
                      <Check aria-hidden="true" size={13} strokeWidth={2.5} />
                    </span>
                    <span className="text-[0.875rem] font-medium leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne droite */}
            <div className="relative">
              <div className="rounded-[14px] border border-white/70 bg-white p-4 shadow-[0_24px_60px_rgba(75,0,38,0.15)]">
                <div className="free-trial-card-head mb-3 flex items-center gap-[var(--vt-size-0p5rem)]">
                  <div className="flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-[0.55rem] bg-vt-surface-soft text-vt-primary-rich">
                    <CalendarDays aria-hidden="true" size={15} />
                  </div>

                  <div>
                    <span className="text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-semibold uppercase tracking-widest text-vt-primary-rich">
                      Rappel Beauty
                    </span>
                    <h3 className="mt-0.5 text-[0.95rem] font-bold leading-tight text-vt-ink-plum">Demander mon essai</h3>
                  </div>
                </div>

                <p className="free-trial-card-text mb-3 text-[0.8125rem] leading-snug text-vt-muted">
                  Renseignez les informations de votre institut. Votre essai gratuit de{" "}
                  {PUBLIC_OFFER.trialDays} jours démarre dès l’activation de votre accès.
                </p>

                <Link
                  href="/professionnel/"
                  className="free-trial-cta group flex min-h-10 items-center justify-center gap-2 rounded-xl bg-vt-primary-rich px-4 py-2 text-center text-[0.875rem] font-bold leading-tight text-white shadow-[0_8px_20px_rgba(189,0,82,0.18)] hover:bg-[#990044] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vt-primary-rich"
                >
                  Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
                  <ArrowRight
                    aria-hidden="true"
                    size={19}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[0.8125rem] leading-snug text-[#74616b]">
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
