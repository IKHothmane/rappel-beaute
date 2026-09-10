import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { TarifsPricingCards } from "@/components/www/TarifsPricingCards";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Tarifs & Abonnements",
  description:
    "Starter 299, Institut 499, Premium 899 MAD / mois. Essai 14 jours sans carte bancaire — activation sous 24 h.",
};

const WA_HREF = `https://wa.me/${SITE.phone.replace(/\D/g, "")}`;

const METRICS = [
  { value: "24+", label: "Instituts connectés (Casa, Rabat, Marrakech)", tone: "text-primary" },
  { value: "4.9 / 5", label: "Note moyenne gérantes d'instituts", tone: "text-ink" },
  { value: "+35 000", label: "Rendez-vous planifiés avec succès", tone: "text-gold" },
  { value: "100%", label: "Conformité CNDP Loi 09-08 Maroc", tone: "text-emerald-700" },
] as const;

const FAQ = [
  {
    q: "Pourquoi tous les tarifs sont-ils indiqués en Dirhams (MAD) ?",
    a: "Rappel Beauté est une solution conçue pour le marché marocain. Vous êtes facturés en Dirhams, sans frais de change bancaire ni commission internationale imprévue.",
  },
  {
    q: "Ai-je besoin de fournir une carte bancaire pour les 14 jours d'essai ?",
    a: "Non. Vous activez l'essai sans carte. À la fin des 14 jours, si l'expérience vous satisfait, vous choisissez votre formule et réglez par virement ou carte marocaine.",
  },
  {
    q: "Comment fonctionne l'assistant WhatsApp sans risque de blocage ?",
    a: "Le système prépare un lien wa.me avec le message. Vous envoyez depuis votre WhatsApp Business habituel : aucun bot, aucun risque de bannissement Meta, aucun coût SMS.",
  },
  {
    q: "Puis-je changer d'offre ou annuler mon abonnement facilement ?",
    a: "Oui. Les abonnements mensuels sont sans engagement. Vous pouvez passer de Starter à Institut à tout moment, ou stopper sur simple demande avant le mois suivant.",
  },
] as const;

function CellCheck({ label }: { label: string }) {
  return <span className="text-emerald-600">{label}</span>;
}

function CellDash() {
  return <span className="text-ink/30">—</span>;
}

