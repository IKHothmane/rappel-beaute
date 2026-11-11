import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarDays, CheckCircle2, Clock3, LayoutGrid, MapPin, MessageCircle, Monitor, Play, QrCode, RefreshCw, UserRound, Users } from "lucide-react";
import { Accordion, AccordionSection, CheckList, FaqAccordion, IconCards, IconFacts, SpaCutout } from "@/components/www/blocks";
import { JsonLd } from "@/components/www/JsonLd";
import { BookingPreview } from "@/components/booking/BookingPreview";
import { WebsitePreview } from "@/components/website-creation/WebsitePreview";
import { faqPageJsonLd, marketingPageMetadata } from "@/lib/seo";
import { PUBLIC_OFFER } from "@/lib/site";
import "./reservation-en-ligne.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Réservation en ligne pour institut de beauté · Rappel Beauty",
  description:
    "Permettez à vos clientes de réserver en ligne auprès de votre institut : page publique, services, tarifs, disponibilités, rendez-vous et vitrine produits avec retrait à l'institut.",
  canonical: "/reservation-en-ligne/",
});

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
    href: "/gestion-rendez-vous/",
    link: "Découvrir la gestion des rendez-vous",
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

const STEPS = [
  { icon: CalendarDays, text: "La cliente choisit un service" },
  { icon: CalendarCheck, text: "Sélectionne une date et une heure" },
  { icon: UserRound, text: "Renseigne ses coordonnées" },
  { icon: CheckCircle2, text: "Confirme sa réservation" },
  { icon: CalendarCheck, text: "Le rendez-vous rejoint votre agenda Rappel Beauty" },
];
const BENEFITS = [
  { icon: CalendarDays, title: "Accessible 24h/24", text: "Vos clientes consultent vos soins et choisissent leur créneau à toute heure." },
  { icon: Clock3, title: "Gain de temps", text: "Les réservations rejoignent votre agenda, sans recopier les demandes." },
  { icon: Users, title: "Relation directe", text: "Votre institut garde le lien avec ses clientes et prépare ses rappels WhatsApp." },
  { icon: RefreshCw, title: "Un agenda partagé", text: "Accueil, équipe et réservation utilisent les mêmes disponibilités." },
];
const CHANNELS = [
  { icon: Monitor, title: "Sur votre site web", text: "Ajoutez un lien vers votre page de réservation." },
  { icon: MapPin, title: "Depuis votre fiche établissement", text: "Partagez le lien dans les coordonnées de votre fiche." },
  { icon: MessageCircle, title: "Sur vos réseaux sociaux", text: "Placez-le dans votre biographie ou vos publications." },
  { icon: QrCode, title: "Via un QR code", text: "Un lien à partager sur vos supports imprimés et à l’accueil." },
];
const FAQS = [
  { question: "Est-ce une marketplace de salons ?", answer: "Non. La page publique appartient à l’institut. Vos clientes réservent auprès de vous, dans les créneaux de votre propre agenda." },
  { question: "Peut-on payer le rendez-vous en ligne ?", answer: "Non. Dans le fonctionnement actuel de Rappel Beauty, les clientes règlent directement leurs prestations à l’institut." },
];

export default function ReservationEnLignePage() {
  return (
    <div className="bk"><JsonLd data={faqPageJsonLd(FAQS)} /><div className="bk-wrap">
      <section className="bk-hero" aria-labelledby="booking-title"><div><span className="bk-badge"><CalendarDays aria-hidden="true" />Réservation en ligne</span><h1 id="booking-title">La réservation en ligne pour votre <em>institut de beauté</em></h1><p className="bk-lead">Offrez à vos clientes une expérience de réservation simple, disponible 24h/24, depuis votre site web ou un lien partagé sur vos réseaux.</p><div className="bk-actions"><Link href="/professionnel/">Activer la réservation en ligne<ArrowRight aria-hidden="true" /></Link><Link href="/demo/"><Play aria-hidden="true" />Voir la démo</Link></div><CheckList className="bk-promises" items={["Simple et rapide", "Relié à votre agenda", "Votre propre page"]} /></div><div className="bk-hero-art"><div className="bk-treatment-frame"><Image src="/brand/institut-beaute-soin.webp" alt="Illustration d’un soin du visage dans un institut de beauté" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 56vw" priority /></div><div className="bk-hero-phone"><WebsitePreview variant="rendez-vous" phone /></div><SpaCutout className="bk-hero-spa" sizes="(max-width: 760px) 120px, 220px" /><p>Aperçu illustratif d’une page de réservation</p></div></section>

      <section className="bk-process" aria-labelledby="booking-process-title"><h2 id="booking-process-title">Comment fonctionne <em>la réservation en ligne ?</em></h2><ol>{STEPS.map(({ icon: Icon, text }, index) => <li key={text}>{index < 4 && <span className="bk-step-number" aria-hidden="true">{index + 1}</span>}<Icon aria-hidden="true" /><p>{text}</p>{index < STEPS.length - 1 && <ArrowRight className="bk-step-arrow" aria-hidden="true" />}</li>)}</ol></section>

      <div className="bk-benefit-layout"><BookingPreview /><section className="bk-benefits" aria-labelledby="booking-benefits-title"><h2 id="booking-benefits-title">Les avantages <em>pour votre institut</em></h2><div><IconCards items={BENEFITS} /></div></section></div>

      <section className="bk-channels" aria-labelledby="booking-channels-title"><div className="bk-website-art"><WebsitePreview variant="vitrine" /><div><WebsitePreview variant="rendez-vous" phone /></div></div><div><h2 id="booking-channels-title">Où partager <em>la réservation ?</em></h2><ul><IconFacts items={CHANNELS} /></ul><Link href="/creation-site-web/">Vous souhaitez créer votre site ?<ArrowRight aria-hidden="true" /></Link></div><aside className="bk-integration"><LayoutGrid aria-hidden="true" /><h3>Intégrée à <em>Rappel Beauty</em></h3><CheckList items={["Rendez-vous dans votre agenda", "Disponibilités de votre équipe", "Créneaux et cabines pris en compte", "Messages WhatsApp préparés"]} /></aside></section>

      <AccordionSection className="bk-details" id="booking-details-title" title={<>Votre réservation, <em>en détail</em></>}><Accordion items={SECTIONS} /></AccordionSection>
      <AccordionSection className="bk-faq" id="booking-faq-title" title={<>Vos questions <em>avant de commencer</em></>}><FaqAccordion faqs={FAQS} /></AccordionSection>
      <section className="bk-cta" aria-labelledby="booking-cta-title"><div><h2 id="booking-cta-title">Vos clientes réservent, votre institut s’organise.</h2><p>Essayez Rappel Beauty {PUBLIC_OFFER.trialDays} jours, sans carte bancaire et sans engagement.</p></div><Link href="/professionnel/">Essayer gratuitement<ArrowRight aria-hidden="true" /></Link><Link href="/tarifs/">Voir les tarifs</Link></section>
    </div></div>
  );
}
