import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Brush, CalendarDays, ClipboardList, Code2, Layers, Link2, Monitor, Package, Play, Rocket, Sparkles, Star, Users } from "lucide-react";
import { AccordionSection, CheckList, FaqAccordion, IconCards, SpaCutout } from "@/components/www/blocks";
import { WebsiteCreationCatalog } from "@/components/website-creation/WebsiteCreationCatalog";
import { WebsitePreview } from "@/components/website-creation/WebsitePreview";
import { JsonLd } from "@/components/www/JsonLd";
import { faqPageJsonLd, marketingPageMetadata } from "@/lib/seo";
import "./creation-site-web.css";

export const dynamic = "force-static";
export const metadata = marketingPageMetadata({
  title: "Création de site web pour institut de beauté au Maroc · Rappel Beauty",
  description: "Un site web à l’image de votre institut : vitrine, réservation en ligne, catalogue de produits ou projet complet connecté à Rappel Beauty. Découvrez les maquettes et demandez votre devis.",
  canonical: "/creation-site-web/",
});
const CONNECTIONS = [
  { icon: CalendarDays, title: "Agenda & RDV", text: "Réservations et disponibilités" },
  { icon: Users, title: "Clientes", text: "Coordonnées et suivi" },
  { icon: Package, title: "Produits", text: "Catalogue et stocks" },
  { icon: Star, title: "Avis clients", text: "Selon les sources disponibles" },
];
const METHOD = [
  { icon: ClipboardList, title: "Brief & besoins", text: "Nous définissons vos objectifs, le contenu et le type de site." },
  { icon: Brush, title: "Design sur mesure", text: "Une maquette pensée pour votre identité et vos clientes." },
  { icon: Code2, title: "Développement", text: "Création du site et des connexions prévues au devis." },
  { icon: Rocket, title: "Mise en ligne", text: "Vérifications, adaptation mobile et préparation au référencement." },
];
const FAQS = [
  { question: "Que comprend le devis ?", answer: "Le devis précise les pages, le design, les fonctionnalités, les connexions à Rappel Beauty, ainsi que les modalités d’hébergement, de maintenance et d’accompagnement." },
  { question: "Les exemples sont-ils des sites clients ?", answer: "Non. Ce sont des maquettes illustratives qui présentent différents types de projets. Votre contenu, votre identité visuelle et les fonctionnalités sont définis avec vous." },
  { question: "Le paiement en ligne est-il inclus ?", answer: "Le paiement en ligne est une option à étudier selon votre projet et le prestataire de paiement retenu. Le fonctionnement actuel de Rappel Beauty prévoit un règlement directement à l’institut." },
];

export default function CreationSiteWebPage() {
  return (
    <div className="cw"><JsonLd data={faqPageJsonLd(FAQS)} /><div className="cw-wrap">
      <section className="cw-hero" aria-labelledby="cw-title"><div><span className="cw-badge"><Monitor aria-hidden="true" />Création de site web</span><h1 id="cw-title">Un site web sur mesure pour votre <em>institut de beauté</em></h1><p className="cw-lead">Vitrine, réservation en ligne, catalogue de produits ou site complet : valorisez vos soins et offrez à vos clientes une nouvelle porte d’entrée vers votre institut.</p><div className="cw-hero-actions"><Link className="cw-primary" href="#devis">Créer mon site maintenant<ArrowRight aria-hidden="true" /></Link><Link className="cw-secondary" href="#types-de-sites"><Play aria-hidden="true" />Voir des exemples</Link></div><CheckList className="cw-promises" items={["Design à votre image", "Connexions à Rappel Beauty", "Adapté au mobile"]} /></div><div className="cw-hero-art"><WebsitePreview variant="complet" /><div className="cw-hero-phone"><WebsitePreview variant="rendez-vous" phone /></div><SpaCutout className="cw-hero-spa" sizes="(max-width: 700px) 150px, 240px" /><span className="cw-hero-caption">Exemples de maquettes, personnalisables pour votre institut</span></div></section>
      <WebsiteCreationCatalog>
        <section className="cw-connections" aria-labelledby="cw-connections-title"><div className="cw-connection-heading"><Link2 aria-hidden="true" /><h2 id="cw-connections-title">Connecté à <em>Rappel Beauty</em></h2></div><p>Les connexions utiles sont définies avec vous pour garder une gestion cohérente entre votre site et votre institut.</p><div><IconCards items={CONNECTIONS} /></div></section>
        <section className="cw-method-layout" aria-labelledby="cw-method-title"><aside className="cw-project-note"><span className="cw-badge"><Sparkles aria-hidden="true" />Votre projet, votre identité</span><h2>Un projet <em>cadré ensemble</em></h2><p>Vos besoins, votre style et les connexions sont définis avant de commencer.</p><CheckList items={["Un périmètre clair dans le devis", "Une maquette à valider avec vous", "Un site pensé pour vos clientes"]} /></aside><div className="cw-method"><h2 id="cw-method-title">Notre <em>méthode de création</em></h2><ol>{METHOD.map(({ icon: Icon, title, text }, index) => <li key={title}><span className="cw-step-number" aria-hidden="true">{index + 1}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p>{index < METHOD.length - 1 && <ArrowRight className="cw-method-arrow" aria-hidden="true" />}</li>)}</ol><div className="cw-method-cta"><Layers aria-hidden="true" /><div><h3>Prêt à lancer le site de votre institut ?</h3><p>Parlons de vos envies, du design et des fonctionnalités utiles.</p></div><Link href="#devis">Demander un devis<ArrowRight aria-hidden="true" /></Link></div></div></section>
      </WebsiteCreationCatalog>
      <AccordionSection className="cw-faq" id="cw-faq-title" title={<>Vos questions <em>avant de commencer</em></>}><FaqAccordion faqs={FAQS} /></AccordionSection>
    </div></div>
  );
}
