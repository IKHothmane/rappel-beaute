import { editorialQuestionKey } from "./articles";
import { blogCategory } from "./categories";
import type { BlogArticle } from "./types";

const stopWords = new Set([
  "comment", "pour", "dans", "institut", "instituts", "beaute", "cliente", "clientes",
  "quels", "quelle", "quelles", "avec", "sans", "votre", "vous", "plus", "comme",
  "peut", "sont", "faire", "entre", "avant", "apres",
]);

function words(value: string): Set<string> {
  return new Set(
    editorialQuestionKey(value).split(" ").filter((word) => word.length >= 4 && !stopWords.has(word)),
  );
}

/** Deux voisins par thème répartissent les liens sur tous les guides du catalogue. */
export function getRelatedArticles(articles: BlogArticle[], article: BlogArticle): BlogArticle[] {
  const available = [...new Map(articles.map((candidate) => [candidate.slug, candidate])).values()];
  const category = available
    .filter((candidate) => candidate.category === article.category)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const index = category.findIndex((candidate) => candidate.slug === article.slug);
  const selected = new Map<string, BlogArticle>();
  const add = (candidate: BlogArticle | undefined) => {
    if (candidate && candidate.slug !== article.slug) selected.set(candidate.slug, candidate);
  };

  if (index >= 0 && category.length > 1) {
    add(category[(index - 1 + category.length) % category.length]);
    add(category[(index + 1) % category.length]);
  }

  const terms = words(`${article.title} ${article.answer}`);
  const ranked = available
    .filter((candidate) => candidate.slug !== article.slug && !selected.has(candidate.slug))
    .map((candidate) => {
      const title = words(candidate.title);
      const content = words(`${candidate.title} ${candidate.answer}`);
      const score = [...terms].reduce(
        (total, word) => total + Number(content.has(word)) + 2 * Number(title.has(word)),
        0,
      );
      return { candidate, score };
    })
    .filter(({ candidate, score }) => candidate.category === article.category || score > 0)
    .sort((a, b) =>
      Number(b.candidate.category === article.category) - Number(a.candidate.category === article.category)
      || b.score - a.score
      || a.candidate.slug.localeCompare(b.candidate.slug),
    );

  for (const { candidate } of ranked) {
    if (selected.size >= 3) break;
    add(candidate);
  }
  return [...selected.values()];
}

/** Conserve les liens éditoriaux et ajoute les destinations produit utiles au thème. */
export function withInternalLinks(article: BlogArticle): BlogArticle {
  const category = blogCategory(article.category);
  const links = new Map<string, BlogArticle["links"][number]>();
  for (const link of [
    ...article.links,
    { href: category.href, label: category.linkLabel },
    { href: "/solutions/institut-beaute/", label: "Découvrir le logiciel de gestion pour institut de beauté" },
  ]) {
    if (!links.has(link.href)) links.set(link.href, link);
  }
  return { ...article, links: [...links.values()] };
}
