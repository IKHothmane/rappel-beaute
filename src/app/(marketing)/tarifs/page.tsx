import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronDown, CreditCard, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/www/JsonLd";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";
import { marketingPageMetadata } from "@/lib/seo";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Tarifs Rappel Beauty – Logiciel institut de beauté au Maroc",
  description: `Rappel Beauty à ${PUBLIC_OFFER.monthlyPrice} DH/mois ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH/an. ${PUBLIC_OFFER.trialDays} jours gratuits, sans carte bancaire et sans engagement. Gérez votre institut de beauté simplement.`,
  canonical: "/tarifs/",
});

const TRUST = [
  { icon: CalendarDays, label: `${PUBLIC_OFFER.trialDays} jours gratuits` },
  { icon: CreditCard, label: "Sans carte bancaire" },
  { icon: ShieldCheck, label: "Sans engagement" },
] as const;

const PLAN_FEATURES = [
  "Toutes les fonctionnalités",
  "Support en français",
  "Mises à jour incluses",
] as const;

const GROUPS = [
  {
    title: "Gestion",
    items: ["Rendez-vous", "Clientes", "Planning équipe", "Services", "Ressources / cabines"],
  },
  {
    title: "Approvisionnement",
    items: ["Produits", "Stock", "Fournisseurs", "Achats"],
  },
  {
    title: "Finance",
    items: ["Caisse", "POS produits", "Paiements", "Dépenses", "Facturation", "Commissions"],
  },
  {
    title: "Croissance",
    items: [
      "Fidélité",
      "Promotions",
      "Cartes cadeaux",
      "Marketing",
      "Réactivation",
      "Avis",
      "WhatsApp assisté",
    ],
  },
  {
    title: "Développement",
    items: ["Réservation en ligne", "Analytics", "Rapports", "Notifications", "Assistant IA"],
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Créez votre compte",
    text: "Ouvrez l'essai et créez l'espace de votre institut.",
  },
  {
    n: "2",
    title: "Configurez votre institut",
    text: "Ajoutez vos services, votre équipe et les informations de l'institut.",
  },
  {
    n: "3",
    title: "Testez Rappel Beauty",
    text: "Utilisez le logiciel pendant 15 jours, sans carte bancaire et sans engagement.",
  },
] as const;

const FAQS = [
  {
    question: "Combien coûte Rappel Beauty ?",
    answer:
      `Rappel Beauty coûte ${PUBLIC_OFFER.monthlyPrice} DH par mois ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH par an. L'essai gratuit dure ${PUBLIC_OFFER.trialDays} jours.`,
  },
  {
    question: "Y a-t-il un engagement ?",
    answer: "Non. La formule est sans engagement.",
  },
  {
    question: "Dois-je renseigner une carte bancaire pour essayer ?",
    answer: "Non. L'essai gratuit de 15 jours ne nécessite pas de carte bancaire.",
  },
  {
    question: "Que comprend la formule ?",
    answer:
      "La formule donne accès aux fonctionnalités de gestion proposées par Rappel Beauty pour les instituts de beauté : rendez-vous, clientes, équipe, services, stock, caisse, fidélité, réservation en ligne et outils de pilotage.",
  },
  {
    question: "Les clientes paient-elles Rappel Beauty ?",
    answer:
      "Non. Rappel Beauty est le logiciel utilisé par l'institut. Les clientes règlent directement leurs prestations auprès de l'institut.",
  },
] as const;

