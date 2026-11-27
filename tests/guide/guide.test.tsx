import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/link lit ce réglage de next.config (trailingSlash) au rendu.
vi.hoisted(() => {
  process.env.__NEXT_TRAILING_SLASH = "true";
});
// Le sitemap lit aussi le blog : aucun accès à la base ici.
vi.mock("@/lib/blog/public", () => ({ publishedArticles: vi.fn().mockResolvedValue([]) }));

import GuidePage, { metadata as indexMetadata } from "@/app/(marketing)/ressources/guide/page";
import ChapterPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "@/app/(marketing)/ressources/guide/[chapitre]/page";
import RessourcesPage from "@/app/(marketing)/ressources/page";
import sitemap from "@/app/sitemap";
import { SiteFooter } from "@/components/www/SiteFooter";
import { absoluteUrl } from "@/lib/seo";
import {
  adjacentChapters,
  chapterPath,
  GUIDE,
  GUIDE_PATH,
  imagePath,
  imageSize,
  pdfSizeLabel,
} from "@/lib/guide";

const publicFile = (url: string) => path.join(process.cwd(), "public", url);
const sections = GUIDE.chapters.flatMap((chapter) => chapter.sections);
const images = sections.flatMap((section) => section.images);

describe("Contenu du guide", () => {
  it("a des slugs et des ancres uniques et utilisables dans une adresse", () => {
    const slugs = GUIDE.chapters.map((chapter) => chapter.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
    for (const chapter of GUIDE.chapters) {
      const ids = chapter.sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("n'a pas d'étape ou d'astuce en double dans une section (clés React)", () => {
    for (const section of sections) {
      expect(new Set(section.steps).size).toBe(section.steps.length);
      expect(new Set(section.tips).size).toBe(section.tips.length);
      expect(new Set(section.images.map((image) => image.src)).size).toBe(section.images.length);
    }
  });

  it("référence des captures présentes, aux dimensions déclarées, avec texte et légende", async () => {
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      const file = publicFile(imagePath(image));
      expect(existsSync(file), imagePath(image)).toBe(true);
      const { width, height } = await sharp(file).metadata();
      expect({ width, height }, image.src).toEqual(imageSize(image));
      expect(image.alt.trim()).not.toBe("");
      expect(image.caption.trim()).not.toBe("");
    }
  });

  it("référence un PDF présent et affiche son poids", () => {
    const file = publicFile(GUIDE.pdf);
    expect(readFileSync(file).subarray(0, 5).toString()).toBe("%PDF-");
    const expected = (statSync(file).size / 1_000_000).toLocaleString("fr-FR", {
      maximumFractionDigits: 1,
    });
    expect(pdfSizeLabel()).toBe(`${expected} Mo`);
  });
});

describe("Pages du guide", () => {
  it("rend l'accueil avec le PDF téléchargeable et tous les liens de sections", () => {
    const html = renderToStaticMarkup(GuidePage());
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(`href="${GUIDE.pdf}" download=""`);
    expect(html).toContain(pdfSizeLabel());
    for (const chapter of GUIDE.chapters) {
      expect(html).toContain(`href="${chapterPath(chapter.slug)}"`);
      for (const section of chapter.sections) {
        expect(html).toContain(`href="${chapterPath(chapter.slug)}#${section.id}"`);
      }
    }
    expect(indexMetadata.alternates?.canonical).toBe(GUIDE_PATH);
    expect(indexMetadata.robots).toBeUndefined();
  });

  it("prérend seulement les chapitres connus", () => {
    expect(dynamicParams).toBe(false);
    expect(generateStaticParams()).toEqual(
      GUIDE.chapters.map((chapter) => ({ chapitre: chapter.slug })),
    );
    expect(() => ChapterPage({ params: { chapitre: "inconnu" } })).toThrow("NEXT_NOT_FOUND");
    expect(generateMetadata({ params: { chapitre: "inconnu" } }).robots).toMatchObject({
      index: false,
    });
  });

  it.each(GUIDE.chapters.map((chapter) => [chapter.slug, chapter] as const))(
    "rend le chapitre %s avec ancres, captures et navigation",
    (slug, chapter) => {
      const html = renderToStaticMarkup(ChapterPage({ params: { chapitre: slug } }));
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html.match(/<h2\b/g)).toHaveLength(chapter.sections.length);
      expect(html).toContain(`href="${GUIDE.pdf}" download=""`);
      expect(html).toContain(`href="${GUIDE_PATH}"`);
      for (const section of chapter.sections) {
        expect(html).toContain(`id="${section.id}"`);
        expect(html).toContain(`href="#${section.id}"`);
        for (const image of section.images) {
          expect(html).toContain(
            `href="${imagePath(image)}" target="_blank" rel="noopener noreferrer"`,
          );
        }
      }
      expect(html.match(/<figure\b/g) ?? []).toHaveLength(
        chapter.sections.reduce((total, section) => total + section.images.length, 0),
      );
      const { previous, next } = adjacentChapters(slug);
      expect(html.includes("Chapitre précédent")).toBe(Boolean(previous));
      expect(html.includes("Chapitre suivant")).toBe(Boolean(next));
      if (previous) expect(html).toContain(`href="${chapterPath(previous.slug)}"`);
      if (next) expect(html).toContain(`href="${chapterPath(next.slug)}"`);

      const meta = generateMetadata({ params: { chapitre: slug } });
      expect(meta.alternates?.canonical).toBe(chapterPath(slug));
      expect(meta.robots).toBeUndefined();
    },
  );
});

describe("Découverte du guide", () => {
  it("est lié depuis les ressources et le footer vitrine", () => {
    expect(renderToStaticMarkup(RessourcesPage())).toContain(`href="${GUIDE_PATH}"`);
    expect(renderToStaticMarkup(<SiteFooter />)).toContain(`href="${GUIDE_PATH}"`);
  });

  it("figure dans le sitemap et llms.txt avec toutes ses pages", async () => {
    const paths = [GUIDE_PATH, ...GUIDE.chapters.map((chapter) => chapterPath(chapter.slug))];
    const urls = (await sitemap()).map((entry) => entry.url);
    const llms = readFileSync(publicFile("llms.txt"), "utf8");
    for (const page of paths) {
      expect(urls.filter((url) => url === absoluteUrl(page))).toHaveLength(1);
      expect(llms).toContain(`(${absoluteUrl(page)})`);
    }
    expect(llms).toContain(`(${absoluteUrl(GUIDE.pdf)})`);
  });
});
