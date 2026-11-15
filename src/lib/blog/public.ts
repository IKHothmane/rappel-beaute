import "server-only";
import { listPublishedArticles } from "@/lib/db/blog";
import { BLOG_DRAFTS } from "@/lib/blog/articles";
import { validateBlogContent } from "@/lib/blog/validation";

/**
 * Les guides du catalogue sont publics immédiatement, sans étape de publication.
 * Une version éditoriale publique remplace le guide de même adresse ; les autres
 * articles publiés sont conservés. Le statut interne des guides n'est pas modifié.
 * Les règles de lecture du stockage éditorial restent appliquées par la base.
 */
export async function publishedArticles() {
  const articles = new Map(
    BLOG_DRAFTS.filter((article) => !validateBlogContent(article)).map((article) => [
      article.slug,
      article,
    ]),
  );
  try {
    for (const article of await listPublishedArticles()) {
      articles.set(article.slug, article);
    }
  } catch {
    console.warn("[blog] Stockage éditorial indisponible ; affichage du catalogue intégré.");
  }
  return [...articles.values()];
}
