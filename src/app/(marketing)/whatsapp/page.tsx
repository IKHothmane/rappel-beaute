import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { IconCards, SpaCutout } from "@/components/www/blocks";
import {
  ShowcaseDetails,
  ShowcaseFaq,
  ShowcaseHero,
  ShowcaseShell,
} from "@/components/www/ShowcaseLanding";
import { marketingPageMetadata } from "@/lib/seo";
import "../showcase-landing.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Rappels WhatsApp pour institut de beauté · Rappel Beauty",
  description:
    "Préparez les rappels et confirmations WhatsApp de votre institut de beauté. Le message part depuis votre numéro, après votre validation.",
  canonical: "/whatsapp/",
});

const STEPS = [
  { icon: CalendarDays, title: "1. Planifiez", text: "un rendez-vous dans Rappel Beauty" },
  { icon: MessageCircle, title: "2. Préparez", text: "le message, puis envoyez-le via WhatsApp" },
  { icon: Bell, title: "3. La cliente répond", text: "pour confirmer, modifier ou annuler" },
  {
    icon: CalendarCheck,
    title: "4. L’agenda suit",
    text: "vous mettez le rendez-vous à jour dans Rappel Beauty",
  },
];

const PERKS = [
  {
    icon: CalendarDays,
    title: "Moins de rendez-vous manqués",
    text: "Un rappel préparé avant le soin aide vos clientes à se souvenir du créneau.",
  },
  {
    icon: Sparkles,
    title: "Cliente plus fidèle",
    text: "Restez en contact et proposez le prochain rendez-vous au bon moment.",
  },
  {
    icon: MessageCircle,
    title: "Communication simple",
    text: "Des messages clairs, rédigés pour votre institut et relus avant l’envoi.",
  },
  {
    icon: Clock3,
    title: "Gain de temps",
    text: "Moins d’appels pour rappeler un horaire déjà noté dans l’agenda.",
  },
  {
    icon: Bell,
    title: "Suivi des envois",
    text: "Retrouvez les messages préparés, envoyés et les réponses à traiter.",
  },
  {
    icon: Sparkles,
    title: "Messages personnalisés",
    text: "Le prénom, l’horaire et la prestation sont repris dans le texte.",
  },
];

const DETAILS = [
  {
    id: "preparation",
    title: "Préparation du message",
    text: "Confirmation, rappel ou demande d’avis : le modèle se remplit à partir du rendez-vous, avec le prénom, la date, l’heure et la prestation.",
  },
  {
    id: "envoi",
    title: "Envoi depuis votre numéro",
    text: "Le logiciel prépare le texte. Une personne de l’institut le relit, puis l’envoie depuis le numéro WhatsApp de l’établissement. Il n’y a pas d’envoi automatique.",
  },
  {
    id: "reponse",
    title: "Réponse de la cliente",
    text: "La cliente répond sur WhatsApp pour confirmer, demander un autre horaire ou annuler. Le changement de rendez-vous se fait ensuite dans l’agenda.",
  },
  {
    id: "agenda",
    title: "Lien avec l’agenda",
    text: "Le message part d’un rendez-vous déjà enregistré. L’accueil retrouve la cliente, la prestation et le créneau au même endroit.",
    href: "/gestion-rendez-vous/",
    link: "Découvrir l’agenda",
  },
];

const FAQS = [
  {
    question: "Les rappels WhatsApp partent-ils tout seuls ?",
    answer:
      "Non. Rappel Beauty prépare le message, puis une personne de l’institut le relit et l’envoie depuis le numéro de l’établissement.",
  },
  {
    question: "Depuis quel numéro le message est-il envoyé ?",
    answer:
      "Depuis le numéro WhatsApp enregistré pour l’institut, pas depuis un numéro de la plateforme.",
  },
];

function SampleMessage({
  name,
  when,
  service,
  time,
}: {
  name: string;
  when: string;
  service: string;
  time: string;
}) {
  return (
    <div className="sp-bubble">
      <p>Bonjour {name},</p>
      <p>Nous vous rappelons votre rendez-vous {when}</p>
      <p>Prestation : {service}</p>
      <p>Souhaitez-vous confirmer votre rendez-vous ?</p>
      <div className="sp-replies" aria-hidden="true">
        <span className="sp-yes">
          <Check />
          Confirmer
        </span>
        <span className="sp-no">
          <X />
          Annuler
        </span>
      </div>
      <time>{time}</time>
    </div>
  );
}

