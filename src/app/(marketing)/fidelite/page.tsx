import { marketingPageMetadata } from "@/lib/seo";
import { LoyaltyLanding } from "@/components/loyalty/LoyaltyLanding";
import "./fidelite.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Logiciel de fidélité pour institut de beauté · Rappel Beauty",
  description:
    "Fidélisez vos clientes : programme, avantages et historique, reliés aux rendez-vous et aux ventes.",
  canonical: "/fidelite/",
});

const SECTIONS = [
  {
    id: "programme",
    title: "Programme de fidélité",
    text: "L'institut active son programme et définit comment les points sont attribués. Les avantages prévus peuvent être une remise ou une prestation offerte.",
  },
  {
    id: "avantages",
    title: "Suivi des avantages",
    text: "Chaque cliente a un solde de points et un niveau. Elle peut utiliser ses points pour un avantage prévu par l'institut, lorsque le solde le permet.",
  },
  {
    id: "historique",
    title: "Historique de fidélité",
    text: "Les gains, les utilisations, les ajustements et les expirations restent rattachés à la cliente. L'historique ne se résume pas à un total.",
  },
  {
    id: "fiche",
    title: "Clientes et fidélité",
    text: "La fiche cliente montre le solde, le niveau et les derniers mouvements. Le statut fidélité se consulte au même endroit que l'historique des soins.",
  },
  {
    id: "rendez-vous",
    title: "Rendez-vous et prestations",
    text: "La fidélité suit l'activité réellement encaissée. Un rendez-vous annulé ou un absent ne crée pas de points tant qu'aucun paiement n'est enregistré.",
  },
  {
    id: "ventes",
    title: "Ventes et fidélité",
    text: "Les paiements des prestations et des produits vendus au comptoir alimentent les points, selon les règles du programme. Un remboursement retire les points correspondants.",
  },
  {
    id: "offres",
    title: "Cartes cadeaux et forfaits",
    text: "Les cartes cadeaux et les forfaits sont des outils à part : une carte a un solde utilisable au règlement, un forfait suit les séances restantes. Ils apparaissent sur la fiche, à côté du programme de points.",
  },
  {
    id: "institut",
    title: "Suivi côté institut",
    text: "Consultez les avantages, suivez leur utilisation et ajustez le programme : règle d'attribution, niveaux et récompenses actives.",
  },
  {
    id: "relation",
    title: "Une expérience plus personnalisée",
    text: "La fiche réunit visites, notes et fidélité. L'institut s'appuie sur ces informations pour suivre la relation avec chaque cliente.",
  },
] as const;

export default function FidelitePage() {
  return <LoyaltyLanding sections={SECTIONS} />;
}
