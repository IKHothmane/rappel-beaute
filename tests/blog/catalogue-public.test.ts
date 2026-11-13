import { describe, expect, it } from "vitest";
import { BLOG_DRAFTS } from "@/lib/blog/articles";
import { publishedArticles } from "@/lib/blog/public";
import sitemap from "@/app/sitemap";

describe("Catalogue de la vitrine", () => {
  it("rend les 110 guides accessibles sans stockage ni accès administrateur", async () => {
    const articles = await publishedArticles();
    expect(articles).toHaveLength(110);
    expect(new Set(articles.map((article) => article.slug)).size).toBe(110);
    expect(articles.every((article) => article.status === "published")).toBe(true);
    expect(articles.every((article) => article.publishedAt && article.reviewedBy === null)).toBe(
      true,
    );
    expect(BLOG_DRAFTS.every((article) => article.status === "draft")).toBe(true);
  });
  it("inclut les 110 pages de guides dans le sitemap sans doublon ni accès privé", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://rappelbeauty.com/blog/");
    for (const article of await publishedArticles()) {
      expect(urls).toContain(`https://rappelbeauty.com/blog/${article.slug}/`);
    }
    expect(
      urls.filter(
        (url) => new URL(url).pathname.startsWith("/blog/") && new URL(url).pathname !== "/blog/",
      ),
    ).toHaveLength(110);
    expect(
      urls.every((url) => !/[?#]/.test(url) && !/\/(?:admin|api|domains|connexion)\//.test(url)),
    ).toBe(true);
  });
});
