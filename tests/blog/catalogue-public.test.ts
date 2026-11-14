import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { BLOG_DRAFTS } from "@/lib/blog/articles";
import { publishedArticles } from "@/lib/blog/public";
import { saveEditorialArticle } from "@/lib/db/blog";
import { runInScope } from "@/lib/db/tenant-context";
import type { BlogArticle, BlogContent } from "@/lib/blog/types";
import sitemap from "@/app/sitemap";

const WITHDRAWAL_SLUG = "circuit-retrait-editorial";

function asContent(article: BlogArticle, slug: string): BlogContent {
  return {
    slug,
    title: article.title,
    description: article.description,
    category: article.category,
    answer: article.answer,
    sections: article.sections,
    faqs: article.faqs,
    links: article.links,
    sources: article.sources,
  };
}

async function deleteWithdrawal(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('DELETE FROM "BlogArticle" WHERE slug = $1', [WITHDRAWAL_SLUG]);
  } finally {
    await client.end();
  }
}

describe("Catalogue public", () => {
  it("n’expose aucun brouillon tant qu’un relecteur ne l’a pas publié", async () => {
    const articles = await publishedArticles();
    expect(articles.every((article) => article.status === "published" && article.reviewedBy)).toBe(
      true,
    );
    expect(BLOG_DRAFTS.every((article) => article.status === "draft" && !article.reviewedBy)).toBe(
      true,
    );
    const live = new Map(articles.map((article) => [article.slug, article]));
    for (const draft of BLOG_DRAFTS) {
      const published = live.get(draft.slug);
      if (published) expect(published.reviewedBy).toBeTruthy();
    }
  });

  it("limite le sitemap aux articles réellement publiés, sans adresse privée", async () => {
    const articles = await publishedArticles();
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://rappelbeauty.com/blog/");
    for (const article of articles) {
      expect(urls).toContain(`https://rappelbeauty.com/blog/${article.slug}/`);
    }
    const guides = urls.filter((url) => {
      const path = new URL(url).pathname;
      return path.startsWith("/blog/") && path !== "/blog/";
    });
    expect(guides).toHaveLength(articles.length);
    for (const draft of BLOG_DRAFTS) {
      const listed = urls.includes(`https://rappelbeauty.com/blog/${draft.slug}/`);
      expect(listed).toBe(articles.some((article) => article.slug === draft.slug));
    }
    expect(
      urls.every((url) => !/[?#]/.test(url) && !/\/(?:admin|api|domains|connexion)\//.test(url)),
    ).toBe(true);
  });

  it.skipIf(!process.env.DATABASE_URL)(
    "retire du blog public un article dépublié par l’administration",
    async () => {
      await deleteWithdrawal();
      try {
        const published = await runInScope({ kind: "platform", reason: "relecture de test" }, () =>
          saveEditorialArticle(asContent(BLOG_DRAFTS[0], WITHDRAWAL_SLUG), "published", 0, "relecteur-test"),
        );
        expect(published?.status).toBe("published");
        expect(published?.reviewedBy).toBe("relecteur-test");
        expect((await publishedArticles()).some((article) => article.slug === WITHDRAWAL_SLUG)).toBe(
          true,
        );
        expect((await sitemap()).some((entry) => entry.url.endsWith(`/blog/${WITHDRAWAL_SLUG}/`))).toBe(
          true,
        );

        const withdrawn = await runInScope({ kind: "platform", reason: "retrait de test" }, () =>
          saveEditorialArticle(
            asContent(BLOG_DRAFTS[0], WITHDRAWAL_SLUG),
            "draft",
            published!.version,
            "relecteur-test",
          ),
        );
        expect(withdrawn?.status).toBe("draft");
        expect(withdrawn?.reviewedBy).toBeNull();
        expect((await publishedArticles()).some((article) => article.slug === WITHDRAWAL_SLUG)).toBe(
          false,
        );
        expect((await sitemap()).some((entry) => entry.url.endsWith(`/blog/${WITHDRAWAL_SLUG}/`))).toBe(
          false,
        );
      } finally {
        await deleteWithdrawal();
      }
    },
  );
});
