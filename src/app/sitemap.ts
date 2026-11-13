import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { publishedArticles } from "@/lib/blog/public";

export const dynamic = "force-dynamic";

const entries: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/solutions/institut-beaute/", priority: 0.9, changeFrequency: "weekly" },
  { path: "/fonctionnalites/", priority: 0.9, changeFrequency: "monthly" },
  { path: "/blog/", priority: 0.7, changeFrequency: "weekly" },
  { path: "/creation-site-web/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tarifs/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/gestion-rendez-vous/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/gestion-stock/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/caisse/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/reservation-en-ligne/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/fidelite/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/gestion-clientes/", priority: 0.8, changeFrequency: "monthly" },
  { path: "/whatsapp/", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq/", priority: 0.6, changeFrequency: "monthly" },
  { path: "/professionnel/", priority: 0.6, changeFrequency: "monthly" },
  { path: "/demo/", priority: 0.5, changeFrequency: "monthly" },
  { path: "/a-propos/", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact/", priority: 0.4, changeFrequency: "monthly" },
  { path: "/mentions-legales/", priority: 0.2, changeFrequency: "monthly" },
  { path: "/confidentialite/", priority: 0.2, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await publishedArticles();
  return [
    ...entries.map((entry) => ({
      url: absoluteUrl(entry.path),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/blog/${article.slug}/`),
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
