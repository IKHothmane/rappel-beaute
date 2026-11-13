import { BLOG_DRAFTS } from "@/lib/blog/articles";
import type { BlogArticle } from "@/lib/blog/types";

/** Catalogue public demandé pour la vitrine, indépendant du stockage administratif. */
export const PUBLIC_BLOG_ARTICLES: BlogArticle[] = BLOG_DRAFTS.map((article) => ({
  ...article,
  status: "published",
  publishedAt: "2026-11-13T00:00:00.000Z",
  // La mise à disposition est demandée par le propriétaire ; aucun faux compte de relecteur.
  reviewedBy: null,
}));
export async function publishedArticles() {
  return PUBLIC_BLOG_ARTICLES;
}
