import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, CalendarDays, CheckCircle2, Clock3, Heart, MousePointerClick, Play, RefreshCw, Settings2, Sparkles, Star, Users } from "lucide-react";
import { Accordion, AccordionSection, CheckList, FaqAccordion, IconCards, IconFacts, SpaCutout } from "@/components/www/blocks";
import { JsonLd } from "@/components/www/JsonLd";
import { faqPageJsonLd, marketingPageMetadata } from "@/lib/seo";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";
import "./institut-beaute.css";

const CHAPTERS = [
  {
    id: "rendez-vous",
    title: "Organisez vos rendez-vous",
    text: "La journée d'un institut se joue sur les créneaux, les durées et les personnes disponibles. L'agenda réunit les rendez-vous, les statuts et le planning de l'équipe. Le logiciel refuse un chevauchement pour la même personne ou la même cabine.",
    href: "/gestion-rendez-vous/",
    link: "Découvrir la gestion des rendez-vous",
  },
  {
    id: "clientes",
    title: "Centralisez vos clientes",
    text: "Retrouver une cliente, son historique de soins et ses notes ne devrait pas dépendre d'un cahier ou d'une conversation WhatsApp. La fiche regroupe les informations utiles au suivi, sans photo en V1.",
    href: "/gestion-clientes/",
    link: "Découvrir la gestion des clientes",
  },
  {
    id: "stock",
    title: "Gérez vos produits et votre stock",
    text: "Les produits servent aux soins et aux ventes au comptoir. Le stock suit les quantités, les achats, les fournisseurs et les mouvements, y compris ce qui est consommé pendant une prestation.",
    href: "/gestion-stock/",
    link: "Découvrir la gestion du stock",
  },
  {
    id: "caisse",
    title: "Gérez votre caisse et vos ventes",
    text: "Encaisser une prestation ou un produit, noter une dépense et retrouver la facture se fait dans la même journée de caisse. Les clientes règlent à l'institut : espèces, carte, virement, chèque ou carte cadeau.",
    href: "/caisse/",
    link: "Découvrir la gestion de la caisse",
  },
  {
    id: "fidelite",
    title: "Fidélisez vos clientes",
    text: "Le programme de points suit les paiements réellement enregistrés. Un rendez-vous annulé ou un absent ne crée pas de points tant qu'aucun règlement n'est passé. Les cartes cadeaux et les forfaits restent des outils à part.",
    href: "/fidelite/",
    link: "Découvrir la fidélité",
  },
  {
    id: "reservation",
    title: "Permettez la réservation en ligne",
    text: "Ce n'est pas une place de marché. Chaque institut publie sa page : services, durées et créneaux issus du planning. La cliente réserve auprès de l'institut, et le rendez-vous arrive dans le même agenda.",
    href: "/reservation-en-ligne/",
    link: "Découvrir la réservation en ligne",
  },
] as const;

export const dynamic = "force-static";
export const metadata = marketingPageMetadata({
  title: "Institut de beauté : gestion et réservation en ligne au Maroc · Rappel Beauty",
  description: "Offrez la réservation en ligne à vos clientes et retrouvez chaque rendez-vous dans votre agenda. Rappel Beauty réunit la gestion de votre institut de beauté au Maroc : clientes, équipe, stock, caisse et fidélité.",
  canonical: "/solutions/institut-beaute/",
});
const HIGHLIGHTS = [
  { icon: CalendarDays, title: "Réservation 24h/24", text: "Vos clientes réservent quand elles le souhaitent" },
  { icon: RefreshCw, title: "Agenda connecté", text: "Avec votre équipe et vos cabines" },
  { icon: Bell, title: "Rappels assistés", text: "Messages WhatsApp préparés, envoi par l’institut" },
  { icon: Users, title: "Relation directe", text: "Votre institut, vos clientes, votre page" },
];
const STEPS = [
  { icon: MousePointerClick, text: "La cliente choisit un service" },
  { icon: CalendarDays, text: "Sélectionne une date et une heure" },
  { icon: CheckCircle2, text: "Renseigne ses coordonnées et confirme" },
  { icon: CalendarCheck, text: "Le rendez-vous rejoint votre agenda" },
];
const BENEFITS = [
  { icon: Sparkles, title: "Plus de visibilité", text: "Partagez une page dédiée à vos soins et à vos disponibilités." },
  { icon: Clock3, title: "Gain de temps", text: "Retrouvez les réservations dans votre agenda, sans double saisie." },
  { icon: Star, title: "Une expérience fluide", text: "Un parcours de réservation simple et accessible à toute heure." },
  { icon: Settings2, title: "À votre image", text: "Vos services, vos durées, vos tarifs et vos créneaux disponibles." },
];
const FAQS = [
  { question: "La cliente paie-t-elle en ligne ?", answer: "Non. Les clientes règlent leurs prestations directement à l’institut. Un acompte, lorsqu’il est prévu, est également encaissé à l’institut." },
  { question: "Est-ce une marketplace de salons ?", answer: "Non. Chaque institut dispose de sa propre page publique. Vos clientes réservent auprès de vous, sans être redirigées vers un catalogue d’autres salons." },
  { question: "Les rappels sont-ils automatiques ?", answer: "Les rappels WhatsApp sont assistés : Rappel Beauty prépare le message, puis une personne de l’institut le relit et l’envoie depuis son numéro." },
];

