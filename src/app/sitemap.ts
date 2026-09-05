import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

const paths = [
  "/",
  "/fonctionnalites/",
  "/solutions/institut-beaute/",
  "/gestion-rendez-vous/",
  "/gestion-stock/",
  "/gestion-clientes/",
  "/whatsapp/",
  "/a-propos/",
  "/faq/",
  "/contact/",
  "/mentions-legales/",
  "/confidentialite/",
  "/demo/",
  "/essai/",
  "/professionnel/",
  "/connexion/",
  "/ressources/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
