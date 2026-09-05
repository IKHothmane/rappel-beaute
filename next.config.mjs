/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        },
      ]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  poweredByHeader: false,
  async redirects() {
    return [
      // Anciennes pages SEO → ancres /fonctionnalites/
      {
        source: "/gestion-rendez-vous",
        destination: "/fonctionnalites/#rdv",
        permanent: true,
      },
      {
        source: "/gestion-rendez-vous/",
        destination: "/fonctionnalites/#rdv",
        permanent: true,
      },
      {
        source: "/gestion-clientes",
        destination: "/fonctionnalites/#clientes",
        permanent: true,
      },
      {
        source: "/gestion-clientes/",
        destination: "/fonctionnalites/#clientes",
        permanent: true,
      },
      {
        source: "/gestion-stock",
        destination: "/fonctionnalites/#stock",
        permanent: true,
      },
      {
        source: "/gestion-stock/",
        destination: "/fonctionnalites/#stock",
        permanent: true,
      },
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
};

export default nextConfig;
