import type { Metadata } from "next";
import { FAQ_ITEMS, PUBLIC_OFFER, SITE, SOCIAL_PROFILES } from "@/lib/site";

export function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE.url}/`;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Identité publique : une seule Organization, un seul WebSite, un seul SoftwareApplication. */
function getOrganizationStructuredData() {
  const telephone = SITE.phoneInternational;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        url: `${SITE.url}/`,
        logo: `${SITE.url}/brand/logo.webp`,
        description:
          "Rappel Beauty est un logiciel de gestion pour les instituts de beauté au Maroc.",
        email: SITE.email,
        ...(SOCIAL_PROFILES.length ? { sameAs: [...SOCIAL_PROFILES] } : {}),
        telephone,
        areaServed: {
          "@type": "Country",
          name: "Morocco",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: `${SITE.url}/`,
        name: SITE.name,
        publisher: {
          "@id": `${SITE.url}/#organization`,
        },
        inLanguage: "fr-MA",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE.url}/#software`,
        name: SITE.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${SITE.url}/`,
        description:
          "Logiciel de gestion pour les instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne.",
        offers: [
          offerSpec("Mensuel", PUBLIC_OFFER.monthlyPrice, "MON"),
          offerSpec("Annuel", PUBLIC_OFFER.annualPrice, "ANN"),
        ],
      },
    ],
  };
}

/** Deux offres distinctes (mois / an), pas deux prix mensuels concurrents. */
function offerSpec(label: "Mensuel" | "Annuel", price: number, unitCode: "MON" | "ANN") {
  return {
    "@type": "Offer",
    name: `${PUBLIC_OFFER.name} — ${label}`,
    price: String(price),
    priceCurrency: PUBLIC_OFFER.currency,
    url: `${SITE.url}/tarifs/`,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: String(price),
      priceCurrency: PUBLIC_OFFER.currency,
      unitCode,
      referenceQuantity: {
        "@type": "QuantitativeValue",
        value: 1,
        unitCode,
      },
    },
  };
}

/** Title, description, canonical, Open Graph et Twitter à partir des mêmes textes. */
export function marketingPageMetadata(input: {
  title: string;
  description: string;
  canonical: string;
}): Metadata {
  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: { canonical: input.canonical },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.canonical,
      images: [
        {
          url: "/brand/og-default.jpg",
        width: 1200,
        height: 630,
          alt: "Rappel Beauty — logiciel de gestion pour instituts de beauté au Maroc",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: ["/brand/og-default.jpg"],
    },
  };
}

/** Conservé pour le layout vitrine : même graphe, pas un second JSON-LD. */
export function marketingJsonLd() {
  return getOrganizationStructuredData();
}

/** JSON-LD FAQPage à partir d'entrées `{ question, answer }`. */
export function faqPageJsonLd(faqs: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function faqJsonLd() {
  return faqPageJsonLd(FAQ_ITEMS.map((item) => ({ question: item.q, answer: item.a })));
}
