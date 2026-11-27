// Réservé au rendu serveur : lit la taille du PDF sur disque.
import { statSync } from "node:fs";
import path from "node:path";
import content from "./content.json";

export type GuideImage = {
  /** Nom du fichier sans extension dans public/marketing/guide/. */
  src: string;
  alt: string;
  caption: string;
  mobile?: boolean;
};

export type GuideSection = {
  /** Ancre de la section, unique dans son chapitre. */
  id: string;
  title: string;
  intro: string;
  steps: string[];
  tips: string[];
  images: GuideImage[];
};

export type GuideChapter = {
  slug: string;
  title: string;
  summary: string;
  sections: GuideSection[];
};

export type Guide = {
  title: string;
  subtitle: string;
  intro: string;
  version: string;
  /** Chemin public du PDF. */
  pdf: string;
  chapters: GuideChapter[];
};

export const GUIDE: Guide = content;

export const GUIDE_PATH = "/ressources/guide/";

export function chapterPath(slug: string): string {
  return `${GUIDE_PATH}${slug}/`;
}

export function getChapter(slug: string): GuideChapter | undefined {
  return GUIDE.chapters.find((chapter) => chapter.slug === slug);
}

export function adjacentChapters(slug: string) {
  const index = GUIDE.chapters.findIndex((chapter) => chapter.slug === slug);
  return {
    index,
    previous: index > 0 ? GUIDE.chapters[index - 1] : undefined,
    next: index >= 0 ? GUIDE.chapters[index + 1] : undefined,
  };
}

export function imagePath(image: GuideImage): string {
  return `/marketing/guide/${image.src}.jpg`;
}

/** Dimensions réelles des captures générées. */
export function imageSize(image: GuideImage): { width: number; height: number } {
  return image.mobile ? { width: 780, height: 1688 } : { width: 1440, height: 900 };
}

/** Poids du PDF, relu à chaque build : il suit les régénérations du fichier. */
export function pdfSizeLabel(): string {
  const { size } = statSync(path.join(process.cwd(), "public", GUIDE.pdf));
  const megabytes = size / 1_000_000;
  return `${megabytes.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}
