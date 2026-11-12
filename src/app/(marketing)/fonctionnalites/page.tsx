import Image from "next/image";
import Link from "next/link";
import { marketingPageMetadata } from "@/lib/seo";
import { SeoCloser } from "@/components/www/SeoCloser";
import { PUBLIC_OFFER } from "@/lib/site";
import "./fonctionnalites.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Fonctionnalités du logiciel institut | Rappel Beauty",
  description:
    "Fonctionnalités Rappel Beauty : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne.",
  canonical: "/fonctionnalites/",
});

const PROMISES = ["Tout-en-un", "Simple à utiliser", "Pensé pour le Maroc"] as const;

const MODULES = [
  {
    id: "rdv",
    title: "Agenda & réservations",
    text: "Un planning clair et intelligent pour organiser vos rendez-vous et vos cabines.",
    points: [
      "Vue jour, semaine et mois",
      "Rendez-vous simultanés",
      "Gestion des cabines et des disponibilités",
    ],
    src: "/site/rappelbeauty-agenda-pc-complet-2200x1270.webp",
    alt: "Agenda de la semaine dans Rappel Beauty",
    width: 2200,
    height: 1270,
    icon: "cal",
  },
  {
    id: "clientes",
    title: "Clientes & fidélité",
    text: "Une relation client durable et plus de clientes fidèles.",
    points: [
      "Fiches clientes complètes",
      "Carte de fidélité QR (Google Wallet)",
      "Historique des soins et des achats",
    ],
    src: "/site/rappelbeauty-clientes-pc-reel.webp",
    alt: "Fiche cliente dans Rappel Beauty",
    width: 2200,
    height: 1230,
    icon: "users",
  },
  {
    id: "caisse",
    title: "Caisse, paiements & dépenses",
    text: "Encaissez, suivez vos revenus et gardez le contrôle de votre rentabilité.",
    points: [
      "Encaissements (espèces, carte, virement)",
      "Tickets de caisse et clôture du jour",
      "Suivi des dépenses et bénéfice net",
    ],
    src: "/site/rappelbeauty-caisse-pc-reel.webp",
    alt: "Caisse et ticket dans Rappel Beauty",
    width: 2200,
    height: 1250,
    icon: "card",
  },
  {
    id: "stock",
    title: "Produits, stock & achats",
    text: "Gérez vos produits, vos commandes et évitez les ruptures.",
    points: [
      "Catalogue produits et consommables",
      "Alertes de stock en temps réel",
      "Fournisseurs, bons de commande et réceptions",
    ],
    src: "/site/rappelbeauty-produits-stock-pc-reel.webp",
    alt: "Produits et stock dans Rappel Beauty",
    width: 2200,
    height: 1200,
    icon: "box",
  },
  {
    id: "equipe",
    title: "Équipe & ressources",
    text: "Organisez votre équipe et vos ressources (cabines, fauteuils, machines, etc.).",
    points: [
      "Planning et horaires de l'équipe",
      "Commissions automatiques",
      "Gestion des cabines, machines et équipements",
    ],
    src: "/site/rappelbeauty-planning-pc-reel.webp",
    alt: "Planning de l'équipe dans Rappel Beauty",
    width: 2000,
    height: 1150,
    icon: "team",
  },
  {
    id: "analytics",
    title: "Analytics, promotions & assistant IA",
    text: "Des indicateurs clairs, des campagnes efficaces et un assistant intelligent à vos côtés.",
    points: [
      "Tableaux de bord et performances",
      "Promotions et campagnes clientes (WhatsApp)",
      "Assistant IA pour vos questions métier",
    ],
    src: "/site/rappelbeauty-analytics-pc-reel.webp",
    alt: "Analyses et statistiques dans Rappel Beauty",
    width: 2200,
    height: 1260,
    icon: "chart",
  },
] as const;

const FAQ = [
  {
    q: "Rappel Beauty est-il une marketplace ?",
    a: "Non. C'est un logiciel de gestion pour l'institut. La page publique et la réservation en ligne sont des fonctions du logiciel, pas une place de marché.",
  },
  {
    q: "Les clientes paient-elles en ligne ?",
    a: "Non. Les clientes paient directement à l'institut. Le retrait des produits se fait aussi à l'institut.",
  },
  {
    q: "Comment fonctionne WhatsApp ?",
    a: "En V1, WhatsApp est assisté : le logiciel prépare le message, une personne de l'institut l'envoie. Il n'y a pas d'envoi automatique.",
  },
  {
    q: "La réservation en ligne est-elle incluse ?",
    a: "Oui. L'institut peut publier sa page, afficher ses services et ses disponibilités, et laisser ses clientes prendre rendez-vous.",
  },
] as const;

