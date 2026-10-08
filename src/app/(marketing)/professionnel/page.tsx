import type { Metadata } from "next";
import { ProfessionnelSignup } from "@/components/www/professionnel-signup";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Je suis un professionnel",
  description:
    "Rappel Beauty est le logiciel de gestion pour les instituts de beauté au Maroc : rendez-vous, clientes, stock, caisse et réservation en ligne. Essai 7 jours, sans engagement et sans carte bancaire.",
  alternates: { canonical: "/professionnel/" },
};

export default function ProfessionnelPage() {
  return <ProfessionnelSignup />;
}
