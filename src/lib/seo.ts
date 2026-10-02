import { FAQ_ITEMS, PUBLIC_OFFER, SITE } from "@/lib/site";

export function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE.url}/`;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Identité publique : une seule Organization, un seul WebSite, un seul SoftwareApplication. */
export function getOrganizationStructuredData() {
  const telephone = SITE.phone.replace(/\s/g, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        url: `${SITE.url}/`,
        logo: `${SITE.url}/brand/logo.png`,
        description:
          "Rappel Beauty est un logiciel de gestion pour les instituts de beauté au Maroc.",
        email: SITE.email,
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
          {
            "@type": "Offer",
            name: `${PUBLIC_OFFER.name} — Mensuel`,
            price: String(PUBLIC_OFFER.price),
            priceCurrency: PUBLIC_OFFER.currency,
            url: `${SITE.url}/tarifs/`,
          },
          {
            "@type": "Offer",
            name: `${PUBLIC_OFFER.name} — Annuel`,
            price: String(PUBLIC_OFFER.yearlyPrice),
            priceCurrency: PUBLIC_OFFER.currency,
            url: `${SITE.url}/tarifs/`,
          },
        ],
      },
    ],
  };
}

/** Conservé pour le layout vitrine : même graphe, pas un second JSON-LD. */
export function marketingJsonLd() {
  return getOrganizationStructuredData();
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
