import Image from "next/image";
import { Suspense } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Headphones,
  Mail,
  MessageCircle,
  Monitor,
  Phone,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { CheckList, SpaCutout } from "./blocks";
import { ContactForm } from "./ContactForm";
import { DemoExplorer } from "./DemoExplorer";
import "./engagement-pages.css";

const whatsapp = `https://wa.me/${SITE.phoneInternational.replace(/\D/g, "")}`;

function TrustBand({ items }: { items: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <div className="vt-wrap eng-wrap">
      <ul className="eng-trust">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                {item.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DemoLanding() {
  return (
    <div className="eng dm">
      <section className="vt-wrap eng-wrap eng-hero dm-hero">
        <div>
          <span className="vt-badge eng-badge">
            <PlayCircle aria-hidden="true" /> Démo interactive
          </span>
          <h1>
            Découvrez Rappel Beauty <em>en réalité</em>
          </h1>
          <p className="eng-lead">
            Explorez les fonctionnalités et les vraies captures de l’interface pour découvrir
            comment organiser le quotidien de votre institut de beauté.
          </p>
          <div className="eng-actions">
            <a className="eng-button" href="#demo-interactive">
              <PlayCircle aria-hidden="true" />
              Lancer la démo
            </a>
            <Link
              className="eng-button eng-button-outline"
              href="/contact/?subject=demo#contact-form"
            >
              <CalendarDays aria-hidden="true" />
              Réserver une démo guidée
            </Link>
          </div>
          <CheckList
            className="eng-promises"
            items={["Sans installation", "Captures réelles", "Parcours à votre rythme"]}
          />
        </div>
        <div className="dm-hero-art">
          <div className="dm-art-halo" />
          <Image
            className="dm-laptop"
            src="/site/rappelbeauty-dashboard-pc-reel.webp"
            alt="Tableau de bord de Rappel Beauty sur ordinateur"
            width={2200}
            height={1250}
            priority
            sizes="(max-width: 760px) 100vw, 60vw"
          />
          <div className="dm-phone" role="img" aria-label="Illustration de l’agenda sur mobile">
            <div aria-hidden="true">
              <div className="dm-phone-notch" />
              <span className="dm-phone-brand">Rappel Beauty</span>
              <b>Mon agenda</b>
              <span className="dm-phone-date">Une journée à l’institut</span>
              {["09:00 · Soin du visage", "10:30 · Manucure", "14:00 · Massage"].map((text) => (
                <span className="dm-phone-appointment" key={text}>
                  {text}
                </span>
              ))}
              <span className="dm-phone-plus">+</span>
              <small>Aperçu illustratif</small>
            </div>
          </div>
          <SpaCutout className="dm-spa" sizes="(max-width: 760px) 35vw, 220px" />
        </div>
      </section>
      <DemoExplorer />
      <TrustBand
        items={[
          { icon: Zap, title: "Démo en ligne", text: "sans installation" },
          { icon: Monitor, title: "Interface réelle", text: "captures du logiciel" },
          { icon: Users, title: "Parcours institut", text: "sept modules à explorer" },
          { icon: ShieldCheck, title: "Accès libre", text: "sans engagement" },
        ]}
      />
    </div>
  );
}

export function ContactLanding() {
  return (
    <div className="eng ct">
      <section className="vt-wrap eng-wrap eng-hero ct-hero">
        <div>
          <span className="vt-badge eng-badge">
            <Mail aria-hidden="true" /> Contact
          </span>
          <h1>
            Contactez notre équipe <em>Rappel Beauty</em>
          </h1>
          <p className="eng-lead">
            Une question, un besoin de démonstration ou un accompagnement personnalisé ? Nous sommes
            à votre écoute pour vous aider à choisir la solution adaptée à votre institut.
          </p>
          <CheckList
            className="eng-promises"
            items={["Équipe à votre écoute", "Conseil personnalisé", "Accompagnement"]}
          />
        </div>
        <div className="ct-hero-art">
          <div className="ct-photo">
            <Image
              src="/brand/about-professional.webp"
              alt="Une professionnelle de la beauté utilisant une tablette, illustration"
              width={1448}
              height={1086}
              sizes="(max-width: 760px) 100vw, 52vw"
              priority
            />
          </div>
          <span className="ct-support-badge">
            <Headphones aria-hidden="true" />
            <span>
              Parlons de <strong>votre institut</strong>
            </span>
          </span>
        </div>
      </section>
      <div className="vt-wrap eng-wrap ct-layout">
        <aside className="ct-coordinates">
          <h2>
            Nos <em>coordonnées</em>
          </h2>
          <div className="ct-coordinate">
            <span className="ct-icon">
              <Phone aria-hidden="true" />
            </span>
            <div>
              <h3>Téléphone / WhatsApp</h3>
              <a href={`tel:${SITE.phoneInternational}`}>{SITE.phone}</a>
            </div>
            <a
              className="ct-whatsapp-small"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" />
              Nous écrire
            </a>
          </div>
          <div className="ct-coordinate">
            <span className="ct-icon">
              <Mail aria-hidden="true" />
            </span>
            <div>
              <h3>E-mail</h3>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </div>
          </div>
          <div className="ct-coordinate">
            <span className="ct-icon">
              <Video aria-hidden="true" />
            </span>
            <div>
              <h3>Démonstration à distance</h3>
              <Link href="/contact/?subject=demo#contact-form">
                Demander un créneau avec l’équipe
              </Link>
            </div>
          </div>
          <div className="ct-coordinate">
            <span className="ct-icon">
              <Headphones aria-hidden="true" />
            </span>
            <div>
              <h3>Une réponse personnalisée</h3>
              <p>Décrivez votre besoin, nous reviendrons vers vous dès que possible.</p>
            </div>
          </div>
          <section className="ct-remote">
            <h2>
              À vos <em>côtés</em>
            </h2>
            <div>
              <Image
                src="/brand/about-reception.webp"
                alt="Illustration d’un accueil d’institut de beauté"
                width={1448}
                height={1086}
                sizes="(max-width: 760px) 100vw, 40vw"
              />
              <p>
                <CheckCircle2 aria-hidden="true" />
                <span>Un accompagnement à distance, où que soit votre institut au Maroc.</span>
              </p>
            </div>
          </section>
        </aside>
        <section className="ct-form-panel" id="contact-form" aria-labelledby="ct-form-title">
          <h2 id="ct-form-title">
            Envoyez-nous <em>un message</em>
          </h2>
          <p>
            Présentez votre demande. Le formulaire prépare un e-mail que vous pourrez envoyer depuis
            votre messagerie.
          </p>
          <Suspense fallback={<p role="status">Chargement du formulaire...</p>}>
            <ContactForm />
          </Suspense>
          <div className="ct-direct">
            <p>Vous préférez discuter directement ?</p>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              Nous contacter sur WhatsApp
            </a>
          </div>
        </section>
      </div>
      <TrustBand
        items={[
          { icon: Headphones, title: "Équipe à l’écoute", text: "de vos besoins" },
          { icon: CalendarDays, title: "Démo personnalisée", text: "sur rendez-vous" },
          { icon: Rocket, title: "Prise en main", text: "avec notre équipe" },
          { icon: ShieldCheck, title: "Accompagnement", text: "à chaque étape" },
        ]}
      />
    </div>
  );
}
