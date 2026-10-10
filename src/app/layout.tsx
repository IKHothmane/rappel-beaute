import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import "./globals.css";

const GTM_ID = "GTM-WZGGKNPG";
const GA_ID = "G-SNZEX2P7KK";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),

  title: {
    default: "Logiciel de gestion pour institut de beauté au Maroc | Rappel Beauty",
    template: "%s · Rappel Beauty",
  },

  description:
    "Rappel Beauty est le logiciel de gestion pour instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne.",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }],
    apple: [{ url: "/brand/logo.png", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "Rappel Beauty",
    statusBarStyle: "default",
  },

  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: SITE.url,
    siteName: SITE.name,
    title: "Logiciel de gestion pour institut de beauté au Maroc | Rappel Beauty",
    description:
      "Gérez vos rendez-vous, clientes, équipe, stock, caisse et réservation en ligne depuis une seule plateforme.",
    images: [
      {
        url: "/brand/logo.png",
        alt: "Rappel Beauty — logiciel de gestion pour instituts de beauté au Maroc",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Logiciel de gestion pour institut de beauté au Maroc | Rappel Beauty",
    description:
      "Gérez vos rendez-vous, clientes, équipe, stock, caisse et réservation en ligne.",
    images: ["/brand/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr-MA"
      className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
