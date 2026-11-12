import Image from "next/image";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Crown,
  Heart,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import { ShowcaseLanding } from "@/components/www/ShowcaseLanding";
import { marketingPageMetadata } from "@/lib/seo";
import "../showcase-landing.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Gestion des clientes d’un institut | Rappel Beauty",
  description:
    "Centralisez les fiches, l’historique, la fidélité et les messages de vos clientes dans Rappel Beauty.",
  canonical: "/gestion-clientes/",
});

const FEATURES = [
  {
    icon: Users,
    title: "Fiches clientes complètes",
    text: "Coordonnées, préférences, notes et informations utiles.",
  },
  {
    icon: CalendarDays,
    title: "Historique des prestations",
    text: "Suivi détaillé des soins et des rendez-vous.",
  },
  {
    icon: Heart,
    title: "Fidélité et récompenses",
    text: "Points, carte de fidélité et avantages de l’institut.",
  },
  {
    icon: Bell,
    title: "Rappels et communications",
    text: "Messages WhatsApp préparés, puis envoyés par l’institut.",
  },
  { icon: BarChart3, title: "Analyse cliente", text: "Fréquence, panier et rythme des visites." },
  {
    icon: Crown,
    title: "Segmentation",
    text: "Actives, nouvelles, à relancer ou peu venues récemment.",
  },
];

const CHECKS = [
  "Une relation cliente plus proche et durable",
  "Une meilleure connaissance de vos clientes",
  "Des messages préparés pour les bonnes personnes",
  "Une fidélisation suivie sur la même fiche",
  "Plus de clarté à l’accueil, avant chaque soin",
];

const METRICS = [
  { icon: Zap, title: "Centralisation", text: "Et un gain de temps à l’accueil" },
  { icon: ShieldCheck, title: "Données protégées", text: "Confidentielles, par institut" },
  { icon: Smartphone, title: "Accessible partout", text: "Sur ordinateur, tablette et mobile" },
  { icon: RefreshCw, title: "Synchronisation", text: "Avec l’agenda et la caisse" },
];

const DETAILS = [
  {
    id: "fiches",
    title: "Fiches clientes",
    text: "Chaque cliente a une fiche : nom, téléphone, e-mail, date de naissance, adresse et notes utiles à l’institut. Aucune photo cliente n’est stockée.",
  },
  {
    id: "historique",
    title: "Historique des rendez-vous",
    text: "La fiche conserve les rendez-vous passés, la prestation réalisée, l’employée et le statut.",
    href: "/gestion-rendez-vous/",
    link: "Découvrir l’agenda",
  },
  {
    id: "fidelite",
    title: "Fidélité",
    text: "Le programme enregistre les points gagnés, utilisés ou ajustés, le niveau de la cliente et les avantages prévus par l’institut. Les forfaits en cours apparaissent aussi sur la fiche.",
    href: "/fidelite/",
    link: "Découvrir la fidélité",
  },
  {
    id: "relation",
    title: "Suivi de la relation",
    text: "L’institut distingue les clientes actives, nouvelles, peu venues récemment ou à relancer. Après une prestation, le suivi reste dans la même fiche.",
  },
  {
    id: "communication",
    title: "Communication",
    text: "Préparez les rappels et les messages WhatsApp depuis la fiche. L’envoi reste validé par une personne de l’institut, et les accords de contact sont visibles.",
    href: "/whatsapp/",
    link: "Découvrir WhatsApp",
  },
  {
    id: "rendez-vous",
    title: "Rendez-vous et réservation",
    text: "Un rendez-vous, qu’il soit pris à l’accueil ou en ligne, est rattaché à la fiche. La réservation en ligne n’ouvre pas un autre fichier clientes.",
    href: "/reservation-en-ligne/",
    link: "Découvrir la réservation en ligne",
  },
];

const FAQS = [
  {
    question: "Les photos des clientes sont-elles enregistrées ?",
    answer: "Non. La fiche reste textuelle : identité, historique, notes et fidélité.",
  },
  {
    question: "Une réservation en ligne crée-t-elle une autre liste de clientes ?",
    answer: "Non. Le rendez-vous pris en ligne est rattaché à la fiche de l’institut.",
  },
];

export default function GestionClientesPage() {
  return (
    <ShowcaseLanding
      prefix="clients"
      faqs={FAQS}
      badge={{ icon: Users, label: "Gestion des clientes" }}
      title={
        <>
          Fidélisez vos clientes et offrez une expérience <em>personnalisée</em>
        </>
      }
      lead="Centralisez les informations de vos clientes, suivez leur parcours et renforcez leur fidélité."
      promises={["Fiches clientes complètes", "Historique des prestations", "Suivi de la fidélité"]}
      device={{
        src: "/site/rappelbeauty-clientes-pc-reel.webp",
        alt: "Écran Gestion des clientes de Rappel Beauty : liste, historique et fiche",
        width: 2200,
        height: 1230,
      }}
      featuresTitle={
        <>
          Toutes les fonctionnalités de <em>gestion des clientes</em>
        </>
      }
      features={FEATURES}
      storyMedia={
        <div className="sp-portrait">
          <Image
            src="/brand/about-professional.webp"
            alt="Professionnelle de l’institut consultant le suivi de ses clientes sur une tablette"
            width={1448}
            height={1086}
            sizes="(max-width: 860px) 100vw, 40vw"
          />
        </div>
      }
      checks={CHECKS}
      callout={{
        icon: Crown,
        title: (
          <>
            Des clientes <em>plus fidèles</em>
          </>
        ),
        text: "Offrez un suivi personnalisé et retrouvez l’historique avant chaque rendez-vous.",
      }}
      metrics={METRICS}
      detailsTitle={
        <>
          La fiche cliente, <em>en détail</em>
        </>
      }
      details={DETAILS}
    />
  );
}
