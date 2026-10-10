/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
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
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: https://cloudflareinsights.com; frame-src https://www.openstreetmap.org https://www.googletagmanager.com; base-uri 'self'; form-action 'self'",
        },
      ]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["web-push"],
  },
  images: {
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

export default nextConfig;