export default function InstitutBeautePage() {
  return (
    <div className="ib">
      <JsonLd data={faqPageJsonLd(FAQS)} />
      <div className="ib-wrap">
        <section className="ib-hero" aria-labelledby="institut-title">
          <div className="ib-hero-copy"><span className="ib-badge"><CalendarDays aria-hidden="true" />Réservation en ligne</span><h1 id="institut-title">Offrez à vos clientes la réservation en ligne <em>24h/24 et 7j/7</em></h1><p className="ib-lead">Un système simple et intégré à votre institut pour recevoir les réservations de vos clientes et les retrouver dans votre agenda.</p><div className="ib-actions"><Link href="/professionnel/">Activer la réservation en ligne<ArrowRight aria-hidden="true" /></Link><Link href="/demo/"><Play aria-hidden="true" />Voir la démo</Link></div><CheckList className="ib-promises" items={["Simple à mettre en place", "Relié à votre agenda", "Votre propre page"]} /></div>
          <div className="ib-hero-art"><div className="ib-treatment-frame"><Image src="/brand/institut-beaute-soin.webp" alt="Illustration d’une esthéticienne réalisant un soin du visage dans un institut de beauté" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 55vw" className="ib-treatment" priority /></div><div className="ib-booking-preview"><span className="ib-preview-icon"><CalendarCheck aria-hidden="true" /></span><h2>Réservez votre soin</h2><p>en quelques clics</p><ul><li><Sparkles aria-hidden="true" />Un service qui vous plaît</li><li><CalendarDays aria-hidden="true" />Une date disponible</li><li><Clock3 aria-hidden="true" />Un créneau adapté</li></ul><Link href="#comment-ca-marche">Voir le fonctionnement<ArrowRight aria-hidden="true" /></Link></div></div>
        </section>
      </div>

      <div className="ib-highlight-band"><div className="ib-wrap ib-highlights"><IconFacts as="div" iconClassName="ib-highlight-icon" items={HIGHLIGHTS} /></div></div>

      <div className="ib-wrap">
        <section id="comment-ca-marche" className="ib-guide" aria-labelledby="institut-guide-title">
          <figure className="ib-mobile-preview"><div className="ib-phone"><span className="ib-phone-notch" /><Image className="ib-phone-logo" src="/brand/logo.png" alt="Rappel Beauty" width={180} height={90} sizes="100px" /><p className="ib-phone-title">Votre rendez-vous en ligne</p><div className="ib-phone-field"><Sparkles aria-hidden="true" /><span>Service<strong>Soin du visage</strong></span></div><div className="ib-phone-field"><CalendarDays aria-hidden="true" /><span>Date<strong>Selon vos disponibilités</strong></span></div><div className="ib-phone-field"><Clock3 aria-hidden="true" /><span>Horaire<strong>Un créneau libre</strong></span></div><span className="ib-phone-confirm"><CheckCircle2 aria-hidden="true" />Un rendez-vous, un agenda</span><Link href="/reservation-en-ligne/">Découvrir<ArrowRight aria-hidden="true" /></Link></div><SpaCutout className="ib-phone-spa" sizes="(max-width: 760px) 180px, 280px" /><figcaption>Aperçu illustratif de la page cliente</figcaption></figure>
          <div className="ib-guide-content"><h2 id="institut-guide-title">Comment <em>ça marche ?</em></h2><ol className="ib-steps">{STEPS.map(({ icon: Icon, text }, i) => <li key={text}><span className="ib-step-number" aria-hidden="true">{i + 1}</span><Icon aria-hidden="true" /><p>{text}</p>{i < STEPS.length - 1 && <ArrowRight className="ib-step-arrow" aria-hidden="true" />}</li>)}</ol><section className="ib-benefits" aria-labelledby="institut-benefits-title"><h2 id="institut-benefits-title">Les avantages <em>pour votre institut</em></h2><div className="ib-benefit-grid"><IconCards items={BENEFITS} /></div></section></div>
        </section>

        <section id="centralisee" className="ib-management" aria-labelledby="institut-management-title"><div className="ib-section-heading"><span className="ib-badge">Tout votre institut</span><h2 id="institut-management-title">La réservation, et <em>tout ce qui suit</em></h2><p>Vos rendez-vous, vos clientes, vos produits et votre caisse restent réunis dans le même logiciel.</p></div><div className="ib-chapters"><Accordion items={CHAPTERS} /></div></section>

        <section id="maroc" className="ib-local"><span className="ib-local-icon"><Heart aria-hidden="true" /></span><div><h2>Pensé pour les instituts au Maroc</h2><p>Vos prix et votre caisse sont en dirhams. Vos clientes réservent auprès de vous et règlent leurs soins directement à l’institut.</p></div><Link id="pilotage" href="/fonctionnalites/#analytics">Découvrir le pilotage de votre activité<ArrowRight aria-hidden="true" /></Link></section>

        <AccordionSection className="ib-faq" id="institut-faq-title" title={<>Avant de <em>vous lancer</em></>}><FaqAccordion faqs={FAQS} /></AccordionSection>

        <section id="en-bref" className="ib-cta" aria-labelledby="institut-cta-title"><div><h2 id="institut-cta-title">Ouvrez les portes de votre institut, même en ligne.</h2><p>Essai gratuit de {PUBLIC_OFFER.trialDays} jours, sans carte bancaire et sans engagement.</p><p className="ib-price">{formatPrice(PUBLIC_OFFER.monthlyPrice)} DH/mois ou {formatPrice(PUBLIC_OFFER.annualPrice)} DH/an après l’essai. <Link href="/tarifs/">Voir les tarifs</Link></p></div><Link className="ib-cta-button" href="/professionnel/">Créer mon institut<ArrowRight aria-hidden="true" /></Link></section>
      </div>
    </div>
  );
}
