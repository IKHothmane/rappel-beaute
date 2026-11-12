import Image from "next/image";
import {
  Bell,
  Boxes,
  CircleDollarSign,
  Layers,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Zap,
} from "lucide-react";
import { ShowcaseLanding } from "@/components/www/ShowcaseLanding";
import { marketingPageMetadata } from "@/lib/seo";
import "../showcase-landing.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Logiciel de stock pour institut beauté | Rappel Beauty",
  description:
    "Gérez les produits et le stock de votre institut de beauté : catalogue, quantités, alertes, achats, fournisseurs et consommations en cabine.",
  canonical: "/gestion-stock/",
});

const FEATURES = [
  { icon: Package, title: "Catalogue produits", text: "Ajoutez et organisez vos produits." },
  { icon: Layers, title: "Suivi du stock", text: "Quantités en temps réel par produit." },
  { icon: Bell, title: "Alertes de rupture", text: "Soyez prévenu avant de manquer en cabine." },
  {
    icon: ShoppingCart,
    title: "Achats et fournisseurs",
    text: "Enregistrez vos achats et vos fournisseurs.",
  },
  { icon: Boxes, title: "Consommation", text: "Suivez les produits utilisés par prestation." },
  {
    icon: CircleDollarSign,
    title: "Valorisation du stock",
    text: "Connaissez la valeur de votre stock.",
  },
];

const CHECKS = [
  "Meilleure organisation des achats",
  "Suivi précis des consommations",
  "Contrôle des coûts et de la rentabilité",
  "Gain de temps au quotidien",
  "Historique complet des mouvements",
];

const METRICS = [
  { icon: Zap, title: "Mise à jour instantanée", text: "À chaque entrée ou sortie" },
  { icon: ShieldCheck, title: "Stock sécurisé", text: "Historique et traçabilité" },
  { icon: Smartphone, title: "Accessible partout", text: "Sur ordinateur, tablette et mobile" },
  { icon: RefreshCw, title: "Synchronisé", text: "Avec les prestations et la caisse" },
];

const DETAILS = [
  {
    id: "produits",
    title: "Produits",
    text: "Tenez le catalogue de l’institut : nom, référence, marque, catégorie et unité. Chaque produit a un prix d’achat et, s’il est vendu, un prix de vente.",
  },
  {
    id: "quantites",
    title: "Quantités en stock",
    text: "Voyez le niveau de chaque produit, le seuil minimum et les entrées comme les sorties. La quantité affichée suit les mouvements.",
  },
  {
    id: "achats",
    title: "Achats",
    text: "Enregistrez les fournisseurs, préparez une commande, puis réceptionnez les produits en totalité ou en partie. La réception alimente le stock.",
  },
  {
    id: "mouvements",
    title: "Mouvements de stock",
    text: "Chaque changement laisse une trace : achat, vente, retour, ajustement ou consommation. Les pertes, la casse et les produits expirés sont aussi des mouvements.",
  },
  {
    id: "alertes",
    title: "Alertes",
    text: "Repérez le stock faible, la rupture et les produits dont la date approche. L’institut voit ce qu’il faut surveiller avant de manquer en cabine.",
  },
  {
    id: "prestations",
    title: "Produits utilisés pour les prestations",
    text: "Les produits peuvent être liés à un service. Lorsqu’une prestation consomme un produit, le logiciel enregistre une consommation rattachée au rendez-vous.",
  },
  {
    id: "ventes",
    title: "Ventes et stock",
    text: "Une vente au point de vente retire la quantité vendue du stock. Le comptoir et le stock restent sur les mêmes produits.",
    href: "/caisse/",
    link: "Découvrir la caisse",
  },
];

const FAQS = [
  {
    question: "Le stock se met-il à jour quand on vend un produit ?",
    answer: "Oui. La vente au point de vente retire la quantité du stock.",
  },
  {
    question: "Peut-on suivre ce qui est utilisé en cabine ?",
    answer:
      "Oui. L’usage pendant une prestation est un mouvement, distinct de la vente au comptoir.",
  },
];

export default function GestionStockPage() {
  return (
    <ShowcaseLanding
      prefix="stock"
      faqs={FAQS}
      badge={{ icon: Package, label: "Gestion de stock" }}
      title={
        <>
          Gérez vos produits <em>en toute simplicité</em>
        </>
      }
      lead="Suivez vos produits, vos consommables et vos fournitures en temps réel, évitez les ruptures de stock et organisez vos achats."
      promises={["Stock en temps réel", "Alertes automatiques", "Suivi des consommations"]}
      device={{
        src: "/site/rappelbeauty-produits-stock-pc-reel.webp",
        alt: "Écran Produits et stock de Rappel Beauty : quantités, alertes et valeur du stock",
        width: 2200,
        height: 1200,
      }}
      featuresTitle={
        <>
          Toutes les fonctionnalités de <em>gestion de stock</em>
        </>
      }
      features={FEATURES}
      storyMedia={
        <div className="sp-still">
          <Image
            src="/brand/footer-spa-cutout.png"
            alt="Produits et linge de soin d’un institut"
            width={1774}
            height={887}
            sizes="(max-width: 860px) 100vw, 40vw"
          />
        </div>
      }
      storyKicker="Moins de ruptures de stock"
      checks={CHECKS}
      callout={{
        icon: Package,
        title: (
          <>
            Un stock toujours <em>sous contrôle</em>
          </>
        ),
        text: "Gérez vos produits et concentrez-vous sur vos clientes.",
      }}
      metrics={METRICS}
      detailsTitle={
        <>
          Le stock, <em>en détail</em>
        </>
      }
      details={DETAILS}
    />
  );
}
