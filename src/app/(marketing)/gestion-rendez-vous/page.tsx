import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Clock3,
  MousePointerClick,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Accordion,
  AccordionSection,
  CheckList,
  FaqAccordion,
  IconFacts,
  SpaCutout,
} from "@/components/www/blocks";
import { JsonLd } from "@/components/www/JsonLd";
import { faqPageJsonLd, marketingPageMetadata } from "@/lib/seo";
import { PUBLIC_OFFER } from "@/lib/site";
import "./gestion-rendez-vous.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Rendez-vous pour institut de beauté | Rappel Beauty",
  description:
    "Agenda de votre institut : disponibilités de l’équipe, liste d’attente et planning adapté à votre activité.",
  canonical: "/gestion-rendez-vous/",
});

const SECTIONS = [
  {
    id: "agenda",
    title: "Agenda",
    text: "Consultez la journée, les trois jours, la semaine ou le mois. Chaque rendez-vous indique la cliente, la prestation, l'employée et, si besoin, la cabine.",
  },
  {
    id: "rendez-vous",
    title: "Création et modification",
    text: "Créez un rendez-vous depuis l'institut, par téléphone ou après un message WhatsApp. Vous pouvez le modifier : horaire, prestation, employée, cabine ou note.",
  },
  {
    id: "disponibilites",
    title: "Disponibilités",
    text: "Les créneaux proposés tiennent compte de l'employée, de la durée du service et de la cabine. Un créneau déjà pris n'est pas proposé une seconde fois.",
  },
  {
    id: "planning",
    title: "Planning de l'équipe",
    text: "Voyez qui travaille, sur quelle prestation et dans quelle cabine. Le planning sert à organiser la journée de l'institut, pas seulement à noter une heure.",
  },
  {
    id: "statuts",
    title: "Statuts des rendez-vous",
    text: "Un rendez-vous passe par des statuts clairs : en attente, confirmé, arrivée, en cours, terminé, annulé ou absent. L'annulation et l'absence libèrent le créneau.",
  },
  {
    id: "attente",
    title: "Liste d'attente",
    text: "Quand une cliente souhaite un soin sans créneau libre, elle peut rejoindre la liste d'attente. Les rappels se préparent dans le logiciel. Si une place se libère, l'institut prépare un message WhatsApp et l'envoie lui-même.",
  },
  {
    id: "reservation",
    title: "Réservation en ligne",
    text: "L'institut peut publier sa page pour que ses clientes choisissent un service et un créneau. Elles paient directement à l'institut, pas sur une marketplace.",
    href: "/reservation-en-ligne/",
    link: "Découvrir la réservation en ligne",
  },
  {
    id: "conflits",
    title: "Prévention des conflits",
    text: "Le logiciel refuse deux rendez-vous qui se chevauchent pour la même employée, ou pour la même cabine lorsqu'elle est assignée. Un rendez-vous annulé ou un absent ne bloque plus le créneau.",
  },
  {
    id: "institut",
    title: "Côté institut",
    text: "L'accueil voit l'agenda, crée ou ajuste les rendez-vous, suit les statuts et retrouve la cliente. La réservation en ligne alimente le même agenda.",
    href: "/gestion-clientes/",
    link: "Découvrir la gestion des clientes",
  },
] as const;

const HIGHLIGHTS = [
  { icon: CalendarDays, title: "Agenda intelligent", text: "Vue jour, semaine et mois" },
  { icon: Bell, title: "Rappels WhatsApp", text: "Messages préparés, envoi assisté" },
  { icon: Users, title: "Réservation en ligne", text: "24h/24 pour vos clientes" },
  { icon: RefreshCw, title: "Un planning partagé", text: "Accueil, équipe et réservation" },
];
const FEATURES = [
  {
    icon: CalendarDays,
    title: "Agenda multi-cabines",
    text: "Gérez les rendez-vous de plusieurs cabines et praticiennes dans un même agenda.",
    href: "#agenda",
  },
  {
    icon: MousePointerClick,
    title: "Réservation en ligne",
    text: "Partagez votre page de réservation pour que vos clientes choisissent leur créneau.",
    href: "/reservation-en-ligne/",
  },
  {
    icon: Bell,
    title: "Rappels WhatsApp",
    text: "Retrouvez vos messages préparés. Vous les relisez et les envoyez depuis votre numéro.",
    href: "/whatsapp/",
  },
  {
    icon: SlidersHorizontal,
    title: "Planning équipe",
    text: "Organisez les horaires, les prestations et les disponibilités de vos employées.",
    href: "#planning",
  },
];
const FAQS = [
  {
    question: "Le logiciel empêche-t-il les doubles réservations ?",
    answer:
      "Oui. Deux rendez-vous qui se chevauchent pour une même employée ou une même cabine assignée ne peuvent pas être enregistrés. Les réservations en ligne tiennent compte du même planning.",
  },
  {
    question: "Les rappels sont-ils envoyés automatiquement ?",
    answer:
      "Non. WhatsApp est assisté : le logiciel prépare le message, puis une personne de l’institut le relit et l’envoie depuis le numéro de l’établissement.",
  },
];

