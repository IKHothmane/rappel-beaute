import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/www/PageHero";
import { chapterPath, GUIDE, GUIDE_PATH } from "@/lib/guide";
import { marketingPageMetadata } from "@/lib/seo";
import { PdfDownload } from "./_components/PdfDownload";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "Guide d’utilisation Rappel Beauty · Captures et PDF",
  description:
    "Apprenez à utiliser Rappel Beauty écran par écran : réglages, services, équipe, agenda, caisse, stock et fidélité. Guide illustré et PDF à télécharger.",
  canonical: GUIDE_PATH,
});

export default function GuidePage() {
  return (
    <>
      <PageHero eyebrow="Guide d’utilisation" title={GUIDE.title} text={GUIDE.subtitle} />
      <div className="container-rb py-[var(--vt-space-3rem)]">
        <div className="max-w-[var(--vt-size-48rem)]">
          <p className="text-[length:var(--vt-fs-body)] text-vt-ink-soft">{GUIDE.intro}</p>
          <div className="mt-[var(--vt-space-1p5rem)] flex flex-wrap items-center gap-[var(--vt-space-1rem)]">
            <PdfDownload />
            <p className="text-[length:var(--vt-fs-caption)] text-vt-muted">
              Version : {GUIDE.version}
            </p>
          </div>
        </div>

        <section aria-labelledby="guide-chapitres" className="mt-[var(--vt-space-3rem)]">
          <h2
            id="guide-chapitres"
            className="font-display text-[length:var(--vt-fs-h2)] leading-[var(--vt-lh-h2)]"
          >
            Les chapitres
          </h2>
          <ol className="mt-[var(--vt-space-1p5rem)] grid gap-[var(--vt-space-1rem)] md:grid-cols-2">
            {GUIDE.chapters.map((chapter, index) => (
              <li key={chapter.slug} className="surface min-w-0 p-[var(--vt-space-1p5rem)]">
                <p className="eyebrow">Chapitre {index + 1}</p>
                <h3 className="mt-[var(--vt-size-0p5rem)] font-display text-[length:var(--vt-fs-h3)] leading-[var(--vt-lh-h3)] font-semibold">
                  <Link
                    href={chapterPath(chapter.slug)}
                    className="underline-offset-4 hover:text-vt-primary hover:underline"
                  >
                    {chapter.title}
                  </Link>
                </h3>
                <p className="mt-[var(--vt-size-0p5rem)] text-[length:var(--vt-fs-body)] text-vt-ink-soft">
                  {chapter.summary}
                </p>
                <ul
                  aria-label={`Sections du chapitre ${chapter.title}`}
                  className="mt-[var(--vt-space-0p75rem)] border-t border-vt-line pt-[var(--vt-space-0p75rem)] text-[length:var(--vt-fs-caption)]"
                >
                  {chapter.sections.map((section) => (
                    <li key={section.id}>
                      <Link
                        href={`${chapterPath(chapter.slug)}#${section.id}`}
                        className="inline-block py-1 text-vt-primary underline-offset-4 hover:underline"
                      >
                        {section.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
