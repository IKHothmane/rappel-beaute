import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de gestion pour institut de beauté au Maroc",
  description:
    "Découvrez comment Rappel Beauty aide les instituts de beauté au Maroc à gérer leurs rendez-vous, clientes, équipe, services, stock, caisse, fidélité et réservation en ligne.",
  alternates: {
    canonical: "/solutions/institut-beaute/",
  },
};

const CENTRAL = [
  "Rendez-vous",
  "Clientes",
  "Équipe",
  "Services",
  "Ressources",
] as const;

const PILOTAGE = ["Analytics", "Rapports", "Notifications", "Outils de suivi"] as const;

const MAROC = [
  "Les prix et la caisse sont en dirhams.",
  "Les règlements se font au comptoir de l'institut.",
  "Chaque institut a sa propre page de réservation.",
  "Les clientes paient directement l'institut.",
  "WhatsApp est assisté : le message est préparé, une personne l'envoie.",
  "Aucune photo cliente en V1.",
] as const;

const CHAPTERS = [
  {
    id: "rendez-vous",
    title: "Organisez vos rendez-vous",
    text: "La journée d'un institut se joue sur les créneaux, les durées et les personnes disponibles. L'agenda réunit les rendez-vous, les statuts et le planning de l'équipe. Le logiciel refuse un chevauchement pour la même personne ou la même cabine.",
    href: "/gestion-rendez-vous/",
    label: "Découvrir la gestion des rendez-vous",
  },
  {
    id: "clientes",
    title: "Centralisez vos clientes",
    text: "Retrouver une cliente, son historique de soins et ses notes ne devrait pas dépendre d'un cahier ou d'une conversation WhatsApp. La fiche regroupe les informations utiles au suivi, sans photo en V1.",
    href: "/gestion-clientes/",
    label: "Découvrir la gestion des clientes",
  },
  {
    id: "stock",
    title: "Gérez vos produits et votre stock",
    text: "Les produits servent aux soins et aux ventes au comptoir. Le stock suit les quantités, les achats, les fournisseurs et les mouvements, y compris ce qui est consommé pendant une prestation.",
    href: "/gestion-stock/",
    label: "Découvrir la gestion du stock",
  },
  {
    id: "caisse",
    title: "Gérez votre caisse et vos ventes",
    text: "Encaisser une prestation ou un produit, noter une dépense et retrouver la facture se fait dans la même journée de caisse. Les clientes règlent à l'institut : espèces, carte, virement, chèque ou carte cadeau.",
    href: "/caisse/",
    label: "Découvrir la gestion de la caisse",
  },
  {
    id: "fidelite",
    title: "Fidélisez vos clientes",
    text: "Le programme de points suit les paiements réellement enregistrés. Un rendez-vous annulé ou un absent ne crée pas de points tant qu'aucun règlement n'est passé. Les cartes cadeaux et les forfaits restent des outils à part.",
    href: "/fidelite/",
    label: "Découvrir la fidélité",
  },
  {
    id: "reservation",
    title: "Permettez la réservation en ligne",
    text: "Ce n'est pas une place de marché. Chaque institut publie sa page : services, durées et créneaux issus du planning. La cliente réserve auprès de l'institut, et le rendez-vous arrive dans le même agenda.",
    href: "/reservation-en-ligne/",
    label: "Découvrir la réservation en ligne",
  },
] as const;