export default function GestionRdvPage() {
  return (
    <div className="rdv">
      <JsonLd data={faqPageJsonLd(FAQS)} />
      <div className="vt-wrap rdv-wrap">
        <section className="rdv-hero" aria-labelledby="rdv-title">
          <div className="rdv-hero-copy">
            <span className="vt-badge rdv-badge">
              <CalendarDays aria-hidden="true" />
              Gestion des rendez-vous
            </span>
            <h1 id="rdv-title">
              Une gestion des rendez-vous simple, <em>rapide et intelligente</em>
            </h1>
            <p className="rdv-lead">
              Organisez votre agenda, évitez les doubles réservations et offrez à vos clientes une
              expérience de réservation fluide, en ligne 24h/24.
            </p>
            <div className="rdv-actions">
              <Link href="/professionnel/">
                Essayer gratuitement
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/demo/">
                <Play aria-hidden="true" />
                Voir la démo
              </Link>
            </div>
            <CheckList
              className="rdv-promises"
              items={[
                "Sans carte bancaire",
                `${PUBLIC_OFFER.trialDays} jours gratuits`,
                "Support inclus",
              ]}
            />
          </div>
          <div className="rdv-hero-visual">
            <div className="rdv-hero-glow" />
            <Image
              className="rdv-agenda"
              src="/site/rappelbeauty-agenda-pc-complet-2200x1270.webp"
              alt="Agenda réel de Rappel Beauty : planning par praticienne, créneaux et statuts des rendez-vous"
              width={2200}
              height={1270}
              sizes="(max-width: 760px) 100vw, 60vw"
              priority
            />
            <SpaCutout className="rdv-spa" sizes="(max-width: 760px) 140px, 230px" />
            <Link className="rdv-booking-badge" href="/reservation-en-ligne/">
              <CalendarDays aria-hidden="true" />
              <span>
                Réservation en ligne<strong>Un créneau, un seul agenda</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <div className="rdv-highlight-band">
        <div className="vt-wrap rdv-wrap rdv-highlights">
          <IconFacts as="div" iconClassName="rdv-icon" items={HIGHLIGHTS} />
        </div>
      </div>

      <div className="vt-wrap rdv-wrap">
        <section className="rdv-benefits" aria-labelledby="rdv-benefits-title">
          <div className="rdv-portrait">
            <div className="rdv-portrait-frame">
              <Image
                src="/brand/about-professional.webp"
                alt="Illustration d’une professionnelle de la beauté organisant son activité sur une tablette"
                width={1448}
                height={1086}
                sizes="(max-width: 760px) 100vw, 45vw"
              />
            </div>
            <span className="rdv-float rdv-float-calendar">
              <CalendarDays aria-hidden="true" />
              <span>
                Vos rendez-vous<strong>au même endroit</strong>
              </span>
            </span>
            <span className="rdv-float rdv-float-check">
              <Check aria-hidden="true" />
              Un planning sans conflit
            </span>
            <span className="rdv-float rdv-float-clock">
              <Clock3 aria-hidden="true" />
              Du temps pour vos clientes
            </span>
          </div>
          <div className="rdv-benefits-copy">
            <h2 id="rdv-benefits-title">
              Pourquoi choisir notre gestion <em>des rendez-vous ?</em>
            </h2>
            <ul>
              <li>
                <span className="rdv-check">
                  <Check aria-hidden="true" />
                </span>
                <p>
                  <strong>Gagnez du temps :</strong> créez, modifiez et annulez vos rendez-vous en
                  quelques clics.
                </p>
              </li>
              <li>
                <span className="rdv-check">
                  <Check aria-hidden="true" />
                </span>
                <p>
                  <strong>Gardez le contact :</strong> préparez vos rappels WhatsApp pour informer
                  vos clientes, avec des messages qui vous ressemblent.
                </p>
              </li>
              <li>
                <span className="rdv-check">
                  <Check aria-hidden="true" />
                </span>
                <p>
                  <strong>Organisez vos cabines et votre équipe :</strong> consultez un planning
                  commun et évitez les chevauchements.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="rdv-features" aria-labelledby="rdv-features-title">
          <h2 id="rdv-features-title">
            Principales <em>fonctionnalités</em>
          </h2>
          <div className="rdv-feature-grid">
            {FEATURES.map(({ icon: Icon, title, text, href }) => (
              <article className="vt-icon-card" key={title}>
                <div className="vt-card-head">
                  <Icon aria-hidden="true" />
                  <h3>
                    <Link href={href}>{title}</Link>
                  </h3>
                </div>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rdv-details" aria-labelledby="rdv-details-title">
          <div className="rdv-section-heading">
            <span className="vt-badge rdv-badge">Au quotidien</span>
            <h2 id="rdv-details-title">
              Un agenda qui suit <em>votre institut</em>
            </h2>
            <p>
              Du premier créneau à la fin du soin, retrouvez les informations utiles à votre équipe.
            </p>
          </div>
          <div className="rdv-details-grid">
            <Accordion items={SECTIONS} />
          </div>
        </section>

        <AccordionSection
          className="rdv-faq"
          id="rdv-faq-title"
          title={
            <>
              Vos questions, <em>nos réponses</em>
            </>
          }
        >
          <FaqAccordion faqs={FAQS} />
        </AccordionSection>

        <section className="rdv-cta" aria-labelledby="rdv-cta-title">
          <CalendarDays aria-hidden="true" />
          <div>
            <h2 id="rdv-cta-title">Un agenda plus clair, dès aujourd’hui.</h2>
            <p>
              Essayez Rappel Beauty {PUBLIC_OFFER.trialDays} jours, sans carte bancaire et sans
              engagement.
            </p>
          </div>
          <Link href="/professionnel/">
            Essayer gratuitement
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
        <p className="rdv-more">
          Explorez <Link href="/fonctionnalites/">toutes les fonctionnalités</Link> ou découvrez{" "}
          <Link href="/tarifs/">nos formules et tarifs</Link>.
        </p>
      </div>
    </div>
  );
}
