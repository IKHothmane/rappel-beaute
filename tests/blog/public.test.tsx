import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLOG_DRAFTS } from "@/lib/blog/articles";
const fakes = vi.hoisted(() => ({ published: vi.fn() }));
vi.mock("@/lib/blog/public", () => ({ publishedArticles: fakes.published }));
vi.mock("@/lib/db/blog", () => ({ listPublishedArticles: fakes.published }));
import BlogPage, { generateMetadata as indexMetadata } from "@/app/(marketing)/blog/page";
import ArticlePage, { generateMetadata as postMetadata } from "@/app/(marketing)/blog/[slug]/page";
import sitemap from "@/app/sitemap";
const articles = BLOG_DRAFTS.slice(0, 14).map((a) => ({
  ...a,
  status: "published" as const,
  reviewedBy: "reviewer",
  publishedAt: "2026-11-13T12:00:00Z",
}));
beforeEach(() => {
  fakes.published.mockResolvedValue(articles);
});
describe("Blog public et sitemap", () => {
  it("garde la page vide en noindex et exclut les brouillons du sitemap", async () => {
    fakes.published.mockResolvedValue([]);
    expect((await indexMetadata({ searchParams: {} })).robots).toMatchObject({ index: false });
    const html = renderToStaticMarkup(await BlogPage({ searchParams: {} }));
    expect(html).toContain("Les premiers guides sont en préparation");
    expect(html).not.toContain(BLOG_DRAFTS[0].answer);
    expect((await sitemap()).filter((entry) => entry.url.includes("/blog/"))).toHaveLength(1);
    await expect(ArticlePage({ params: { slug: BLOG_DRAFTS[0].slug } })).rejects.toThrow();
  });
  it("active l’indexation après publication et ajoute seulement les articles publics", async () => {
    expect((await indexMetadata({ searchParams: {} })).robots).toMatchObject({ index: true });
    const entries = await sitemap();
    expect(entries.filter((entry) => entry.url.includes("/blog/"))).toHaveLength(15);
    expect(
      entries.find((entry) => entry.url.endsWith(`/blog/${articles[0].slug}/`))?.lastModified,
    ).toBe(articles[0].updatedAt);
    expect(entries.some((entry) => entry.url.endsWith(`/blog/${BLOG_DRAFTS[30].slug}/`))).toBe(
      false,
    );
  });
  it("offre la recherche et affiche tous les guides sans pagination", async () => {
    const html = renderToStaticMarkup(
      await BlogPage({ searchParams: { q: "migration", theme: "logiciel" } }),
    );
    expect(html).toContain("migrer-donnees-logiciel-institut");
    expect(html).not.toContain("changer-logiciel-institut-sans-interruption/");
    expect((await indexMetadata({ searchParams: { q: "migration" } })).robots).toMatchObject({
      index: false,
    });
    const second = renderToStaticMarkup(await BlogPage({ searchParams: { page: "2" } }));
    expect(second).not.toContain('class="bl-pagination"');
    for (const article of articles) expect(second).toContain(`/blog/${article.slug}`);
  });
  it("rend les réponses, le sommaire, la FAQ et BlogPosting sur une page publiée", async () => {
    const article = articles[0];
    const html = renderToStaticMarkup(await ArticlePage({ params: { slug: article.slug } }));
    expect(html).toContain("application/ld+json");
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('id="questions-professionnels"');
    expect(html).toContain('href="#section-1"');
    expect(html).toContain("Questions fréquentes des professionnels");
    expect(html).toContain("<caption>");
    expect(html).toContain("<figcaption>");
    expect(html).toContain("dashboard-pilotage.webp");
    expect((await postMetadata({ params: { slug: article.slug } })).robots).toMatchObject({
      index: true,
    });
    expect((await postMetadata({ params: { slug: "inconnu" } })).robots).toMatchObject({
      index: false,
    });
    await expect(ArticlePage({ params: { slug: "inconnu" } })).rejects.toThrow();
  });
  it("permet une publication progressive sans exposer les autres guides", async () => {
    fakes.published.mockResolvedValue([articles[0]]);
    const entries = await sitemap();
    expect(entries.filter((e) => e.url.includes("/blog/"))).toHaveLength(2);
    expect(entries.some((e) => e.url.endsWith(`/blog/${articles[1].slug}/`))).toBe(false);
    const html = renderToStaticMarkup(await ArticlePage({ params: { slug: articles[0].slug } }));
    expect(html).not.toContain(`/blog/${articles[1].slug}/`);
    expect(html).not.toContain("Pour aller <em>plus loin");
  });
});
