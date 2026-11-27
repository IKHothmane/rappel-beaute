import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/www/PageHero";
import { adjacentChapters, chapterPath, getChapter, GUIDE, GUIDE_PATH } from "@/lib/guide";
import { marketingPageMetadata } from "@/lib/seo";
import { GuideFigure } from "../_components/GuideFigure";
import { PdfDownload } from "../_components/PdfDownload";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: { chapitre: string } };

export function generateStaticParams() {
  return GUIDE.chapters.map((chapter) => ({ chapitre: chapter.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const chapter = getChapter(params.chapitre);
  if (!chapter) return { robots: { index: false, follow: true } };
  return marketingPageMetadata({
    title: `${chapter.title} · Guide Rappel Beauty`,
    description: `${chapter.summary} Étapes expliquées et captures d’écran du guide Rappel Beauty.`,
    canonical: chapterPath(chapter.slug),
  });
}

export default function GuideChapterPage({ params }: Props) {
  const chapter = getChapter(params.chapitre);
  if (!chapter) notFound();
  const { index, previous, next } = adjacentChapters(chapter.slug);

  return (
    <>
      <PageHero
        eyebrow={`Guide · Chapitre ${index + 1} sur ${GUIDE.chapters.length}`}
        title={chapter.title}
        text={chapter.summary}
      />
      <div className="container-rb py-[var(--vt-space-2rem)]">
        <div className="flex flex-wrap items-center justify-between gap-[var(--vt-space-1rem)]">
          <Link
            href={GUIDE_PATH}
            className="inline-flex items-center gap-[var(--vt-size-0p5rem)] py-2 text-[length:var(--vt-fs-caption)] font-semibold text-vt-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Tous les chapitres du guide
          </Link>
          <PdfDownload variant="ghost" />
        </div>

        <div className="mt-[var(--vt-space-2rem)] grid gap-[var(--vt-space-2rem)] lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav
            aria-labelledby="guide-sommaire"
            className="surface h-fit p-[var(--vt-space-1p25rem)] lg:sticky lg:top-28"
          >
            <p id="guide-sommaire" className="eyebrow">
              Dans ce chapitre
            </p>
            <ol className="mt-[var(--vt-size-0p5rem)] list-decimal pl-5 text-[length:var(--vt-fs-caption)] marker:text-vt-muted">
              {chapter.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block py-1 text-vt-ink underline-offset-4 hover:text-vt-primary hover:underline"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-[var(--vt-space-3rem)]">
            {chapter.sections.map((section) => {
              const desktop = section.images.filter((image) => !image.mobile);
              const mobile = section.images.filter((image) => image.mobile);
              return (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-titre`}
                  className="scroll-mt-28 border-b border-vt-line pb-[var(--vt-space-3rem)] last:border-b-0 last:pb-0"
                >
                  <h2
                    id={`${section.id}-titre`}
                    className="font-display text-[length:var(--vt-fs-h2)] leading-[var(--vt-lh-h2)]"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-[var(--vt-space-0p75rem)] text-[length:var(--vt-fs-body)] text-vt-ink-soft">
                    {section.intro}
                  </p>
                  <ol className="mt-[var(--vt-space-1rem)] list-decimal space-y-[var(--vt-size-0p5rem)] pl-6 text-[length:var(--vt-fs-body)] marker:font-semibold marker:text-vt-primary">
                    {section.steps.map((step) => (
                      <li key={step} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                  {section.tips.length > 0 && (
                    <div className="mt-[var(--vt-space-1p25rem)] rounded-xl border border-vt-line bg-vt-surface-soft p-[var(--vt-space-1rem)]">
                      <h3 className="text-[length:var(--vt-fs-caption)] font-semibold text-vt-primary-deep">
                        {section.tips.length > 1 ? "Astuces" : "Astuce"}
                      </h3>
                      {section.tips.map((tip) => (
                        <p key={tip} className="mt-1 text-[length:var(--vt-fs-body)]">
                          {tip}
                        </p>
                      ))}
                    </div>
                  )}
                  {desktop.length > 0 && (
                    <div className="mt-[var(--vt-space-1p5rem)] grid gap-[var(--vt-space-1p5rem)]">
                      {desktop.map((image) => (
                        <GuideFigure key={image.src} image={image} />
                      ))}
                    </div>
                  )}
                  {mobile.length > 0 && (
                    <div className="mt-[var(--vt-space-1p5rem)] grid max-w-[var(--vt-size-48rem)] grid-cols-2 items-start gap-[var(--vt-space-1rem)] sm:grid-cols-3">
                      {mobile.map((image) => (
                        <GuideFigure key={image.src} image={image} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <nav
          aria-label="Chapitres précédent et suivant"
          className="mt-[var(--vt-space-3rem)] grid gap-[var(--vt-space-1rem)] sm:grid-cols-2"
        >
          {previous && (
            <Link
              href={chapterPath(previous.slug)}
              className="surface p-[var(--vt-space-1p25rem)] transition hover:border-vt-primary"
            >
              <span className="flex items-center gap-[var(--vt-size-0p5rem)] text-[length:var(--vt-fs-caption)] text-vt-muted">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Chapitre précédent
              </span>
              <span className="mt-1 block font-semibold">{previous.title}</span>
            </Link>
          )}
          {next && (
            <Link
              href={chapterPath(next.slug)}
              className="surface p-[var(--vt-space-1p25rem)] text-right transition hover:border-vt-primary sm:col-start-2"
            >
              <span className="flex items-center justify-end gap-[var(--vt-size-0p5rem)] text-[length:var(--vt-fs-caption)] text-vt-muted">
                Chapitre suivant
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="mt-1 block font-semibold">{next.title}</span>
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
