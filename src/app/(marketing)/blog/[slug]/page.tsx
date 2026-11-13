import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedArticles } from "@/lib/blog/public";
import { articleMetadata, articleJsonLd } from "@/lib/blog/seo";
import { ArticleBody } from "@/components/www/blog/ArticleBody";
import { ArticleCard } from "@/components/www/blog/ArticleCard";
import { JsonLd } from "@/components/www/JsonLd";
import "../blog.css";
export const dynamic = "force-dynamic";
type Props = { params: { slug: string } };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = (await publishedArticles()).find((a) => a.slug === params.slug);
  if (!article) return { title: "Guide introuvable", robots: { index: false, follow: false } };
  return articleMetadata(article);
}
export default async function BlogArticlePage({ params }: Props) {
  const articles = await publishedArticles();
  const article = articles.find((a) => a.slug === params.slug);
  if (!article) notFound();
  const related = articles
    .filter((a) => a.slug !== article.slug)
    .sort(
      (a, b) => Number(b.category === article.category) - Number(a.category === article.category),
    )
    .slice(0, 3);
  return (
    <div className="bl">
      <div className="bl-wrap">
        <nav className="bl-breadcrumb" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <Link href="/blog/">Conseils & guides</Link>
        </nav>
        <JsonLd data={articleJsonLd(article)} />
        <ArticleBody article={article} />
        {related.length > 0 && (
          <section className="bl-related">
            <h2>
              Pour aller <em>plus loin</em>
            </h2>
            <div className="bl-grid">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
