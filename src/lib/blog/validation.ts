import { BLOG_CATEGORIES } from "./categories";
import { articleWordCount } from "./articles";
import type { BlogContent } from "./types";
import { BLOG_IMAGES } from "./images";

function validSectionExtras(
  section: BlogContent["sections"][number],
  forPublication: boolean,
): boolean {
  const { table, image } = section;
  if (
    table !== undefined &&
    (!table ||
      !text(table.caption, forPublication ? 10 : 0, 500) ||
      !Array.isArray(table.columns) ||
      table.columns.length < 2 ||
      table.columns.length > 8 ||
      !table.columns.every((c) => text(c, forPublication ? 1 : 0, 200)) ||
      !Array.isArray(table.rows) ||
      table.rows.length < 1 ||
      table.rows.length > 30 ||
      !table.rows.every(
        (row) =>
          Array.isArray(row) &&
          row.length === table.columns.length &&
          row.every((cell) => text(cell, forPublication ? 1 : 0, 1000)),
      ))
  )
    return false;
  if (
    image !== undefined &&
    (!image ||
      !text(image.alt, forPublication ? 10 : 0, 300) ||
      !text(image.caption, forPublication ? 10 : 0, 600) ||
      !BLOG_IMAGES.some(
        (asset) =>
          asset.src === image.src && asset.width === image.width && asset.height === image.height,
      ))
  )
    return false;
  return true;
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}
function safeLinks(value: unknown, external: boolean) {
  return (
    Array.isArray(value) &&
    value.length <= 10 &&
    value.every(
      (link) =>
        link &&
        text(link.label, 2, 200) &&
        text(link.href, 1, 500) &&
        (external
          ? /^https:\/\/[^\s]+$/.test(link.href)
          : /^\/(?!\/)[a-z0-9/#?=&._-]*$/.test(link.href)),
    )
  );
}
export function validateBlogContent(input: unknown, forPublication = true): string | null {
  if (!input || typeof input !== "object") return "Article invalide.";
  const a = input as BlogContent;
  if (!text(a.slug, 3, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug))
    return "Adresse d’article invalide.";
  if (
    !text(a.title, forPublication ? 15 : 3, 160) ||
    !text(a.description, forPublication ? 40 : 0, 200) ||
    !text(a.answer, forPublication ? 60 : 0, 2000)
  )
    return "Complétez le titre, la description et la réponse courte.";
  if (!BLOG_CATEGORIES.some((c) => c.id === a.category)) return "Thème invalide.";
  if (
    !Array.isArray(a.sections) ||
    a.sections.length < (forPublication ? 3 : 0) ||
    a.sections.length > 20 ||
    !a.sections.every(
      (s) =>
        s &&
        text(s.title, forPublication ? 3 : 0, 160) &&
        Array.isArray(s.paragraphs) &&
        s.paragraphs.length <= 15 &&
        s.paragraphs.every((p) => text(p, forPublication ? 10 : 0, 8000)) &&
        (s.steps === undefined ||
          (Array.isArray(s.steps) &&
            s.steps.length <= 15 &&
            s.steps.every((p) => text(p, forPublication ? 10 : 0, 2000)))) &&
        validSectionExtras(s, forPublication) &&
        (!forPublication ||
          s.paragraphs.length > 0 ||
          (s.steps?.length ?? 0) > 0 ||
          !!s.table ||
          !!s.image),
    )
  )
    return "Prévoyez au moins trois sections rédigées.";
  if (
    !Array.isArray(a.faqs) ||
    a.faqs.length < (forPublication ? 1 : 0) ||
    a.faqs.length > 10 ||
    !a.faqs.every(
      (f) =>
        f &&
        text(f.question, forPublication ? 10 : 0, 250) &&
        text(f.answer, forPublication ? 30 : 0, 2000),
    )
  )
    return "Ajoutez au moins une question fréquente avec sa réponse.";
  if (!safeLinks(a.links, false) || !safeLinks(a.sources, true))
    return "Les liens doivent être internes ou utiliser HTTPS pour les sources.";
  if (forPublication && articleWordCount(a) < 180)
    return "Développez l’article : au moins 180 mots de contenu utile sont attendus.";
  return null;
}
export function validateEditorialQuestion(question: unknown, anonymized: unknown): string | null {
  if (anonymized !== true) return "Confirmez que la question a été anonymisée.";
  if (!text(question, 15, 350)) return "La question doit contenir entre 15 et 350 caractères.";
  if (/@|https?:\/\/|(?:\+?\d[\s().-]*){7,}/i.test(question))
    return "Retirez les e-mails, numéros et liens avant l’enregistrement.";
  return null;
}
