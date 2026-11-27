import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLOG_DRAFTS } from "@/lib/blog/articles";
import { articleMetadata } from "@/lib/blog/seo";
import type { BlogArticle } from "@/lib/blog/types";

const editorial = vi.hoisted(() => ({ published: vi.fn() }));
vi.mock("@/lib/db/blog", () => ({ listPublishedArticles: editorial.published }));

import { publishedArticles } from "@/lib/blog/public";
import sitemap from "@/app/sitemap";
import guide from "@/lib/guide/content.json";

// 130 URL historiques + l’accueil du guide d’utilisation + une page par chapitre.
const SITEMAP_SIZE = 130 + 1 + guide.chapters.length;

beforeEach(() => {
  editorial.published.mockReset();
  editorial.published.mockResolvedValue([]);
});

function publishedArticle(overrides: Partial<BlogArticle> = {}): BlogArticle {
  return {
    ...BLOG_DRAFTS[0],
    status: "published",
    reviewedBy: "relecteur-authentifie",
    publishedAt: "2026-11-15T12:00:00Z",
    version: 1,
    ...overrides,
  };
}

describe("Catalogue public", () => {
  it("rend les 110 guides du code accessibles sans article en base, sans inventer de relecture", async () => {
    const articles = await publishedArticles();
    expect(articles).toHaveLength(110);
    expect(new Set(articles.map((article) => article.slug)).size).toBe(110);
    for (const source of BLOG_DRAFTS) {
      expect(articles.find((article) => article.slug === source.slug)).toEqual(source);
    }
    expect(articles.every((article) => article.status === "draft")).toBe(true);
    expect(articles.every((article) => article.reviewedBy === null)).toBe(true);
    expect(articles.every((article) => article.publishedAt === null)).toBe(true);
  });

  it("génère des URL uniques, dont les 110 guides, sans exposer de route privée", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toHaveLength(SITEMAP_SIZE);
    expect(new Set(urls).size).toBe(SITEMAP_SIZE);
    expect(urls).toContain("https://rappelbeauty.com/blog/");
    for (const article of BLOG_DRAFTS) {
      expect(urls).toContain(`https://rappelbeauty.com/blog/${article.slug}/`);
    }
    expect(
      urls.filter(
        (url) => new URL(url).pathname.startsWith("/blog/") && new URL(url).pathname !== "/blog/",
      ),
    ).toHaveLength(110);
    expect(
      urls.every(
        (url) => !/[?#]/.test(url) && !/\/(?:admin|api|domains|connexion|agenda|carte)\//.test(url),
      ),
    ).toBe(true);
  });

  it("conserve les guides et toutes leurs URL si le stockage éditorial est indisponible", async () => {
    editorial.published.mockRejectedValue(new Error("Stockage indisponible"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(await publishedArticles()).toHaveLength(110);
      expect(await sitemap()).toHaveLength(SITEMAP_SIZE);
    } finally {
      warning.mockRestore();
    }
  });

  it("privilégie une version éditoriale publiée sans dupliquer son adresse", async () => {
    const override = publishedArticle({
      title: "Une version éditoriale mise à jour pour votre institut",
    });
    editorial.published.mockResolvedValue([override]);
    const articles = await publishedArticles();
    expect(articles).toHaveLength(110);
    expect(articles.filter((article) => article.slug === override.slug)).toEqual([override]);
    expect(
      (await sitemap()).filter((entry) => entry.url.endsWith(`/blog/${override.slug}/`)),
    ).toHaveLength(1);
    expect(BLOG_DRAFTS[0].status).toBe("draft");
    expect(BLOG_DRAFTS[0].reviewedBy).toBeNull();
  });

  it("retire un article éditorial supplémentaire quand le stockage public ne le retourne plus", async () => {
    const extra = publishedArticle({ slug: "guide-editorial-supplementaire" });
    editorial.published.mockResolvedValue([extra]);
    expect(await publishedArticles()).toHaveLength(111);
    expect((await sitemap()).map((entry) => entry.url)).toContain(
      `https://rappelbeauty.com/blog/${extra.slug}/`,
    );

    editorial.published.mockResolvedValue([]);
    expect(await publishedArticles()).toHaveLength(110);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toHaveLength(SITEMAP_SIZE);
    expect(urls).not.toContain(`https://rappelbeauty.com/blog/${extra.slug}/`);
  });

  it.each(["draft", "published"] as const)(
    "indexe un guide public même si ses métadonnées éditoriales indiquent %s",
    (status) => {
      const article = { ...BLOG_DRAFTS[0], status };
      expect(articleMetadata(article).robots).toMatchObject({ index: true, follow: true });
      expect(articleMetadata(article).alternates?.canonical).toBe(`/blog/${article.slug}/`);
    },
  );
});
