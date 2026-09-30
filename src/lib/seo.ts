import { FAQ_ITEMS, PLANS, SITE } from "@/lib/site";

export function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE.url}/`;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Organisation + logiciel, affichés sur les pages vitrine. */
export function marketingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        url: `${SITE.url}/`,
        email: SITE.email,
        logo: `${SITE.url}/brand/logo.png`,
        areaServed: { "@type": "Country", name: "Maroc" },
        address: {
          "@type": "PostalAddress",
          addressCountry: "MA",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        name: SITE.name,
        url: `${SITE.url}/`,
        inLanguage: "fr-MA",
        publisher: { "@id": `${SITE.url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE.url}/#software`,
        name: SITE.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr-MA",
        url: `${SITE.url}/`,
        description:
          "Logiciel de gestion pour institut de beauté au Maroc : agenda, réservation, clientes, stock, caisse et WhatsApp manuel. Prix en MAD.",
        areaServed: { "@type": "Country", name: "Maroc" },
        offers: PLANS.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: String(plan.price),
          priceCurrency: "MAD",
          url: `${SITE.url}/tarifs/`,
        })),
        publisher: { "@id": `${SITE.url}/#organization` },
      },
    ],
  };
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
