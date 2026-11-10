import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Plan 3D autonome (/vendor/*.js, /salon-3d.css) — pas de CDN
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https: https://cloudflareinsights.com",
            // iframe Plan 3D (/salon-3d.html) + cartes / GTM
            "frame-src 'self' https://www.openstreetmap.org https://www.googletagmanager.com",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ]
    : []),
];

const nextConfig = {
  // Keep verification builds separate from a running local development server.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["web-push", "sharp"],
    instrumentationHook: true,
  },
  images: {
    // Défaut Next = 60s → Sharp ré-encode en boucle (bots) et RSS monte (libvips).
    minimumCacheTTL: 31 * 24 * 60 * 60,
    // Évite les variantes 3840px inutiles sur le marketing / vitrine.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      // Pages retirées du site marketing
      {
        source: "/ressources",
        destination: "/faq/",
        permanent: true,
      },
      {
        source: "/ressources/",
        destination: "/faq/",
        permanent: true,
      },
      {
        source: "/blog",
        destination: "/faq/",
        permanent: true,
      },
      {
        source: "/blog/",
        destination: "/faq/",
        permanent: true,
      },
      {
        source: "/instituts",
        destination: "/",
        permanent: true,
      },
      {
        source: "/instituts/",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    const ignored = [
      "**/node_modules/**",
      "**/waiting-list/**",
      "**/waiting-list",
      "**/domains/app/invoices/**",
    ];
    config.watchOptions = {
      ...config.watchOptions,
      ignored,
    };
    // Le disque D: est en FAT32 : readlink y renvoie EISDIR et fait échouer
    // le snapshot webpack (next/dist/pages/_app.js). Linux/Railway n'est pas concerné.
    if (process.platform === "win32") {
      config.resolve.symlinks = false;
      config.cache = false;
    }
    return config;
  },
};

// Suivi des erreurs. Sans SENTRY_DSN rien n'est envoyé ; sans SENTRY_AUTH_TOKEN aucune source map n'est téléversée.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  disableLogger: true,
  widenClientFileUpload: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
