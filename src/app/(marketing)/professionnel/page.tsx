import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Reveal } from "@/components/www/Reveal";
import { ProfessionnelForm } from "@/components/www/ProfessionnelForm";
import { APP_LOGIN_HREF, SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Je suis un professionnel",
  description:
    "Agenda anti-chevauchement, caisse MAD, stock cabine et WhatsApp. Essai 14 jours sans carte — accès activé sous 24 h.",
};

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBSrIxf3esU3BPmabqXE0cgSVsJ4aLvcitvoh1_boJRv4DESrA7xW3ngAJcOcSrtyqzDi9-45ZPN-d52M1yxntjlHCG3oEpZQXlLtMMvrbt1FuvaZPapAzOvVnr2WFm-2mywpA2Me-any_uWSM8P1SBf73alPqZF03ShUPHeJNSoE_WEMnYbQi1tbR0GTStwtOr37llIc4mAlZ_ChT4uDu6SvALVTAqWKp-cK9oMNBg07IksAS7nTiIaQ";

const QUOTE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBMz86RbBst2uEKW0W6aJCA_J2kvT2tULe700qf0jqyT28soEeagVbEjtrA1w9rWDFCZBkBIc5VV5yHpZvLcIlikKPb5BW58fLp-Q0KwvF6ZMXJvd7kHEIHusLemKkjgT1Nn4czy-KMk7vyjeZ3hTeZcq-1Ubqun9W0JQwmFgWLnmuOaKz4lQEEngJAoyN8g-PNv4T5vvbt1FVXSBFGXDJkLKMKn7W056yAclfaa6q-uWzEyS1pihUsuA";

const REASONS = [
  {
    title: "Paramétrage humain offert sous 24h",
    text: "Notre équipe configure votre plan de cabines, durées de rituels et temps de pause entre les clientes. Prêt à l'emploi.",
    tone: "text-primary",
  },
  {
    title: "Import sécurisé de vos données actuelles",
    text: "Fichiers Excel, ancien logiciel ou carnet papier : nous intégrons l'historique et les numéros de vos clientes sans perte.",
    tone: "text-gold",
  },
  {
    title: "Concierge WhatsApp dédié 7j/7 au Maroc",
    text: "Une assistance instantanée pour vous et votre équipe, sans tickets d'attente impersonnels.",
    tone: "text-primary",
  },
] as const;

export default function ProfessionnelPage() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-full w-full scale-105 object-cover object-center"
          src={HERO_IMG}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-paper/85 via-paper/75 to-paper" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-light/40 via-transparent to-paper/90" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        {/* Header copy */}
        <Reveal className="mx-auto mb-12 flex max-w-3xl flex-col items-center gap-3 text-center sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-md">
            <span className="text-gold">★</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              Espace Professionnels &amp; Instituts
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
            Rejoignez l&apos;élite des instituts de beauté au Maroc.
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            Agenda anti-chevauchement, caisse certifiée MAD, suivi du stock cabine et relances
            WhatsApp élégantes. Démarrez votre essai 14 jours sans carte bancaire.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={APP_LOGIN_HREF}
              className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-medium text-ink shadow-sm backdrop-blur-md transition hover:bg-primary-light"
            >
              <span className="text-gold">🔒</span>
              <span>
                Déjà un compte ?{" "}
                <strong className="font-semibold text-primary">Se connecter</strong>
              </span>
            </Link>
            <Link
              href="/demo/"
              className="inline-flex items-center gap-2 rounded-xl bg-gold/20 px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-gold/40 hover:text-ink"
            >
              Demander une démo privée
            </Link>
          </div>
        </Reveal>

        {/* Grid: form + side */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <Reveal className="rounded-2xl bg-white/95 p-6 shadow-xl backdrop-blur-xl sm:p-8 lg:col-span-7">
            <Suspense
              fallback={<div className="h-96 animate-pulse rounded-xl bg-primary-light/40" />}
            >
              <ProfessionnelForm />
            </Suspense>
          </Reveal>

          <div className="flex flex-col gap-6 lg:col-span-5">
            <Reveal delay={0.08}>
              <div className="rounded-2xl bg-primary-light/80 p-6 shadow-md backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gold">
                    Confiance de l&apos;écosystème
                  </span>
                  <span className="text-gold">◆</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <span className="font-display text-3xl font-bold leading-none text-primary">
                      24+
                    </span>
                    <span className="mt-1 text-xs font-semibold text-ink">Instituts connectés</span>
                    <span className="text-[10px] text-ink/45">Casablanca, Rabat &amp; Kech</span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-display text-3xl font-bold leading-none text-gold">
                        4.9
                      </span>
                      <span className="text-gold">★</span>
                    </div>
                    <span className="mt-1 text-xs font-semibold text-ink">Note de satisfaction</span>
                    <span className="text-[10px] text-ink/45">Praticiennes &amp; Dirigeants</span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <span className="font-display text-3xl font-bold leading-none text-ink">
                      +35k
                    </span>
                    <span className="mt-1 text-xs font-semibold text-ink">Rendez-vous honorés</span>
                    <span className="text-[10px] text-ink/45">No-show divisé par 4</span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <span className="font-display text-3xl font-bold leading-none text-gold">
                      100%
                    </span>
                    <span className="mt-1 text-xs font-semibold text-ink">Caisse certifiée MAD</span>
                    <span className="text-[10px] text-ink/45">Reçus, tickets &amp; TVA</span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="flex flex-col gap-4 rounded-2xl bg-white/90 p-6 shadow-md backdrop-blur-md">
                <span className="text-lg font-bold text-ink">
                  Pourquoi nous confier votre institut ?
                </span>
                <div className="flex flex-col gap-4">
                  {REASONS.map((r) => (
                    <div key={r.title} className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light ${r.tone}`}
                      >
                        <span className="text-lg">✓</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-ink">{r.title}</span>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-between rounded-xl bg-primary-light/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold" />
                    <span className="text-[11px] font-medium text-ink/60">
                      Ligne VIP : {SITE.phone}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-primary">Casablanca</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="flex items-center gap-4 rounded-2xl bg-primary-light/50 p-4 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Directrice d'institut"
                  className="h-12 w-12 shrink-0 rounded-full object-cover shadow"
                  src={QUOTE_IMG}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs italic leading-snug text-ink">
                    « Les rappels WhatsApp ont transformé la ponctualité de notre clientèle. »
                  </p>
                  <span className="mt-1 block text-[11px] font-semibold text-gold">
                    Meryem E. — Spa Privé, Rabat
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
