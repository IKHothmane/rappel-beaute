import type { Metadata } from "next";
import { absoluteUrl, marketingPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import type { BlogArticle } from "./types";
export function articleMetadata(article: BlogArticle): Metadata {
  const canonical = `/blog/${article.slug}/`;
  const image = article.sections.find((section) => section.image)?.image?.src ?? "/brand/logo.webp";
  return {
    ...marketingPageMetadata({
      title: `${article.title} | Rappel Beauty`,
      description: article.description,
      canonical,
    }),
    robots: { index: article.status === "published", follow: true },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: absoluteUrl(canonical),
      images: [absoluteUrl(image)],
      authors: [article.author],
      ...(article.publishedAt
        ? { publishedTime: article.publishedAt, modifiedTime: article.updatedAt }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [absoluteUrl(image)],
    },
  };
}
export function articleJsonLd(article: BlogArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": absoluteUrl(`/blog/${article.slug}/#article`),
    headline: article.title,
    description: article.description,
    inLanguage: "fr-MA",
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}/`),
    author: { "@type": "Organization", name: article.author, url: `${SITE.url}/a-propos/` },
    publisher: { "@id": `${SITE.url}/#organization` },
    image: absoluteUrl(
      article.sections.find((section) => section.image)?.image?.src ?? "/brand/logo.webp",
    ),
    ...(article.publishedAt
      ? { datePublished: article.publishedAt, dateModified: article.updatedAt }
      : {}),
  };
}
