import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel institut de beauté Maroc",
  description:
    "Logiciel de gestion pour institut de beauté au Maroc : réservation, agenda, stock, caisse et clientes. Pensé pour les cabines, en MAD.",
  alternates: { canonical: "/solutions/institut-beaute/" },
};

export default function InstitutBeautePage() {
  return (
    <>
      <PageHero
        eyebrow="Solutions"
        title="Le logiciel d’institut, pas un agenda générique."
        text="Cabines, protocoles, forfaits, WhatsApp de la patronne : Rappel Beauté parle le métier, en MAD, en français, pour le Maroc."
      />
      <article className="container-rb max-w-3xl space-y-6 py-16 text-[15px] leading-relaxed text-ink/75">
        <p>
          Un institut n’est pas un cabinet médical ni un salon de coiffure
          importé. Les durées varient, les cabines se croisent, le stock part
          dans les protocoles, la cliente revient au forfait.
        </p>
        <p>
          Rappel Beauté centralise agenda, fiches, caisse et stock pour que la
          patronne ferme la journée avec des chiffres justes — pas un cahier et
          trois WhatsApp.
        </p>
        <p>
          Le logiciel couvre la journée d’un institut :{" "}
          <Link href="/gestion-rendez-vous/" className="text-primary">
            réservation et agenda
          </Link>
          ,{" "}
          <Link href="/gestion-clientes/" className="text-primary">
            fiches clientes
          </Link>
          ,{" "}
          <Link href="/gestion-stock/" className="text-primary">
            gestion de stock
          </Link>{" "}
          et{" "}
          <Link href="/fonctionnalites/#caisse" className="text-primary">
            caisse
          </Link>
          . Les prix sont en dirhams, dès 299 MAD / mois.
        </p>
      </article>
    </>
  );
}
