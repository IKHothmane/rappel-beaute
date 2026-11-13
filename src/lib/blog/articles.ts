import { blogCategory } from "./categories";
import type { ArticleSeed, BlogArticle } from "./types";
import { logiciel } from "./content/logiciel";
import { rendezVous } from "./content/rendez-vous";
import { whatsapp } from "./content/whatsapp";
import { siteWeb } from "./content/site-web";
import { fidelite } from "./content/fidelite";
import { stock } from "./content/stock";
import { caisse } from "./content/caisse";
import { equipe } from "./content/equipe";
import { developpement } from "./content/developpement";
import { donnees } from "./content/donnees";
import { ARTICLE_CHECKS } from "./content/checks";
import { LOCAL_SEO_CONTENT } from "./content/seo-local";
import { PRIORITY_CONTENT } from "./content/prioritaires";

const groups: [string, ArticleSeed[]][] = [
  ["logiciel", logiciel],
  ["rendez-vous", rendezVous],
  ["whatsapp", whatsapp],
  ["site-web", siteWeb],
  ["fidelite", fidelite],
  ["stock", stock],
  ["caisse", caisse],
  ["equipe", equipe],
  ["developpement", developpement],
  ["donnees", donnees],
];

/** Propositions éditoriales préparées le 13/11/2026 ; aucune publication implicite. */
const initialDrafts: BlogArticle[] = groups.flatMap(([category, seeds]) =>
  seeds.map((seed) => {
    const [slug, title, answer, diagnosis, steps, example, mistake, question, followUp] = seed;
    const theme = blogCategory(category);
    return {
      slug,
      title,
      category,
      answer,
      description: answer.length > 155 ? `${answer.slice(0, 152).replace(/\s+\S*$/, "")}…` : answer,
      sections: [
        { title: "Comprendre le besoin", paragraphs: [diagnosis] },
        { title: "La méthode, étape par étape", paragraphs: [], steps: [...steps] },
        { title: "Un exemple pour passer à l’action", paragraphs: [example] },
        { title: "Le point de vigilance", paragraphs: [mistake] },
        ...(ARTICLE_CHECKS[slug]
          ? [{ title: "À vérifier dans votre institut", paragraphs: [ARTICLE_CHECKS[slug]] }]
          : []),
      ],
      faqs: [{ question, answer: followUp }],
      links: [
        { href: theme.href, label: theme.linkLabel },
        { href: "/tarifs/", label: "Consulter les tarifs actuels de Rappel Beauty" },
      ],
      sources:
        category === "donnees"
          ? [
              {
                href: "https://www.cndp.ma/",
                label: "CNDP — ressources officielles sur la protection des données",
              },
            ]
          : slug === "avis-google-institut-beaute"
            ? [
                {
                  href: "https://support.google.com/contributionpolicy/answer/7400114?hl=fr",
                  label: "Google — règles relatives aux contributions",
                },
              ]
            : slug === "attirer-clientes-institut-beaute-google"
              ? [
                  {
                    href: "https://support.google.com/business/answer/7091?hl=fr",
                    label: "Google — classement des résultats locaux",
                  },
                ]
              : slug === "ouvrir-institut-beaute-maroc"
                ? [
                    {
                      href: "https://www.ompic.ma/",
                      label: "OMPIC — informations officielles sur la création d’entreprise",
                    },
                  ]
                : [],
      ...PRIORITY_CONTENT[slug],
      status: "draft",
      author: "Rappel Beauty",
      createdAt: "2026-11-13T09:00:00+01:00",
      updatedAt: "2026-11-13T09:00:00+01:00",
      publishedAt: null,
      reviewedBy: null,
      version: 0,
    } satisfies BlogArticle;
  }),
);

export const BLOG_DRAFTS: BlogArticle[] = [
  ...initialDrafts,
  ...LOCAL_SEO_CONTENT.map((content) => ({
    ...content,
    status: "draft" as const,
    author: "Rappel Beauty",
    createdAt: "2026-11-13T09:00:00+01:00",
    updatedAt: "2026-11-13T09:00:00+01:00",
    publishedAt: null,
    reviewedBy: null,
    version: 0,
  })),
];

export function articleWordCount(article: Pick<BlogArticle, "answer" | "sections" | "faqs">) {
  return [
    article.answer,
    ...article.sections.flatMap((s) => [
      ...s.paragraphs,
      ...(s.steps ?? []),
      ...(s.table ? [s.table.caption, ...s.table.columns, ...s.table.rows.flat()] : []),
      ...(s.image ? [s.image.caption] : []),
    ]),
    ...article.faqs.flatMap((f) => [f.question, f.answer]),
  ]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
export function readingMinutes(article: BlogArticle) {
  return Math.max(1, Math.ceil(articleWordCount(article) / 200));
}
export function normalizeBlogSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function editorialQuestionKey(value: string) {
  return normalizeBlogSearch(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function searchArticles(articles: BlogArticle[], query: string, category = "") {
  const terms = normalizeBlogSearch(query).split(" ").filter(Boolean);
  return articles.filter(
    (article) =>
      (!category || article.category === category) &&
      terms.every((term) =>
        normalizeBlogSearch(
          `${article.title} ${article.answer} ${blogCategory(article.category).label}`,
        ).includes(term),
      ),
  );
}
export function suggestRelatedArticles(articles: BlogArticle[], query: string, category: string) {
  const stop = new Set([
    "comment",
    "pour",
    "dans",
    "institut",
    "beaute",
    "cliente",
    "clientes",
    "quels",
    "quelle",
    "quelles",
    "avec",
    "sans",
  ]);
  const words = editorialQuestionKey(query)
    .split(" ")
    .filter((word) => word.length >= 4 && !stop.has(word));
  if (!words.length) return [];
  return articles
    .map((article) => ({
      article,
      score: words.filter((word) =>
        editorialQuestionKey(`${article.title} ${article.answer}`).includes(word),
      ).length,
    }))
    .filter((item) => item.score > 0 && item.article.category === category)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.article);
}
