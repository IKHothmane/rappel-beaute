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
  preload: false,
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
    apple: [{ url: "/brand/logo.webp", type: "image/webp" }],
    shortcut: ["/favicon.ico"],
  },

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "Rappel Beauty",
    statusBarStyle: "default",
  },

  other: {
    "mobile-web-app-capable": "yes",
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
        url: "/brand/logo.webp",
        alt: "Rappel Beauty — logiciel de gestion pour instituts de beauté au Maroc",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Logiciel de gestion pour institut de beauté au Maroc | Rappel Beauty",
    description: "Gérez vos rendez-vous, clientes, équipe, stock, caisse et réservation en ligne.",
    images: ["/brand/logo.webp"],
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
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
