import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Réservation en ligne pour institut de beauté",
  description:
    "Permettez à vos clientes de réserver en ligne auprès de votre institut : page publique, services, tarifs, disponibilités, rendez-vous et vitrine produits avec retrait à l'institut.",
  alternates: {
    canonical: "/reservation-en-ligne/",
  },
};

const SECTIONS = [
  {
    id: "page",
    title: "Page publique de votre institut",
    text: "Chaque institut dispose de sa propre page publique de réservation : nom, coordonnées et services. C'est la vitrine de l'institut, pas une place de marché.",
  },
  {
    id: "services",
    title: "Services et tarifs",
    text: "La page affiche les prestations de l'institut, leur durée et leur tarif. Les informations viennent du catalogue que vous tenez dans le logiciel.",
  },
  {
    id: "disponibilites",
    title: "Disponibilités",
    text: "Les créneaux proposés tiennent compte du planning de l'équipe et des rendez-vous déjà pris. Un horaire occupé n'est pas proposé.",
  },
  {
    id: "prise",
    title: "Prise de rendez-vous",
    text: "La cliente choisit un service et un créneau, laisse son nom et son téléphone, puis reçoit la confirmation. Le rendez-vous est enregistré pour votre institut.",
  },
  {
    id: "agenda",
    title: "Gestion côté institut",
    text: "La réservation en ligne rejoint le même agenda que les rendez-vous pris à l'accueil. Vous la suivez depuis l'espace de gestion, avec les mêmes statuts.",
  },
  {
    id: "produits",
    title: "Produits",
    text: "L'institut peut présenter les produits qu'il vend : nom, prix et disponibilité. C'est la vitrine de votre institut.",
  },
  {
    id: "retrait",
    title: "Retrait à l'institut",
    text: "Une cliente peut demander un produit et le retirer directement auprès de votre institut. La demande n'est pas une livraison.",
  },
  {
    id: "paiement",
    title: "Paiement",
    text: "Les clientes paient directement à l'institut. Il n'y a pas de paiement en ligne : ni pour le rendez-vous, ni pour le retrait des produits. Un acompte, s'il est prévu, est aussi encaissé à l'institut.",
  },
  {
    id: "propre",
    title: "Une page propre à chaque institut",
    text: "Chaque institut a sa propre page publique. Les clientes réservent auprès de votre institut, pas sur une plateforme qui mélange plusieurs salons.",
  },
] as const;

export default function ReservationEnLignePage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Réservation en ligne pour votre institut
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Réservation en ligne pour institut de beauté
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Une page publique pour votre institut : services, tarifs, disponibilités et prise de
              rendez-vous. Les clientes paient directement à l&apos;institut.
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
              {section.id === "agenda" ? (
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
        <p className="text-sm text-ink/60">
          La formule est présentée sur la{" "}
          <Link href="/tarifs/" className="font-semibold text-primary hover:text-primary-dark">
            page tarifs
          </Link>
          .
        </p>
      </div>

      <SeoCloser
        problem="Les demandes arrivent par WhatsApp le soir, les créneaux se recouvrent, et la cliente ne sait pas si le rendez-vous est vraiment noté."
        solution="Chaque institut a sa page : services, durées et créneaux issus du planning. La réservation rejoint le même agenda. Ce n'est pas une place de marché, et le paiement reste à l'institut."
        useCase="Une cliente choisit un soin et un horaire libre le dimanche soir. Le lundi, le rendez-vous est déjà dans l'agenda de l'employée, et le créneau n'est plus proposé."
        faqs={[
          {
            q: "Est-ce une marketplace de salons ?",
            a: "Non. La page publique appartient à l'institut. Les clientes réservent auprès de lui.",
          },
          {
            q: "Peut-on payer le rendez-vous en ligne ?",
            a: "Non. Les clientes paient directement à l'institut.",
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
