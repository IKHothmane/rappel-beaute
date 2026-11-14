import "server-only";
import { listPublishedArticles } from "@/lib/db/blog";

/**
 * Vitrine : uniquement les articles relus et publiés dans le stockage éditorial.
 * Les brouillons du code restent des propositions. Retirer un article dans
 * l’administration (statut brouillon, sans relecteur) le retire aussi d’ici.
 */
export async function publishedArticles() {
  return listPublishedArticles();
}
