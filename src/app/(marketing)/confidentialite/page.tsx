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
    "Traitement des données personnelles Rappel Beauté — loi 09-08, CNDP. Aucune photo cliente en V1.",
  canonical: "/confidentialite/",
});
const SECTIONS = [
  {
    id: "responsable",
    icon: Users,
    title: "Responsable de traitement",
    content: (
      <p>
        Rappel Beauté, <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Déclaration CNDP : à
        déposer avant le traitement opérationnel des fiches clientes en production.
      </p>
    ),
  },
  {
    id: "donnees-collectees",
    icon: Database,
    title: "Données collectées sur la vitrine",
    content: (
      <p>
        Formulaires démo / essai / contact : nom, institut, ville, téléphone, e-mail, message, plan
        souhaité. Finalité : recontact et activation d’accès sous 24 h. Base : mesures
        précontractuelles.
      </p>
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
      <p>
        La politique cookies est distincte de cette page et sera publiée avant production (mesure
        d’audience, session de connexion). En V1.2 vitrine locale : cookies techniques de
        développement uniquement (sélecteur de domaine <code>__host</code>).
      </p>
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
        Les leads vitrine ne sont pas mélangés aux données métier. En application, chaque institut
        est isolé (organizationId + RLS).
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
              Rappel Beauté traite des données d’identification pour les demandes de démo et
              d’essai. Les données métier d’institut n’apparaissent pas sur cette vitrine.
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
