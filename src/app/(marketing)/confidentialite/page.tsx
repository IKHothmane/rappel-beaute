import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Cookie,
  Database,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { CheckList, SpaCutout } from "@/components/www/blocks";
import { marketingPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "./confidentialite.css";

export const dynamic = "force-static";
export const metadata = marketingPageMetadata({
  title: "Politique de confidentialité · Rappel Beauty",
  description:
    "Informations sur les données de votre compte, les demandes par e-mail et vos préférences de mesure d’audience sur Rappel Beauty.",
  canonical: "/confidentialite/",
});
const SECTIONS = [
  {
    id: "responsable",
    icon: Users,
    title: "Responsable de traitement",
    content: (
      <p>
        Pour vos questions sur les données personnelles et leur utilisation par Rappel Beauty,
        contactez notre équipe : <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    ),
  },
  {
    id: "donnees-collectees",
    icon: Database,
    title: "Données collectées sur la vitrine",
    content: (
      <>
        <p>
          Lors de l’inscription professionnelle, le nom, l’institut, la ville, le numéro WhatsApp,
          l’e-mail et les informations facultatives renseignées sont transmis à Rappel Beauty pour
          créer le compte et traiter la demande.
        </p>
        <p>
          Les formulaires de contact et de demande de site préparent un e-mail dans votre
          messagerie. Ces demandes ne nous parviennent que lorsque vous envoyez l’e-mail. La demande
          de démo guidée utilise ce même parcours. Le formulaire du footer prépare également une
          demande par e-mail ; il ne vous inscrit pas automatiquement à une newsletter.
        </p>
      </>
    ),
  },
  {
    id: "photos-clientes",
    icon: UserRound,
    title: "Photos clientes",
    content: (
      <p>
        Aucune photo cliente n’est collectée ni stockée en V1, ni sur la vitrine, ni dans
        l’application institut.
      </p>
    ),
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Cookies",
    content: (
      <>
        <p>
          Les cookies techniques servent notamment à la connexion et à la sélection de l’espace du
          site. Votre préférence de mesure d’audience est enregistrée dans le stockage local de
          votre navigateur.
        </p>
        <p>
          Google Analytics et Google Tag Manager sont chargés après votre acceptation de la mesure
          d’audience. Si vous refusez, ces scripts ne sont pas chargés. Vous pouvez modifier votre
          choix à tout moment avec le bouton « Préférences cookies » du footer. Après le retrait
          d’un accord, la page se recharge et les cookies de mesure Google accessibles au site sont
          supprimés.
        </p>
      </>
    ),
  },
  {
    id: "vos-droits",
    icon: UserRound,
    title: "Vos droits",
    content: (
      <p>
        Accès, rectification, opposition, suppression dans les limites de la loi 09-08. Demande :{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Recours possible auprès de la CNDP.
      </p>
    ),
  },
  {
    id: "duree-isolation",
    icon: Clock3,
    title: "Durée et isolation",
    content: (
      <p>
        Les données du compte servent au fonctionnement de votre espace et au suivi de votre
        demande. Les demandes envoyées par e-mail sont traitées par notre équipe dans sa messagerie.
        Pour une demande de suppression ou une question sur leur conservation, contactez-nous. Les
        accès aux données métier de l’application sont limités à l’institut et aux utilisateurs
        autorisés.
      </p>
    ),
  },
];

export default function ConfidentialitePage() {
  return (
    <div className="pv">
      <div className="vt-wrap pv-wrap">
        <section id="politique" className="pv-hero" aria-labelledby="privacy-title">
          <div>
            <span className="vt-badge pv-badge">
              <ShieldCheck aria-hidden="true" />
              Confidentialité
            </span>
            <h1 id="privacy-title">
              Politique de <em>confidentialité</em>
            </h1>
            <p className="pv-lead">
              Retrouvez comment fonctionnent l’inscription, les demandes par e-mail et vos choix de
              mesure d’audience sur le site Rappel Beauty.
            </p>
          </div>
          <div className="pv-hero-art">
            <div className="pv-photo-frame">
              <Image
                src="/brand/about-professional.webp"
                alt="Illustration d’une professionnelle de la beauté utilisant une tablette"
                width={1448}
                height={1086}
                sizes="(max-width: 760px) 100vw, 55vw"
                priority
              />
            </div>
            <div className="pv-shield" aria-hidden="true">
              <ShieldCheck />
              <span>
                <LockKeyhole />
              </span>
            </div>
            <SpaCutout className="pv-spa" sizes="(max-width: 760px) 100px, 180px" />
          </div>
        </section>
        <div className="pv-content">
          <aside className="pv-sidebar">
            <nav className="pv-toc" aria-label="Sommaire de la politique de confidentialité">
              <a className="pv-toc-title" href="#politique">
                <ShieldCheck aria-hidden="true" />
                Politique de confidentialité
              </a>
              <ol>
                {SECTIONS.map(({ id, icon: Icon, title }, index) => (
                  <li key={id}>
                    <a href={`#${id}`}>
                      <Icon aria-hidden="true" />
                      <span>
                        {index + 1}. {title}
                      </span>
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#contact-confidentialite">
                    <Mail aria-hidden="true" />
                    <span>Contact</span>
                  </a>
                </li>
              </ol>
            </nav>
            <section className="pv-note" aria-labelledby="privacy-note-title">
              <div className="pv-laptop" aria-hidden="true">
                <div>
                  <ShieldCheck />
                  <LockKeyhole />
                </div>
                <span />
              </div>
              <h2 id="privacy-note-title">
                Vos données, <em>vos questions</em>
              </h2>
              <CheckList
                items={[
                  "Des fiches clientes textuelles en V1",
                  "Des espaces distincts pour les instituts",
                  "Un contact pour exercer vos droits",
                ]}
              />
            </section>
          </aside>
          <article className="pv-sections" aria-label="Texte de la politique de confidentialité">
            {SECTIONS.map(({ id, icon: Icon, title, content }, index) => (
              <section id={id} className="pv-policy-card" key={id}>
                <span className="pv-card-icon">
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <h2>
                    {index + 1}. {title}
                  </h2>
                  {content}
                </div>
              </section>
            ))}
            <section
              id="contact-confidentialite"
              className="pv-contact"
              aria-labelledby="privacy-contact-title"
            >
              <span className="pv-card-icon">
                <Mail aria-hidden="true" />
              </span>
              <div>
                <h2 id="privacy-contact-title">Nous contacter</h2>
                <p>Pour vos questions et vos demandes relatives aux données personnelles :</p>
                <div className="pv-contact-links">
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
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}
