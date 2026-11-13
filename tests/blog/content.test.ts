import { describe, expect, it } from "vitest";
import {
  BLOG_DRAFTS,
  articleWordCount,
  searchArticles,
  editorialQuestionKey,
} from "@/lib/blog/articles";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { validateBlogContent, validateEditorialQuestion } from "@/lib/blog/validation";
import { articleJsonLd, articleMetadata } from "@/lib/blog/seo";

describe("Bibliothèque éditoriale", () => {
  it("conserve les cent premiers guides et ajoute dix réponses SEO local", () => {
    expect(BLOG_DRAFTS).toHaveLength(110);
    expect(BLOG_CATEGORIES).toHaveLength(11);
    expect(new Set(BLOG_DRAFTS.map((a) => a.slug)).size).toBe(110);
    expect(new Set(BLOG_DRAFTS.map((a) => a.answer)).size).toBe(110);
    expect(BLOG_DRAFTS.slice(0, 100).some((a) => a.category === "seo-local")).toBe(false);
    expect(BLOG_DRAFTS.slice(100).every((a) => a.category === "seo-local")).toBe(true);
    for (const category of BLOG_CATEGORIES)
      expect(BLOG_DRAFTS.filter((a) => a.category === category.id)).toHaveLength(10);
  });
  it("développe les nouveaux guides et les quatre articles prioritaires", () => {
    for (const article of BLOG_DRAFTS.filter((a) => a.category === "seo-local")) {
      expect(articleWordCount(article)).toBeGreaterThanOrEqual(500);
      expect(article.sources.length).toBeGreaterThan(0);
      expect(article.faqs.length).toBeGreaterThanOrEqual(2);
    }
    expect(articleWordCount(BLOG_DRAFTS[0])).toBeGreaterThanOrEqual(1200);
    for (const article of BLOG_DRAFTS.slice(0, 4))
      expect(articleWordCount(article)).toBeGreaterThanOrEqual(700);
    expect(BLOG_DRAFTS[0].sections.some((s) => s.table)).toBe(true);
    expect(BLOG_DRAFTS[0].sections.some((s) => s.image)).toBe(true);
  });
  it("contrôle les dimensions, la provenance des captures et la cohérence des tableaux", () => {
    const base = BLOG_DRAFTS[0];
    expect(
      validateBlogContent({
        ...base,
        sections: [
          {
            ...base.sections[0],
            table: {
              caption: "Un tableau incohérent",
              columns: ["A", "B"],
              rows: [["une cellule"]],
            },
          },
          ...base.sections.slice(1),
        ],
      }),
    ).not.toBeNull();
    expect(
      validateBlogContent({
        ...base,
        sections: [
          {
            ...base.sections[0],
            image: {
              src: "https://example.invalid/picture.png",
              width: 1640,
              height: 545,
              alt: "Capture externe non autorisée",
              caption: "Une capture externe ne doit pas passer.",
            },
          },
          ...base.sections.slice(1),
        ],
      }),
    ).not.toBeNull();
    const capture = base.sections.find((s) => s.image)!.image!;
    expect(
      validateBlogContent({
        ...base,
        sections: [
          { ...base.sections[0], image: { ...capture, width: 99 } },
          ...base.sections.slice(1),
        ],
      }),
    ).not.toBeNull();
    const emptyTable = { caption: "Tableau en préparation", columns: ["A", "B"], rows: [["", ""]] };
    const incomplete = {
      ...base,
      sections: [{ ...base.sections[0], table: emptyTable }, ...base.sections.slice(1)],
    };
    expect(validateBlogContent(incomplete, false)).toBeNull();
    expect(validateBlogContent(incomplete)).not.toBeNull();
  });
  it.each(BLOG_DRAFTS.map((a) => [a.slug, a] as const))(
    "%s : réponse, méthode, exemple et FAQ prêts à relire",
    (_, article) => {
      expect(validateBlogContent(article)).toBeNull();
      expect(articleWordCount(article)).toBeGreaterThanOrEqual(180);
      expect(article.status).toBe("draft");
      expect(article.publishedAt).toBeNull();
      expect(article.reviewedBy).toBeNull();
      expect(article.sections.some((s) => (s.steps?.length ?? 0) >= 4)).toBe(true);
    },
  );
  it("recherche avec accents, apostrophes et thème", () => {
    expect(
      searchArticles(BLOG_DRAFTS, "fidelite digitale", "fidelite").some(
        (a) => a.slug === "carte-fidelite-digitale-beaute",
      ),
    ).toBe(true);
    expect(searchArticles(BLOG_DRAFTS, "rendez vous", "stock")).toEqual([]);
    expect(searchArticles(BLOG_DRAFTS, "zzzzzz")).toEqual([]);
  });
  it("regroupe les variantes de ponctuation et préserve les questions en arabe", () => {
    expect(editorialQuestionKey("Comment organiser les rendez-vous ?")).toBe(
      editorialQuestionKey("comment organiser les rendez vous?"),
    );
    expect(editorialQuestionKey("كيف أنظم المواعيد؟")).not.toBe("");
    expect(editorialQuestionKey("كيف أنظم المواعيد؟")).not.toBe(
      editorialQuestionKey("كيف أدير المخزون؟"),
    );
  });
  it("refuse liens actifs et article trop court à la publication, accepte un brouillon incomplet", () => {
    expect(
      validateBlogContent({
        ...BLOG_DRAFTS[0],
        links: [{ href: "javascript:alert(1)", label: "Danger" }],
      }),
    ).not.toBeNull();
    expect(
      validateBlogContent({
        ...BLOG_DRAFTS[0],
        sources: [{ href: "http://example.com", label: "Source" }],
      }),
    ).not.toBeNull();
    expect(
      validateBlogContent({ ...BLOG_DRAFTS[0], answer: "", sections: [], faqs: [] }),
    ).not.toBeNull();
    expect(
      validateBlogContent(
        { ...BLOG_DRAFTS[0], answer: "", description: "", sections: [], faqs: [] },
        false,
      ),
    ).toBeNull();
    expect(validateBlogContent({ sections: [null] })).not.toBeNull();
  });
  it("refuse les questions non anonymisées et les coordonnées évidentes", () => {
    expect(validateEditorialQuestion("Comment déplacer un rendez-vous ?", true)).toBeNull();
    expect(validateEditorialQuestion("Comment déplacer un rendez-vous ?", false)).not.toBeNull();
    expect(
      validateEditorialQuestion("La cliente téléphone au +212 600 000 000", true),
    ).not.toBeNull();
    expect(validateEditorialQuestion("Le contact est cliente@example.com", true)).not.toBeNull();
  });
  it("réserve les dates de publication et l’indexation aux versions publiées", () => {
    const draft = BLOG_DRAFTS[0];
    expect(articleMetadata(draft).robots).toMatchObject({ index: false });
    expect(articleJsonLd(draft)).not.toHaveProperty("datePublished");
    const article = {
      ...draft,
      status: "published" as const,
      publishedAt: "2026-11-13T10:00:00.000Z",
      updatedAt: "2026-11-14T12:00:00.000Z",
      reviewedBy: "reviewer",
    };
    expect(articleMetadata(article).robots).toMatchObject({ index: true });
    expect(articleJsonLd(article)).toMatchObject({
      "@type": "BlogPosting",
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
    });
    expect(articleMetadata(article).alternates?.canonical).toBe(`/blog/${article.slug}/`);
  });
});