export default function InstitutBeautePage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Solution pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Le logiciel de gestion pensé pour les instituts de beauté au Maroc
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Rappel Beauty est un logiciel de gestion pour les instituts de beauté au Maroc. Il
              réunit la journée de l&apos;institut : du rendez-vous jusqu&apos;à l&apos;encaissement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/professionnel/"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                Essayer gratuitement 7 jours
              </Link>
              <Link
                href="/tarifs/"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-primary/40"
              >
                Voir les tarifs
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink/55 sm:text-sm">
              Sans engagement · 7 jours gratuits · Sans carte bancaire
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:px-6 sm:py-20">
        <Reveal>
          <section id="en-bref" className="scroll-mt-28">
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
              Rappel Beauty en bref
            </h2>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Nom", "Rappel Beauty"],
                ["Type", "logiciel SaaS"],
                ["Marché", "Maroc"],
                ["Cible", "instituts de beauté"],
                ["Tarif", `${PUBLIC_OFFER.monthlyPrice} DH/mois`],
                ["Tarif annuel", `${formatPrice(PUBLIC_OFFER.annualPrice)} DH/an`],
                ["Essai", `${PUBLIC_OFFER.trialDays} jours gratuits`],
                ["Engagement", "aucun"],
                ["Carte bancaire", "non requise"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-white px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</dt>
                  <dd className="mt-1 text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm font-semibold text-ink">Fonctionnalités</p>
            <ul className="mt-3 grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
              {[
                "Rendez-vous",
                "Clientes",
                "Planning équipe",
                "Services",
                "Produits",
                "Stock",
                "Caisse",
                "Ventes",
                "Fidélité",
                "Réservation en ligne",
                "WhatsApp manuel assisté",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal>
          <section id="centralisee" className="scroll-mt-28 border-t border-line pt-14">
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
              Une gestion centralisée
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Un institut enchaîne les soins, les cabines et les passages en caisse. Quand
              l&apos;agenda, les fiches et les produits vivent dans des outils séparés, la journée
              se reconstruit le soir. Rappel Beauty les garde ensemble.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {CENTRAL.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        {CHAPTERS.map((chapter) => (
          <Reveal key={chapter.id}>
            <section id={chapter.id} className="scroll-mt-28 border-t border-line pt-14">
              <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">{chapter.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{chapter.text}</p>
              <p className="mt-4">
                <Link
                  href={chapter.href}
                  className="text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  {chapter.label}
                </Link>
              </p>
            </section>
          </Reveal>
        ))}

        <Reveal>
          <section id="pilotage" className="scroll-mt-28 border-t border-line pt-14">
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
              Pilotez votre activité
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Les rendez-vous, les encaissements et les stocks déjà saisis servent à suivre
              l&apos;activité. Le logiciel propose des analytics, des rapports, des notifications
              et des outils de suivi. Ils décrivent ce qui a été enregistré, sans promettre un
              résultat commercial.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {PILOTAGE.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4">
              <Link
                href="/fonctionnalites/"
                className="text-sm font-semibold text-primary hover:text-primary-dark"
              >
                Voir toutes les fonctionnalités
              </Link>
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section id="maroc" className="scroll-mt-28 border-t border-line pt-14">
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
              Un logiciel adapté au fonctionnement d&apos;un institut au Maroc
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
              Rappel Beauty est le logiciel utilisé par l&apos;institut. Ce n&apos;est pas une
              place de marché, et les clientes ne règlent pas Rappel Beauty.
            </p>
            <ul className="mt-6 space-y-2 text-sm leading-relaxed text-ink/70 sm:text-base">
              {MAROC.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </Reveal>
      </div>

      <SeoCloser
        problem="Un institut au Maroc enchaîne cabines, protocoles et passage en caisse. Quand chaque tâche a son outil, la journée ne se lit qu'à la fermeture."
        solution="Rappel Beauty est le logiciel de gestion de l'institut : agenda, clientes, stock, caisse, fidélité et page de réservation, en dirhams."
        useCase="L'institut publie sa page, reçoit une réservation, réalise le soin, encaisse au comptoir et met à jour la fiche, sans recopier le rendez-vous ailleurs."
        faqs={[
          {
            q: "Rappel Beauty est-il fait pour le Maroc ?",
            a: "Oui. Les prix et la caisse sont en dirhams, le règlement se fait à l'institut, et chaque institut a sa propre page.",
          },
          {
            q: "Est-ce une place de marché ?",
            a: "Non. C'est le logiciel utilisé par l'institut. Les clientes paient l'institut, pas Rappel Beauty.",
          },
        ]}
      />
      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">
            Essayez Rappel Beauty pendant 7 jours
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Sans engagement et sans carte bancaire.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/professionnel/"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Essayer gratuitement 7 jours
            </Link>
            <Link
              href="/tarifs/"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
