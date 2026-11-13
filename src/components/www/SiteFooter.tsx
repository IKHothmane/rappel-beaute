import Image from "next/image";
import Link from "next/link";
import { BookOpen, Building2, Heart, Layers, LayoutGrid, Mail } from "lucide-react";
import { BrandLogo } from "@/components/www/BrandLogo";
import { FooterEmailForm } from "@/components/www/FooterEmailForm";
import { AudiencePreferencesButton } from "@/components/www/AudiencePreferences";
import { SITE } from "@/lib/site";
import "./site-footer.css";

const COLUMNS = [
  {
    title: "Solutions",
    icon: Layers,
    links: [
      { href: "/solutions/institut-beaute/", label: "Institut de beauté" },
      { href: "/gestion-clientes/", label: "Gestion des clientes" },
      { href: "/gestion-rendez-vous/", label: "Gestion des rendez-vous" },
      { href: "/reservation-en-ligne/", label: "Réservation en ligne" },
      { href: "/fidelite/", label: "Fidélité clientes" },
      { href: "/professionnel/", label: "Espace professionnel" },
    ],
  },
  {
    title: "Fonctionnalités",
    icon: LayoutGrid,
    links: [
      { href: "/fonctionnalites/#rdv", label: "Agenda & réservations" },
      { href: "/fonctionnalites/#clientes", label: "Clientes & fidélité" },
      { href: "/fonctionnalites/#caisse", label: "Caisse & paiements" },
      { href: "/fonctionnalites/#stock", label: "Produits & stock" },
      { href: "/fonctionnalites/#equipe", label: "Équipe & planning" },
      { href: "/fonctionnalites/#analytics", label: "Analytics & rapports" },
    ],
  },
  {
    title: "Ressources",
    icon: BookOpen,
    links: [
      { href: "/ressources/", label: "Centre d’aide" },
      { href: "/fonctionnalites/", label: "Découvrir le logiciel" },
      { href: "/faq/", label: "FAQ" },
      { href: "/blog/", label: "Blog — conseils & guides" },
      { href: "/whatsapp/", label: "Conseils WhatsApp" },
      { href: "/demo/", label: "Démonstration" },
    ],
  },
  {
    title: "Entreprise",
    icon: Building2,
    links: [
      { href: "/a-propos/", label: "À propos" },
      { href: "/contact/", label: "Contact" },
      { href: "/demo/", label: "Demander une démo" },
      { href: "/connexion/", label: "Se connecter" },
    ],
  },
] as const;

const SOCIAL_ICONS = {
  WhatsApp: (
    <>
      <path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5Z" />
      <path
        d="m8.3 7.5 1.8 2-1 1.2a8 8 0 0 0 4.2 3.8l1.1-1.1 2 1.5c-.8 3-4.4 1.8-6.7-.2S5.8 9 8.3 7.5Z"
        strokeWidth="1.4"
      />
    </>
  ),
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  Facebook: (
    <path
      d="M14 22v-9h3l.5-4H14V6.5c0-1.1.3-1.5 1.7-1.5H18V1.4A23 23 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  LinkedIn: (
    <>
      <circle cx="5" cy="5" r="2" fill="currentColor" stroke="none" />
      <path
        d="M3 9h4v12H3Zm7 0h4v1.6c.8-1.2 1.8-1.9 3.3-1.9 3 0 3.7 2 3.7 5V21h-4v-6.1c0-1.5-.2-2.5-1.5-2.5S14 13.5 14 15V21h-4Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  YouTube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" stroke="none" />
      <path d="m10 9 5 3-5 3Z" fill="#fbe1ec" stroke="none" />
    </>
  ),
};

export function SiteFooter() {
  return (
    <footer className="site-footer" data-footer>
      <div className="footer-container">
        <div className="footer-columns">
          <div className="footer-brand">
            <BrandLogo height={34} />
            <p>
              Le logiciel tout-en-un pour les instituts de beauté : rendez-vous, clientes, caisse,
              stock, équipe, fidélité et plus encore.
            </p>
            <div className="footer-socials" aria-label="Réseaux sociaux">
              {Object.entries(SOCIAL_ICONS).map(([label, icon]) => (
                <span key={label} role="img" aria-label={label}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {icon}
                  </svg>
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map(({ title, icon: Icon, links }) => (
            <nav key={title} className="footer-navigation" aria-label={title}>
              <h2>
                <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                <span>{title}</span>
              </h2>
              <ul>
                {links.map(({ href, label }) => (
                  <li key={label}>
                    <Link prefetch={false} href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="footer-news">
            <h2>
              <Mail size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>Restez informé(e)</span>
            </h2>
            <p>Recevez nos nouveautés, conseils et offres spéciales.</p>
            <FooterEmailForm />
            <Image
              src="/brand/footer-spa-cutout.png"
              alt=""
              width={1774}
              height={887}
              sizes="180px"
              className="footer-spa-art"
            />
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © 2026 <strong>{SITE.name}.</strong> Tous droits réservés.
          </p>
          <nav className="footer-legal" aria-label="Informations légales">
            <Link prefetch={false} href="/tarifs/">Tarifs et offre</Link>
            <Link prefetch={false} href="/confidentialite/">Politique de confidentialité</Link>
            <Link prefetch={false} href="/mentions-legales/">Mentions légales</Link>
            <AudiencePreferencesButton />
          </nav>
          <p className="footer-origin">
            <svg width="22" height="15" viewBox="0 0 30 20" role="img" aria-label="Maroc">
              <rect width="30" height="20" rx="2" fill="#c1272d" />
              <path
                d="m15 4 3.5 11-9.1-6.8h11.2L11.5 15Z"
                fill="none"
                stroke="#006233"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            Made in Morocco
            <Heart size={16} strokeWidth={1.5} aria-hidden="true" />
          </p>
        </div>
      </div>
    </footer>
  );
}
