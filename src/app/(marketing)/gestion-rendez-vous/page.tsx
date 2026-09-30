import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de rendez-vous pour institut de beauté",
  description:
    "Gérez les rendez-vous de votre institut de beauté avec un agenda clair, les disponibilités de votre équipe, la liste d'attente et un planning adapté à votre activité.",
  alternates: {
    canonical: "/gestion-rendez-vous/",
  },
};

const SECTIONS = [
  {
    id: "agenda",
    title: "Agenda",
    text: "Consultez la journée, les trois jours, la semaine ou le mois. Chaque rendez-vous indique la cliente, la prestation, l'employée et, si besoin, la cabine.",
  },
  {
    id: "rendez-vous",
    title: "Création et modification",
    text: "Créez un rendez-vous depuis l'institut, par téléphone ou après un message WhatsApp. Vous pouvez le modifier : horaire, prestation, employée, cabine ou note.",
  },
  {
    id: "disponibilites",
    title: "Disponibilités",
    text: "Les créneaux proposés tiennent compte de l'employée, de la durée du service et de la cabine. Un créneau déjà pris n'est pas proposé une seconde fois.",
  },
  {
    id: "planning",
    title: "Planning de l'équipe",
    text: "Voyez qui travaille, sur quelle prestation et dans quelle cabine. Le planning sert à organiser la journée de l'institut, pas seulement à noter une heure.",
  },
  {
    id: "statuts",
    title: "Statuts des rendez-vous",
    text: "Un rendez-vous passe par des statuts clairs : en attente, confirmé, arrivée, en cours, terminé, annulé ou absent. L'annulation et l'absence libèrent le créneau.",
  },
  {
    id: "attente",
    title: "Liste d'attente",
    text: "Quand une cliente souhaite un soin sans créneau libre, elle peut rejoindre la liste d'attente. Si une place se libère, l'institut prépare un message WhatsApp et l'envoie lui-même.",
  },
  {
    id: "reservation",
    title: "Réservation en ligne",
    text: "L'institut peut publier sa page pour que ses clientes choisissent un service et un créneau. Elles paient directement à l'institut, pas sur une marketplace.",
  },
  {
    id: "conflits",
    title: "Prévention des conflits",
    text: "Le logiciel refuse deux rendez-vous qui se chevauchent pour la même employée, ou pour la même cabine lorsqu'elle est assignée. Un rendez-vous annulé ou un absent ne bloque plus le créneau.",
  },
  {
    id: "institut",
    title: "Côté institut",
    text: "L'accueil voit l'agenda, crée ou ajuste les rendez-vous, suit les statuts et retrouve la cliente. La réservation en ligne alimente le même agenda.",
  },
] as const;

export default function GestionRdvPage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Agenda pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Gérez les rendez-vous de votre institut simplement
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Un agenda pour les rendez-vous, les disponibilités de l&apos;équipe, la liste
              d&apos;attente et le planning de la journée.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/essai/"
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
            </section>
          </Reveal>
        ))}

        <p className="text-sm text-ink/60">
          Les rendez-vous font partie du logiciel de gestion. Le détail des autres fonctions est
          sur la{" "}
          <Link href="/fonctionnalites/" className="font-semibold text-primary hover:text-primary-dark">
            page fonctionnalités
          </Link>
          . Les prix sont sur la{" "}
          <Link href="/tarifs/" className="font-semibold text-primary hover:text-primary-dark">
            page tarifs
          </Link>
          .
        </p>
      </div>

      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">
            Essayez Rappel Beauty pendant 7 jours
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Sans engagement et sans carte bancaire.
          </p>
          <Link
            href="/essai/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
        </div>
      </section>
    </>
  );
}
