import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { ProfessionnelForm } from "@/components/www/ProfessionnelForm";
import { SitePhone } from "@/components/www/SitePhone";
import { APP_LOGIN_HREF, formatPrice, PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Je suis un professionnel",
  description:
    "Rappel Beauty est le logiciel de gestion pour les instituts de beauté au Maroc : rendez-vous, clientes, stock, caisse et réservation en ligne. Essai 7 jours, sans engagement et sans carte bancaire.",
  alternates: { canonical: "/professionnel/" },
};

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBSrIxf3esU3BPmabqXE0cgSVsJ4aLvcitvoh1_boJRv4DESrA7xW3ngAJcOcSrtyqzDi9-45ZPN-d52M1yxntjlHCG3oEpZQXlLtMMvrbt1FuvaZPapAzOvVnr2WFm-2mywpA2Me-any_uWSM8P1SBf73alPqZF03ShUPHeJNSoE_WEMnYbQi1tbR0GTStwtOr37llIc4mAlZ_ChT4uDu6SvALVTAqWKp-cK9oMNBg07IksAS7nTiIaQ";

const REASONS = [
  {
    title: "Rendez-vous et planning",
    text: "Agenda, disponibilités de l'équipe, statuts et refus des créneaux qui se chevauchent pour une même personne ou une cabine.",
    tone: "text-primary",
  },
  {
    title: "Réduisez les oublis et facilitez le suivi des rendez-vous",
    text: "Rappels préparés, suivi des rendez-vous, liste d'attente et réservation en ligne. WhatsApp reste assisté : le logiciel prépare le message, l'institut l'envoie.",
    tone: "text-gold",
  },
  {
    title: "Clientes, stock, caisse et fidélité",
    text: "Fiches clientes, services, cabines, produits, encaissements à l'institut, fidélité et outils de pilotage.",
    tone: "text-primary",
  },
] as const;

export default function ProfessionnelPage({
  heading = "Le logiciel de gestion pour les instituts de beauté au Maroc.",
}: {
  heading?: string;
}) {
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
            {heading}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            Rendez-vous, planning, clientes, stock, caisse, fidélité et réservation en ligne.
            {PUBLIC_OFFER.monthlyPrice} DH/mois ou {formatPrice(PUBLIC_OFFER.annualPrice)} DH/an.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#inscription"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            >
              Essayer gratuitement 7 jours
            </Link>
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
          </div>
        </Reveal>

        {/* Grid: form + side */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <Reveal id="inscription" className="rounded-2xl bg-white/95 p-6 shadow-xl backdrop-blur-xl sm:p-8 lg:col-span-7">
            <ProfessionnelForm />
          </Reveal>

          <div className="flex flex-col gap-6 lg:col-span-5">
            <Reveal delay={0.08}>
              <div className="rounded-2xl bg-primary-light/80 p-6 shadow-md backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gold">
                    La formule
                  </span>
                  <span className="text-gold">◆</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <span className="font-display text-3xl font-bold leading-none text-primary">
                      {PUBLIC_OFFER.monthlyPrice}
                    </span>
                    <span className="mt-1 text-xs font-semibold text-ink">DH / mois</span>
                    <span className="text-[10px] text-ink/45">Formule unique</span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <span className="font-display text-3xl font-bold leading-none text-gold">
                      {formatPrice(PUBLIC_OFFER.annualPrice)}
                    </span>
                    <span className="mt-1 text-xs font-semibold text-ink">DH / an</span>
                    <span className="text-[10px] text-ink/45">
                      Économisez{" "}
                      {formatPrice(PUBLIC_OFFER.annualSavings)} DH
                    </span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <span className="font-display text-3xl font-bold leading-none text-ink">
                      {PUBLIC_OFFER.trialDays} jours
                    </span>
                    <span className="mt-1 text-xs font-semibold text-ink">Essai gratuit</span>
                    <span className="text-[10px] text-ink/45">Sans engagement</span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm">
                    <span className="font-display text-2xl font-bold leading-none text-gold">
                      Sans carte
                    </span>
                    <span className="mt-1 text-xs font-semibold text-ink">Pour commencer</span>
                    <span className="text-[10px] text-ink/45">Aucune carte bancaire</span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="flex flex-col gap-4 rounded-2xl bg-white/90 p-6 shadow-md backdrop-blur-md">
                <span className="text-lg font-bold text-ink">Ce que vous pouvez gérer</span>
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
                  <SitePhone className="text-[11px] font-medium text-ink/60" iconClassName="h-3.5 w-3.5 shrink-0 text-primary" />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="rounded-2xl bg-primary-light/50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-ink">Réservation en ligne</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">
                  Chaque institut peut publier sa page. Les clientes réservent auprès de
                  l&apos;institut et règlent sur place.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
