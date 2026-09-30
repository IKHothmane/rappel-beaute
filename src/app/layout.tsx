import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

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
    default: "Logiciel institut de beauté au Maroc | Rappel Beauty",
    template: "%s · Rappel Beauty",
  },

  description:
    "Rappel Beauty est le logiciel de gestion pour instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, ventes, fidélité et réservation en ligne.",

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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/brand/logo.png", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },

  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: SITE.url,
    siteName: SITE.name,
    title: "Logiciel institut de beauté au Maroc | Rappel Beauty",
    description:
      "Gérez vos rendez-vous, clientes, équipe, stock, caisse, ventes et réservation en ligne depuis une seule plateforme.",
    images: [
      {
        url: "/brand/logo.png",
        alt: "Rappel Beauty — logiciel de gestion pour instituts de beauté au Maroc",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Logiciel institut de beauté au Maroc | Rappel Beauty",
    description:
      "Gérez vos rendez-vous, clientes, équipe, stock, caisse, ventes et réservation en ligne.",
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
    >
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
