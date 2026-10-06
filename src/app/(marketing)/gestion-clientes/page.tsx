import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de gestion des clientes pour institut de beauté",
  description:
    "Centralisez les informations et l’historique de vos clientes dans Rappel Beauty : fiches clientes, rendez-vous, prestations, fidélité et suivi de la relation client.",
  alternates: {
    canonical: "/gestion-clientes/",
  },
};

const SECTIONS = [
  {
    id: "fiches",
    title: "Fiches clientes",
    text: "Chaque cliente a une fiche : nom, téléphone, e-mail, date de naissance, adresse et notes utiles à l'institut. Aucune photo cliente n'est stockée en V1.",
  },
  {
    id: "historique",
    title: "Historique des rendez-vous",
    text: "La fiche conserve les rendez-vous passés, la prestation réalisée, l'employée et le statut. Vous suivez la relation à partir de ce qui s'est vraiment passé à l'institut.",
  },
  {
    id: "prestations",
    title: "Prestations et habitudes",
    text: "Les services déjà réalisés restent liés à la cliente. Les notes et les préférences de contact (WhatsApp, e-mail, SMS) permettent de retrouver ce qui compte pour elle, sans album photo.",
  },
  {
    id: "relation",
    title: "Suivi de la relation cliente",
    text: "L'institut distingue les clientes actives, nouvelles, peu venues récemment ou à relancer. Après une prestation, le suivi reste dans la même fiche.",
  },
  {
    id: "fidelite",
    title: "Fidélité",
    text: "Le programme de fidélité enregistre les points gagnés, utilisés ou ajustés, le niveau de la cliente et les avantages prévus par l'institut, comme une remise ou une prestation offerte. Les forfaits en cours apparaissent aussi sur la fiche.",
  },
  {
    id: "reactivation",
    title: "Réactivation",
    text: "Repérez les clientes à recontacter et préparez une campagne de réactivation. Le message WhatsApp est préparé par le logiciel, puis envoyé par une personne de l'institut.",
  },
  {
    id: "rendez-vous",
    title: "Rendez-vous et réservation",
    text: "Un rendez-vous, qu'il soit pris à l'accueil ou en ligne, est rattaché à la fiche. La réservation en ligne n'ouvre pas un autre fichier clientes.",
  },
  {
    id: "communication",
    title: "Communication",
    text: "Préparez les rappels et les messages WhatsApp depuis la relation avec la cliente. L'envoi reste assisté, et les accords de contact sont visibles sur la fiche.",
  },
  {
    id: "institut",
    title: "Côté institut",
    text: "Retrouvez une cliente par son nom, son téléphone ou son e-mail, ouvrez son historique et voyez où en est sa relation avec l'institut.",
  },
] as const;

export default function GestionClientesPage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Clientes pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Gestion des clientes d&apos;un institut de beauté
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Fiches, historique de rendez-vous, prestations, fidélité et suivi de la relation,
              dans le logiciel de l&apos;institut.
            </p>
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
            <p className="mt-4 text-xs text-ink/55 sm:text-sm">
              Sans engagement · 7 jours gratuits · Sans carte bancaire
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:px-6 sm:py-20">
        {SECTIONS.map((section, index) => (
          <Reveal key={section.id}>
            <section
              id={section.id}
              className={`scroll-mt-28 ${index === 0 ? "" : "border-t border-line pt-14"}`}
            >
              <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">{section.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{section.text}</p>
              {section.id === "fidelite" ? (
                <p className="mt-4">
                  <Link
                    href="/fidelite/"
                    className="text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    Découvrir la fidélité
                  </Link>
                </p>
              ) : null}
              {section.id === "rendez-vous" ? (
                <p className="mt-4">
                  <Link
                    href="/gestion-rendez-vous/"
                    className="text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    Découvrir la gestion des rendez-vous
                  </Link>
                </p>
              ) : null}
            </section>
          </Reveal>
        ))}
      </div>

      <SeoCloser
        problem="Le numéro est dans un téléphone, le dernier soin dans un cahier, et la préférence de la cliente dans une conversation WhatsApp. À l'accueil, on recommence l'histoire."
        solution="La fiche réunit identité, rendez-vous, notes, fidélité et accords de contact. Aucune photo cliente n'est stockée. La réservation en ligne alimente la même fiche."
        useCase="Une cliente revient trois mois plus tard. L'accueil retrouve son téléphone, le dernier protocole et son solde de points avant de proposer le créneau."
        faqs={[
          {
            q: "Les photos des clientes sont-elles enregistrées ?",
            a: "Non. En V1, la fiche reste textuelle : identité, historique, notes et fidélité.",
          },
          {
            q: "Une réservation en ligne crée-t-elle une autre liste de clientes ?",
            a: "Non. Le rendez-vous pris en ligne est rattaché à la fiche de l'institut.",
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