export default function TarifsPage() {
  const price = PUBLIC_OFFER.monthlyPrice;
  const yearly = formatPrice(PUBLIC_OFFER.annualPrice);
  const savings = formatPrice(PUBLIC_OFFER.annualSavings);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
      <section className="border-b border-ink/15 bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Une formule pour les instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Un seul tarif, tout inclus
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink/70 sm:text-base">
              Toutes les fonctionnalités, en dirhams, sans option cachée. Testez{" "}
              {PUBLIC_OFFER.trialDays} jours gratuitement, sans carte bancaire et sans engagement.
            </p>
            <ul className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium text-ink/75">
              {TRUST.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5"
                >
                  <Icon size={14} className="text-primary" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
            <article className="flex h-full flex-col rounded-lg border border-line bg-white p-6 text-left sm:p-8">
              <h2 className="font-display text-2xl font-light text-ink">Mensuel</h2>
              <p className="mt-1 text-sm text-ink/60">Réglé chaque mois</p>
              <p className="mt-5 flex items-end gap-1.5">
                <span className="font-display text-5xl font-light text-ink">{price}</span>
                <span className="mb-1.5 text-sm text-ink/60">DH / mois</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-ink/75">
                    <Check size={16} strokeWidth={2.5} className="shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/professionnel/"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary-light"
              >
                Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
            <article className="relative flex h-full flex-col rounded-lg border-2 border-primary bg-white p-6 text-left sm:p-8">
              <span className="absolute -top-3 left-6 rounded bg-primary px-3 py-1 text-[11px] font-semibold text-white">
                Économisez {savings} DH
              </span>
              <h2 className="font-display text-2xl font-light text-ink">Annuel</h2>
              <p className="mt-1 text-sm text-ink/60">Réglé une fois par an</p>
              <p className="mt-5 flex items-end gap-1.5">
                <span className="font-display text-5xl font-light text-primary">{yearly}</span>
                <span className="mb-1.5 text-sm text-ink/60">DH / an</span>
              </p>
              <p className="mt-2 text-xs text-ink/60">
                au lieu de {formatPrice(price * 12)} DH en 12 mensualités
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-ink/75">
                    <Check size={16} strokeWidth={2.5} className="shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/professionnel/"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </div>
          <p className="mt-6 text-center text-xs text-ink/55">
            Les deux formules donnent accès exactement aux mêmes fonctionnalités.
          </p>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-light text-ink sm:text-3xl">
              Ce qui est inclus
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-ink/70 sm:text-base">
              Une seule formule donne accès aux fonctions de gestion de l&apos;institut. Pas de
              niveaux d&apos;offre à comparer.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((group) => (
              <div key={group.title} className="rounded-lg border border-line bg-white p-5">
                <h3 className="font-display text-xl font-light text-ink">{group.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-ink/70">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check size={14} strokeWidth={2.5} className="shrink-0 text-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link
              href="/fonctionnalites/"
              className="text-sm font-semibold text-primary hover:text-primary-dark"
            >
              Voir toutes les fonctionnalités
            </Link>
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-ink/70">
            <li>
              <Link href="/gestion-rendez-vous/" className="hover:text-primary">
                Agenda
              </Link>
            </li>
            <li>
              <Link href="/gestion-clientes/" className="hover:text-primary">
                Clientes
              </Link>
            </li>
            <li>
              <Link href="/gestion-stock/" className="hover:text-primary">
                Stock
              </Link>
            </li>
            <li>
              <Link href="/caisse/" className="hover:text-primary">
                Caisse
              </Link>
            </li>
            <li>
              <Link href="/fidelite/" className="hover:text-primary">
                Fidélité
              </Link>
            </li>
            <li>
              <Link href="/reservation-en-ligne/" className="hover:text-primary">
                Réservation en ligne
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="border-y border-line bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">Essai gratuit</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Testez Rappel Beauty pendant 15 jours. Aucune carte bancaire n&apos;est demandée, et
              la formule reste sans engagement.
            </p>
            <ul className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              <li className="rounded-lg border border-line bg-paper px-4 py-5 text-sm text-ink">
                15 jours
              </li>
              <li className="rounded-lg border border-line bg-paper px-4 py-5 text-sm text-ink">
                Aucune carte
              </li>
              <li className="rounded-lg border border-line bg-paper px-4 py-5 text-sm text-ink">
                Sans engagement
              </li>
            </ul>
            <Link
              href="/professionnel/"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Essayer gratuitement 15 jours
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl font-light text-ink sm:text-3xl">
            Comment ça marche
          </h2>
          <ol className="mt-10 space-y-8">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-display text-xl font-light text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70 sm:text-base">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SeoCloser
        problem="Le prix d'un logiciel d'institut est souvent découpé en options : l'agenda d'un côté, la caisse de l'autre, le stock en supplément."
        solution="Rappel Beauty a une formule : le logiciel de gestion complet, en dirhams, avec un essai de 15 jours sans carte bancaire."
        useCase="L'institut compare le mois et l'année, démarre l'essai, puis décide sans engagement une fois la journée réelle passée dans l'outil."
      />
      <section className="border-t border-line bg-paper px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl font-light text-ink sm:text-3xl">
            Questions sur le tarif
          </h2>
          <div className="mt-9 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-line bg-white px-5 py-4 transition open:border-primary/30 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-primary transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-sm leading-6 text-ink/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">
            Essayez Rappel Beauty pendant 15 jours
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Sans engagement et sans carte bancaire.
          </p>
          <Link
            href="/professionnel/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Essayer gratuitement 15 jours
          </Link>
        </div>
      </section>
    </>
  );
}
