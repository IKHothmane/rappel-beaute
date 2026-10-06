import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";
import { PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Tarif logiciel institut de beauté",
  description:
    "Rappel Beauty propose une formule simple à 599 DH/mois ou 5 999 DH/an pour les instituts de beauté au Maroc. 7 jours gratuits, sans engagement et sans carte bancaire.",
  alternates: {
    canonical: "/tarifs/",
  },
};

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
    text: "Utilisez le logiciel pendant 7 jours, sans carte bancaire et sans engagement.",
  },
] as const;

const FAQS = [
  {
    question: "Combien coûte Rappel Beauty ?",
    answer:
      "Rappel Beauty coûte 599 DH par mois ou 5 999 DH par an. L'essai gratuit dure 7 jours.",
  },
  {
    question: "Y a-t-il un engagement ?",
    answer: "Non. La formule est sans engagement.",
  },
  {
    question: "Dois-je renseigner une carte bancaire pour essayer ?",
    answer: "Non. L'essai gratuit de 7 jours ne nécessite pas de carte bancaire.",
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
  const price = PUBLIC_OFFER.price;
  const yearly = PUBLIC_OFFER.yearlyPrice.toLocaleString("fr-FR");
  const savings = (price * 12 - PUBLIC_OFFER.yearlyPrice).toLocaleString("fr-FR");

  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Une formule pour les instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Un logiciel complet pour votre institut à {price} DH/mois
            </h1>
            <p className="mt-5 text-lg font-semibold text-ink sm:text-xl">ou {yearly} DH / an</p>
            <p className="mt-2 text-sm text-ink/70 sm:text-base">
              Économisez {savings} DH par rapport au paiement mensuel
            </p>
            <ul className="mt-6 flex flex-col items-center gap-2 text-sm text-ink/70 sm:flex-row sm:justify-center sm:gap-6">
              <li>7 jours gratuits</li>
              <li>Sans engagement</li>
              <li>Sans carte bancaire</li>
            </ul>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/professionnel/"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                Essayer gratuitement 7 jours
              </Link>
              <Link
                href="/fonctionnalites/"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-primary/40"
              >
                Voir toutes les fonctionnalités
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-light text-ink sm:text-3xl">
              Tout est inclus
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-ink/70 sm:text-base">
              Une seule formule donne accès aux fonctions de gestion de l&apos;institut. Pas de
              niveaux d&apos;offre à comparer.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((group) => (
              <div key={group.title} className="rounded-2xl border border-line bg-white p-5">
                <h3 className="font-display text-xl font-light text-ink">{group.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-ink/70">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
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
        </div>
      </section>

      <section className="border-y border-line bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">Essai gratuit</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Testez Rappel Beauty pendant 7 jours. Aucune carte bancaire n&apos;est demandée, et
              la formule reste sans engagement.
            </p>
            <ul className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              <li className="rounded-2xl border border-line bg-paper px-4 py-5 text-sm text-ink">
                7 jours
              </li>
              <li className="rounded-2xl border border-line bg-paper px-4 py-5 text-sm text-ink">
                Aucune carte
              </li>
              <li className="rounded-2xl border border-line bg-paper px-4 py-5 text-sm text-ink">
                Sans engagement
              </li>
            </ul>
            <Link
              href="/professionnel/"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            >
              Essayer gratuitement 7 jours
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
        solution="Rappel Beauty a une formule : le logiciel de gestion complet, en dirhams, avec un essai de 7 jours sans carte bancaire."
        useCase="L'institut compare le mois et l'année, démarre l'essai, puis décide sans engagement une fois la journée réelle passée dans l'outil."
      />
      <section className="border-t border-line bg-paper px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl font-light text-ink sm:text-3xl">
            Questions sur le tarif
          </h2>
          <div className="mt-9 space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.question} className="rounded-xl border border-line bg-white px-5 py-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink">{faq.question}</summary>
                <p className="mt-3 text-sm leading-6 text-ink/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">
            Essayez Rappel Beauty pendant 7 jours
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Sans engagement et sans carte bancaire.
          </p>
          <Link
            href="/professionnel/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
        </div>
      </section>
    </>
  );
}