function Glyph({ name }: { name: (typeof MODULES)[number]["icon"] | "check" }) {
  const paths: Record<string, string> = {
    check: "M5 12.5l4.5 4.5L19 7.5",
    cal: "M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z",
    users:
      "M9 11a3 3 0 100-6 3 3 0 000 6zM16 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM4 19a5 5 0 0110 0M14.5 19a4 4 0 015-3.8",
    card: "M3 8h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8zM3 11h18M7 15h4",
    box: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5",
    team: "M8 11a3 3 0 100-6 3 3 0 000 6zM16 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3.5 19a4.5 4.5 0 019 0M13 19a4 4 0 016.5-3.2",
    chart: "M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-2",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[var(--vt-size-1p25rem)] w-[var(--vt-size-1p25rem)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function FonctionnalitesPage() {
  const trial = PUBLIC_OFFER.trialDays;

  return (
    <div className="fn">
      <section className="vt-wrap fn-wrap fn-hero">
        <div>
          <p className="fn-badge">
            <Glyph name="cal" />
            Fonctionnalités
          </p>
          <h1>
            Toutes les fonctions pour gérer <span>votre institut</span>
          </h1>
          <p className="fn-lead">
            Une solution complète et simple pour les instituts de beauté : réservations, clientes,
            caisse, stock, équipe, fidélité, promotions et bien plus encore.
          </p>
          <ul className="fn-promises">
            {PROMISES.map((item) => (
              <li key={item}>
                <span className="fn-mark">
                  <Glyph name="check" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="fn-actions">
            <Link href="/professionnel/">
              Essayer gratuitement {trial} jours
              <span aria-hidden>→</span>
            </Link>
            <Link href="/demo/">Voir la démo</Link>
          </div>
        </div>

        <div className="fn-hero-visual">
          <Image
            className="fn-hero-art"
            src="/brand/footer-spa-cutout.png"
            alt=""
            width={1774}
            height={887}
            sizes="180px"
          />
          <div className="fn-shot">
            <Image
              src="/site/rappelbeauty-dashboard-pc-reel.webp"
              alt="Tableau de bord Rappel Beauty sur ordinateur"
              width={2200}
              height={1270}
              sizes="(max-width: 1000px) 100vw, 58vw"
              priority
            />
          </div>
        </div>
      </section>

      <section className="vt-wrap fn-wrap fn-modules">
        <div className="fn-modules-head">
          <p className="fn-kicker">Les modules principaux</p>
          <h2>
            Des fonctionnalités complètes pour un institut <span>plus performant</span>
          </h2>
        </div>

        {MODULES.map((item, index) => (
          <article
            key={item.id}
            id={item.id}
            className={index % 2 === 1 ? "fn-module is-reverse" : "fn-module"}
          >
            <div className="fn-copy">
              <span className="fn-icon">
                <Glyph name={item.icon} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <ul className="fn-points">
                {item.points.map((point) => (
                  <li key={point}>
                    <span className="fn-mark">
                      <Glyph name="check" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="fn-shot">
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes="(max-width: 767px) 100vw, 600px"
              />
            </div>
          </article>
        ))}
      </section>

      <div className="fn-context">
        <SeoCloser
          problem="L'agenda est dans un cahier, les clientes dans WhatsApp, le stock dans un fichier et la caisse dans un autre outil. Le soir, personne ne retrouve la même journée."
          solution="Rappel Beauty réunit rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne. C'est le logiciel de l'institut, pas une place de marché."
          useCase="Une patronne à Casablanca ouvre le planning du matin, voit la cabine déjà prise, encaisse le soin à la fin et retrouve la fiche de la cliente sans changer d'application."
        />
      </div>

      <section className="vt-wrap fn-wrap fn-faq">
        <div className="fn-faq-inner">
          <h2>Questions fréquentes</h2>
          <div className="fn-faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="fn-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-[var(--vt-space-1p5rem)] text-center text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-vt-muted">
            Le détail des prix est sur la{" "}
            <Link href="/tarifs/" className="font-semibold text-vt-primary">
              page tarifs
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
