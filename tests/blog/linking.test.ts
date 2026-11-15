import { describe, expect, it } from "vitest";
import { BLOG_DRAFTS } from "@/lib/blog/articles";
import { blogCategory } from "@/lib/blog/categories";
import { getRelatedArticles, withInternalLinks } from "@/lib/blog/linking";
import type { BlogArticle } from "@/lib/blog/types";

function slugs(articles: BlogArticle[]) {
  return articles.map((article) => article.slug);
}

function assertAvailableLinks(catalogue: BlogArticle[], article: BlogArticle) {
  const related = getRelatedArticles(catalogue, article);
  expect(related.length).toBeLessThanOrEqual(3);
  expect(new Set(slugs(related)).size).toBe(related.length);
  expect(slugs(related)).not.toContain(article.slug);
  expect(
    related.every((candidate) => catalogue.some((source) => source.slug === candidate.slug)),
  ).toBe(true);
  return related;
}

describe("Maillage des guides", () => {
  it("relie chaque guide à trois sujets de son thème et donne au moins deux liens entrants à chacun", () => {
    const incoming = new Map(BLOG_DRAFTS.map((article) => [article.slug, 0]));
    for (const article of BLOG_DRAFTS) {
      const related = assertAvailableLinks(BLOG_DRAFTS, article);
      expect(related).toHaveLength(3);
      expect(related.every((candidate) => candidate.category === article.category)).toBe(true);
      for (const candidate of related)
        incoming.set(candidate.slug, incoming.get(candidate.slug)! + 1);
    }
    for (const article of BLOG_DRAFTS)
      expect(incoming.get(article.slug), article.slug).toBeGreaterThanOrEqual(2);
  });

  it("conserve les mêmes suggestions lorsque l’ordre d’arrivée du catalogue change", () => {
    const reversed = [...BLOG_DRAFTS].reverse();
    const rotated = [...BLOG_DRAFTS.slice(37), ...BLOG_DRAFTS.slice(0, 37)];
    for (const article of BLOG_DRAFTS) {
      const expected = slugs(getRelatedArticles(BLOG_DRAFTS, article));
      expect(slugs(getRelatedArticles(reversed, article))).toEqual(expected);
      expect(slugs(getRelatedArticles(rotated, article))).toEqual(expected);
    }
  });

  it("ne propose rien quand le catalogue est vide ou ne contient que le guide courant", () => {
    expect(getRelatedArticles([], BLOG_DRAFTS[0])).toEqual([]);
    expect(getRelatedArticles([BLOG_DRAFTS[0]], BLOG_DRAFTS[0])).toEqual([]);
    expect(getRelatedArticles([BLOG_DRAFTS[0], BLOG_DRAFTS[0]], BLOG_DRAFTS[0])).toEqual([]);
  });

  it("gère deux guides du même thème et déduplique les entrées répétées", () => {
    const pair = BLOG_DRAFTS.slice(0, 2);
    expect(getRelatedArticles(pair, pair[0])).toEqual([pair[1]]);
    expect(getRelatedArticles(pair, pair[1])).toEqual([pair[0]]);
    expect(getRelatedArticles([pair[0], pair[1], pair[1]], pair[0])).toEqual([pair[1]]);
  });

  it("ne crée aucune adresse inexistante dans un catalogue partiel avec peu de guides par thème", () => {
    const catalogue = [BLOG_DRAFTS[0], BLOG_DRAFTS[1], BLOG_DRAFTS[10], BLOG_DRAFTS[20]];
    for (const article of catalogue) assertAvailableLinks(catalogue, article);
    expect(slugs(getRelatedArticles(catalogue, catalogue[0]))).toContain(catalogue[1].slug);
  });

  it("ne remplit pas les suggestions avec des guides sans rapport quand aucun thème ne correspond", () => {
    const article = {
      ...BLOG_DRAFTS[0],
      slug: "guide-agenda",
      category: "rendez-vous",
      title: "Agenda",
      answer: "Planning",
    };
    const unrelated = {
      ...BLOG_DRAFTS[1],
      slug: "guide-jardin",
      category: "stock",
      title: "Botanique",
      answer: "Horticulture",
    };
    expect(getRelatedArticles([article, unrelated], article)).toEqual([]);
  });

  it("préserve les articles et leur ordre sans mutation lors du calcul des suggestions", () => {
    const catalogue = structuredClone(BLOG_DRAFTS);
    const before = structuredClone(catalogue);
    for (const article of catalogue) getRelatedArticles(catalogue, article);
    expect(catalogue).toEqual(before);
  });
});

describe("Liens vers les pages produit", () => {
  it("conserve les liens éditoriaux et ajoute le hub ainsi que la page métier de chaque thème", () => {
    for (const article of BLOG_DRAFTS) {
      const enriched = withInternalLinks(article);
      for (const link of article.links) expect(enriched.links).toContainEqual(link);
      expect(enriched.links.map((link) => link.href)).toContain(
        blogCategory(article.category).href,
      );
      expect(enriched.links.map((link) => link.href)).toContain("/solutions/institut-beaute/");
      expect(new Set(enriched.links.map((link) => link.href)).size).toBe(enriched.links.length);
      expect(enriched.links.every((link) => link.label.trim().length > 0)).toBe(true);
    }
  });

  it("ne duplique pas les liens du hub ou de la page métier et garde leur libellé éditorial", () => {
    const categoryHref = blogCategory(BLOG_DRAFTS[0].category).href;
    const links = [
      { href: categoryHref, label: "Mon lien métier personnalisé" },
      { href: "/solutions/institut-beaute/", label: "Mon lien produit personnalisé" },
      { href: categoryHref, label: "Une destination déjà présente" },
      { href: "/contact/", label: "Contacter notre équipe" },
    ];
    const article = { ...BLOG_DRAFTS[0], links };
    const before = structuredClone(article);
    const enriched = withInternalLinks(article);
    expect(enriched.links).toEqual([links[0], links[1], links[3]]);
    expect(withInternalLinks(enriched)).toEqual(enriched);
    expect(article).toEqual(before);
    expect(enriched).not.toBe(article);
    expect(enriched.links).not.toBe(article.links);
  });
});
