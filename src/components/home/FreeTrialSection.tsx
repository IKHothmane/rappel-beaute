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
      className="free-trial-section relative overflow-hidden bg-white px-4 py-14 sm:px-6"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="relative isolate overflow-hidden rounded-[20px] bg-gradient-to-br from-[#850039] via-vt-primary-rich to-vt-pink px-6 py-8 shadow-[0_16px_40px_rgba(120,0,55,0.14)] sm:px-8 lg:px-10 lg:py-10">
          {/* Décorations de fond */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-[#5b002b]/30 blur-3xl" />
            <div className="absolute -bottom-48 right-0 h-[450px] w-[450px] rounded-full bg-[#ff91b8]/30 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-56 w-[500px] rotate-[-12deg] rounded-[100%] bg-white/5 blur-2xl" />
          </div>

          <div className="free-trial-grid relative z-10 grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
            {/* Colonne gauche */}
            <div className="text-white">
              <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em]">
                <span className="h-[2px] w-8 bg-white" />
                Essai gratuit
              </div>

              <h2
                id="free-trial-title"
                className="max-w-[650px] font-serif font-semibold leading-[1.08] tracking-[-0.035em]"
              >
                Essayez Rappel Beauty
                <span className="block">dans votre institut</span>
              </h2>

              <p className="mt-7 max-w-xl text-base leading-8 text-white/90 sm:text-lg">
                Créez votre accès en quelques minutes et testez le logiciel avec vos vrais
                rendez-vous, votre équipe et vos clientes.
              </p>

              <ul className="mt-9 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                      <Check aria-hidden="true" size={18} strokeWidth={2.5} />
                    </span>
                    <span className="text-sm font-medium sm:text-base">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne droite */}
            <div className="relative">
              <div className="rounded-[24px] border border-white/70 bg-white p-6 shadow-[0_24px_60px_rgba(75,0,38,0.15)] transition-transform duration-500 hover:-translate-y-1 sm:p-9">
                <div className="free-trial-card-head mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary-rich">
                    <CalendarDays aria-hidden="true" size={26} />
                  </div>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-vt-primary-rich">
                      Rappel Beauty
                    </span>
                    <h3 className="mt-1 text-2xl font-bold text-vt-ink-plum">Demander mon essai</h3>
                  </div>
                </div>

                <p className="free-trial-card-text mb-8 text-base leading-7 text-vt-muted">
                  Renseignez les informations de votre institut. Votre essai gratuit de{" "}
                  {PUBLIC_OFFER.trialDays} jours démarre dès l’activation de votre accès.
                </p>

                <Link
                  href="/professionnel/"
                  className="free-trial-cta group flex min-h-14 items-center justify-center gap-3 rounded-xl bg-vt-primary-rich px-5 py-4 text-center text-sm font-bold text-white shadow-[0_8px_20px_rgba(189,0,82,0.18)] transition-all duration-300 hover:bg-[#990044] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vt-primary-rich sm:text-base"
                >
                  Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
                  <ArrowRight
                    aria-hidden="true"
                    size={19}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <div className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-[#74616b]">
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
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-white/30"
          />
        </div>
      </div>
    </section>
  );
}
