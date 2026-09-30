import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/domains/",
        "/dashboard/",
        "/login/",
        "/connexion/",
        "/forgot-password/",
        "/changer-mot-de-passe/",
        "/activate/",
        "/reset-password/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
