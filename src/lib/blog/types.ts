export type BlogSection = {
  title: string;
  paragraphs: string[];
  steps?: string[];
  table?: { caption: string; columns: string[]; rows: string[][] };
  image?: { src: string; alt: string; width: number; height: number; caption: string };
};
export type BlogContent = {
  slug: string;
  title: string;
  description: string;
  category: string;
  answer: string;
  sections: BlogSection[];
  faqs: { question: string; answer: string }[];
  links: { href: string; label: string }[];
  sources: { href: string; label: string }[];
};
export type BlogArticle = BlogContent & {
  status: "draft" | "published";
  author: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  reviewedBy: string | null;
  version: number;
};
/** Chaque fiche possède une réponse, une méthode et un exemple propres au sujet. */
export type ArticleSeed = readonly [
  slug: string,
  title: string,
  answer: string,
  diagnosis: string,
  steps: readonly string[],
  example: string,
  mistake: string,
  followUpQuestion: string,
  followUpAnswer: string,
];