export default function TarifsPage() {
  return (
    <div className="bg-mesh-subtle">
      {/* Hero */}
      <section className="relative px-4 pb-14 pt-16 text-center sm:px-6 md:pb-20 md:pt-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Transparence &amp; Rigueur Financière en Dirhams (MAD)
            </div>
            <h1 className="mb-6 font-display text-4xl font-semibold leading-[1.15] text-ink sm:text-5xl lg:text-6xl">
              Trois formules claires en MAD,{" "}
              <br className="hidden sm:inline" />
              <span className="font-normal italic text-primary">
                sans frais cachés ni engagement.
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed text-ink/55 sm:text-xl">
              14 jours d&apos;essai complet offerts, sans carte bancaire requise. Configuration et
              accompagnement sous 24h pour votre salon ou institut de beauté.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-ink/55 sm:text-sm">
              {[
                "Sans engagement de durée",
                "Conformité fiscale marocaine (Clôture Z)",
                "Support WhatsApp VIP 7j/7",
              ].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <TarifsPricingCards />

      {/* Metrics */}
      <section className="border-y border-line/70 bg-white/70 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              {METRICS.map((m) => (
                <div key={m.label}>
                  <div className={`font-display text-3xl font-semibold sm:text-4xl ${m.tone}`}>
                    {m.value}
                  </div>
                  <div className="mt-1 text-xs font-medium text-ink/55 sm:text-sm">{m.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto mb-14 max-w-3xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-gold">
            Comparatif Exclusif
          </span>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Toutes les fonctionnalités au peigne fin
          </h2>
          <p className="mt-3 text-sm text-ink/55 sm:text-base">
            Comparez en détail ce qui fait de {SITE.name} la référence des salons.
          </p>
        </Reveal>

        <Reveal>
          <div className="overflow-x-auto rounded-3xl border border-line bg-white shadow-soft">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-[#faf3f5]">
                  <th className="p-5 font-display text-lg text-ink">Capacités Clés</th>
                  <th className="w-1/4 p-5 text-center text-sm font-bold text-ink">Starter</th>
                  <th className="w-1/4 bg-institut/5 p-5 text-center text-sm font-bold text-gold">
                    Institut
                  </th>
                  <th className="w-1/4 p-5 text-center text-sm font-bold text-primary">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-sm">
                <tr className="bg-paper/80">
                  <td
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ink/55"
                    colSpan={4}
                  >
                    Agenda &amp; Prise de Rendez-vous
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">Rendez-vous mensuels</td>
                  <td className="px-5 py-4 text-center text-ink/55">150 max</td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center font-semibold text-ink">
                    300 inclus
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-primary">Illimité</td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">Sites &amp; équipe</td>
                  <td className="px-5 py-4 text-center text-ink/55">1 site · 1 gérante</td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center font-semibold text-ink">
                    1 site · rôles équipe
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-primary">Multi-sites</td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">
                    Rappels WhatsApp wa.me sans blocage
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellCheck label="✓ Inclus" />
                  </td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center">
                    <CellCheck label="✓ Inclus" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellCheck label="✓ Prioritaire" />
                  </td>
                </tr>

                <tr className="bg-paper/80">
                  <td
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ink/55"
                    colSpan={4}
                  >
                    Caisse, Clôture Z &amp; Finance
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">
                    Caisse &amp; encaissement multi-moyens
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellDash />
                  </td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center">
                    <CellCheck label="✓ Oui" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellCheck label="✓ Multi-caisses" />
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">
                    Clôture journalière Ticket Z inaltérable
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellDash />
                  </td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center">
                    <CellCheck label="✓ Inclus" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellCheck label="✓ Export comptable" />
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">
                    Calcul des commissions praticiennes
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellDash />
                  </td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center">
                    <CellCheck label="✓ Automatique" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellCheck label="✓ Règles sur-mesure" />
                  </td>
                </tr>

                <tr className="bg-paper/80">
                  <td
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ink/55"
                    colSpan={4}
                  >
                    Stock, Multi-sites &amp; Accompagnement
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">
                    Inventaire cabine &amp; vente produit
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellDash />
                  </td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center">
                    <CellCheck label="✓ Inclus" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellCheck label="✓ Multi-stocks" />
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">
                    Gestion Multi-Salons consolidée
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellDash />
                  </td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center">
                    <CellDash />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <CellCheck label="✓ Tableau de bord Groupe" />
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-4 font-medium text-ink">Formation de l&apos;équipe</td>
                  <td className="px-5 py-4 text-center text-ink/55">Guides &amp; vidéos</td>
                  <td className="bg-institut/[0.02] px-5 py-4 text-center text-ink">
                    1h visio dédiée
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-primary">
                    Onboarding dédié
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-transparent to-primary-light/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Retours d&apos;Expérience
            </span>
            <h2 className="mt-1 font-display text-3xl font-semibold text-ink">
              Adopté par les plus beaux salons du Royaume
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Reveal>
              <div className="relative rounded-3xl border border-line/70 bg-white p-8 shadow-sm">
                <div className="mb-4 flex items-center gap-1 text-amber-400">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="mb-6 italic leading-relaxed text-ink/65">
                  « Depuis que nous sommes passées sur la formule Institut, finies les erreurs de
                  caisse en fin de journée et les oublis de clientes. Le rappel WhatsApp manuel via
                  wa.me est d&apos;une simplicité royale. »
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light font-display text-lg font-bold text-primary">
                    SB
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Salima Benjelloun</h4>
                    <p className="text-xs text-ink/55">
                      Fondatrice de « Maison de Beauté Anfa » · Casablanca
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="relative rounded-3xl border border-line/70 bg-white p-8 shadow-sm">
                <div className="mb-4 flex items-center gap-1 text-amber-400">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="mb-6 italic leading-relaxed text-ink/65">
                  « Nous gérons 2 établissements entre Rabat Souissi et Marrakech Guéliz. L&apos;offre
                  Premium nous permet de suivre les chiffres en temps réel. Le support est ultra
                  réactif. »
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FBF5E9] font-display text-lg font-bold text-gold">
                    YE
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Yasmine El Alami</h4>
                    <p className="text-xs text-ink/55">
                      Gérante des Spas « L&apos;Écrin Privé » · Rabat &amp; Marrakech
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mb-12 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-ink/45">
            Des questions claires
          </span>
          <h2 className="mt-1 font-display text-3xl font-semibold text-ink">
            Foire aux Questions
          </h2>
        </Reveal>
        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.04}>
              <details className="group cursor-pointer rounded-2xl border border-line bg-white p-6 shadow-sm transition-all">
                <summary className="flex list-none items-center justify-between font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span className="transition group-open:rotate-180">
                    <svg
                      className="h-5 w-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        d="M19 9l-7 7-7-7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-ink/55">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-institut p-8 text-white shadow-2xl sm:p-14">
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gold">
                Activation sous 24h
              </span>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">
                Offrez à votre institut la sérénité qu&apos;il mérite.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base font-light text-white/70 sm:text-lg">
                Testez l&apos;application gratuitement pendant 14 jours. Notre équipe configure vos
                cabines et prestations pour vous.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/essai/"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-8 py-4 text-sm font-bold text-white shadow-[0_10px_40px_-10px_rgba(227,28,95,0.35)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark sm:w-auto"
                >
                  Démarrer l&apos;essai 14 jours gratuit
                </Link>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/15 sm:w-auto"
                >
                  <svg
                    className="h-4 w-4 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  Échanger sur WhatsApp
                </a>
              </div>
              <p className="mt-4 text-xs text-white/45">
                Sans engagement · Déploiement sans interruption de votre activité
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