export default function WhatsappPage() {
  return (
    <ShowcaseShell faqs={FAQS}>
      <ShowcaseHero
        titleId="wa-title"
        badgeClassName="vt-badge sp-badge sp-badge-green"
        badge={
          <>
            <MessageCircle aria-hidden="true" />
            WhatsApp pour votre institut
          </>
        }
        title={
          <>
            Des rappels et confirmations de rendez-vous sur <em>WhatsApp</em>
          </>
        }
        lead="Réduisez les rendez-vous manqués, fidélisez vos clientes et restez en contact facilement grâce à WhatsApp."
        cta="Activer WhatsApp"
        promises={["Rappels préparés", "Envoi en un clic", "Messages personnalisés"]}
      >
        <div className="sp-scene">
          <div className="sp-scene-photo">
            <Image
              src="/brand/institut-beaute-soin.webp"
              alt="Soin du visage dans un institut de beauté"
              width={1536}
              height={1024}
              sizes="(max-width: 860px) 100vw, 58vw"
              priority
            />
          </div>
          <div className="sp-phone">
            <div className="sp-phone-screen">
              <div className="sp-phone-status">
                <span>10:24</span>
                <span>5G</span>
              </div>
              <div className="sp-phone-head">
                <span className="sp-avatar">
                  <MessageCircle aria-hidden="true" />
                </span>
                <p>
                  <strong>Rappel Beauty</strong>
                  <span>Institut de beauté</span>
                </p>
              </div>
              <SampleMessage
                name="Leila"
                when="demain, mardi à 10:00"
                service="Soin visage éclat"
                time="10:24"
              />
            </div>
          </div>
          <span className="sp-wa-float">
            <MessageCircle aria-hidden="true" />
          </span>
          <SpaCutout className="sp-bloom" sizes="160px" />
        </div>
      </ShowcaseHero>

      <section className="sp-block" aria-labelledby="wa-steps-title">
        <h2 className="sp-title" id="wa-steps-title">
          Comment fonctionne <em>WhatsApp</em> avec Rappel Beauty ?
        </h2>
        <ol className="sp-steps">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li className="sp-step" key={title}>
              <span className="sp-step-icon">
                <Icon aria-hidden="true" />
              </span>
              <strong>{title}</strong>
              <p>{text}</p>
              {index < STEPS.length - 1 ? (
                <span className="sp-step-arrow" aria-hidden="true">
                  <ArrowRight />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="sp-duo" aria-labelledby="wa-perks-title">
        <article className="sp-example">
          <h2>
            Exemple de <em>message envoyé</em>
          </h2>
          <div className="sp-chat">
            <div className="sp-chat-head">
              <span className="sp-avatar">
                <MessageCircle aria-hidden="true" />
              </span>
              <p>
                <strong>Rappel Beauty</strong>
                <span>Institut de Beauté</span>
              </p>
            </div>
            <SampleMessage
              name="Sara"
              when="vendredi 14 nov. à 14:00"
              service="Manucure + pose vernis"
              time="14:02"
            />
          </div>
          <p>
            Message préparé dans Rappel Beauty, relu puis envoyé depuis le numéro WhatsApp de
            l’institut.
          </p>
        </article>
        <div>
          <h2 className="sp-title" id="wa-perks-title">
            Les avantages pour <em>votre institut</em>
          </h2>
          <div className="sp-perks">
            <IconCards items={PERKS} articleClassName="sp-perk" iconClassName="sp-perk-icon" />
          </div>
        </div>
      </section>

      <section className="sp-connect" aria-labelledby="wa-connect-title">
        <span className="sp-connect-mark">
          <MessageCircle aria-hidden="true" />
        </span>
        <div>
          <h2 id="wa-connect-title">
            Connecté à <em>votre agenda</em> Rappel Beauty
          </h2>
          <p>
            Les rappels WhatsApp sont préparés à partir de votre agenda, de vos clientes et de vos
            prestations, pour un message juste et un envoi que vous validez.
          </p>
        </div>
        <Link className="sp-primary" href="/professionnel/">
          Activer les rappels WhatsApp maintenant
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <ShowcaseDetails
        id="wa-details-title"
        title={
          <>
            Le rappel, <em>en détail</em>
          </>
        }
        items={DETAILS}
      />
      <ShowcaseFaq id="wa-faq-title" faqs={FAQS} />
    </ShowcaseShell>
  );
}
