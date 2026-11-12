import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Cookie,
  FileText,
  Gavel,
  IdCard,
  Info,
  Laptop,
  Mail,
  Phone,
  Scale,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { SITE } from "@/lib/site";

const cards = [
  {
    id: "editeur",
    icon: Building2,
    title: "Éditeur du site",
    text: "Rappel Beauty — logiciel de gestion pour instituts de beauté.",
    fields: ["Nom juridique", "Forme juridique", "Capital social", "Siège social"],
  },
  {
    id: "hebergement",
    icon: Laptop,
    title: "Hébergement",
    text: `Site public : ${SITE.url.replace("https://", "")}.`,
    fields: ["Hébergeur", "Adresse", "Contact"],
  },
  {
    id: "publication",
    icon: IdCard,
    title: "Directeur de publication",
    text: "",
    fields: ["Responsable de publication"],
  },
  {
    id: "immatriculation",
    icon: FileText,
    title: "Immatriculation",
    text: "",
    fields: ["ICE", "RC", "Identifiant fiscal", "CNSS"],
  },
  {
    id: "utilisation",
    icon: BookOpen,
    title: "Utilisation du site",
    text: "Pour toute question sur l’utilisation du site et des services Rappel Beauty, contactez notre équipe.",
    href: "/contact/",
    label: "Contacter l’équipe",
  },
  {
    id: "donnees",
    icon: Shield,
    title: "Protection des données",
    text: "Consultez les informations sur la collecte et l’utilisation de vos données dans notre politique de confidentialité.",
    href: "/confidentialite/",
    label: "Politique de confidentialité",
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Cookies",
    text: "Retrouvez les informations sur les cookies et leur utilisation sur le site.",
    href: "/confidentialite/#cookies",
    label: "En savoir plus sur les cookies",
  },
  {
    id: "questions",
    icon: Scale,
    title: "Questions sur ces mentions",
    text: "Une information à vérifier ou une question concernant l’éditeur ? Notre équipe est joignable aux coordonnées ci-dessous.",
  },
];

export function LegalMentions() {
  return (
    <div className="ml">
      <section className="vt-wrap ml-wrap ml-hero">
        <div>
          <span className="vt-badge ml-badge">
            <ShieldCheck aria-hidden="true" /> Mentions légales
          </span>
          <h1>
            Mentions <em>légales</em>
          </h1>
          <p className="ml-lead">
            Retrouvez ici les informations relatives à l’éditeur de Rappel Beauty, à l’hébergement
            et aux contacts du site.
          </p>
        </div>
        <div className="ml-illustration" aria-hidden="true">
          <div className="ml-halo" />
          <Scale className="ml-scales" strokeWidth={1.1} />
          <div className="ml-gavel">
            <Gavel strokeWidth={1.3} />
            <span />
          </div>
          <div className="ml-books">
            <span>
              <BookOpen /> Mentions légales
            </span>
            <span>
              <Shield /> Confidentialité
            </span>
            <span>
              <FileText /> Rappel Beauty
            </span>
          </div>
        </div>
      </section>
      <div className="vt-wrap ml-wrap ml-body">
        <div className="ml-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <section key={card.id} className="ml-card" aria-labelledby={`ml-${card.id}`}>
                <span className="ml-icon">
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <h2 id={`ml-${card.id}`}>{card.title}</h2>
                  {card.text && <p>{card.text}</p>}
                  {card.fields && (
                    <dl className="ml-blank-fields">
                      {card.fields.map((label) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{"\u00a0"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {card.href && (
                    <Link className="ml-pill" href={card.href}>
                      {card.label}
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <section className="ml-contact" aria-labelledby="ml-contact-title">
          <Info aria-hidden="true" />
          <div>
            <h2 id="ml-contact-title">Contact</h2>
            <p>Pour toute question relative aux mentions légales, vous pouvez nous contacter :</p>
            <div className="ml-contact-links">
              <a href={`mailto:${SITE.email}`}>
                <Mail aria-hidden="true" />
                {SITE.email}
              </a>
              <a href={`tel:${SITE.phoneInternational}`}>
                <Phone aria-hidden="true" />
                {SITE.phone}
              </a>
              <Link href="/contact/">
                Page de contact
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
