import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de réservation et agenda institut beauté",
  description:
    "Logiciel de réservation pour institut de beauté : agenda des cabines, sans double réservation, rappels WhatsApp manuels.",
  alternates: { canonical: "/gestion-rendez-vous/" },
};

export default function GestionRdvPage() {
  return (
    <>
      <PageHero
        eyebrow="Agenda"
        title="Des rendez-vous qui ne se marchent pas dessus."
        text="Employées et cabines protégées par une contrainte EXCLUDE PostgreSQL. Le logiciel refuse le chevauchement — même si deux personnes cliquent ensemble."
      />
      <article className="container-rb max-w-3xl space-y-6 py-16 text-[15px] leading-relaxed text-ink/75">
        <p>
          La double-réservation n’est pas un « message d’erreur ». C’est une
          contrainte de base de données. Deux RDV sur la même employée, au même
          créneau, ne peuvent pas exister.
        </p>
        <p>
          Confirmations et rappels : WhatsApp manuel assisté. Rappel Beauté
          prépare le texte, vous envoyez, vous marquez. Aucun bot.
        </p>
        <p>
          Quotas : Starter 150 RDV / mois, Institut 300, Premium illimité.
        </p>
      </article>
    </>
  );
}
