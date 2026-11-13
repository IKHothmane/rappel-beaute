import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { marketingPageMetadata } from "@/lib/seo";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { searchArticles } from "@/lib/blog/articles";
import { publishedArticles } from "@/lib/blog/public";
import { ArticleCard } from "@/components/www/blog/ArticleCard";
import "./blog.css";
export const dynamic = "force-dynamic";
type Props = { searchParams: { q?: string; theme?: string; page?: string } };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const articles = await publishedArticles();
  return {
    ...marketingPageMetadata({
      title: "Le blog des professionnels de la beauté | Rappel Beauty",
      description:
        "Des guides pratiques pour organiser les rendez-vous, fidéliser les clientes et développer votre institut de beauté au Maroc.",
      canonical: "/blog/",
    }),
    robots: {
      index: articles.length > 0 && !searchParams.q && !searchParams.theme && !searchParams.page,
      follow: true,
    },
  };
}
export default async function BlogPage({ searchParams }: Props) {
  const articles = await publishedArticles();
  const query = typeof searchParams.q === "string" ? searchParams.q.slice(0, 150) : "";
  const theme = BLOG_CATEGORIES.some((c) => c.id === searchParams.theme) ? searchParams.theme! : "";
  const matches = searchArticles(articles, query, theme);
  return (
    <div className="bl">
      <section className="bl-hero bl-wrap">
        <div>
          <span className="bl-eyebrow">
            <BookOpen size={16} aria-hidden="true" /> Rappel Beauty · Conseils & guides
          </span>
          <h1>
            Le blog des professionnels <em>de la beauté</em>
          </h1>
          <p>
            Des conseils pour développer, organiser et digitaliser votre institut au Maroc. Des
            méthodes concrètes, du premier rendez-vous au pilotage de votre activité.
          </p>
          <a href="#guides" className="bl-primary">
            Explorer les guides <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="bl-hero-image">
          <Image
            src="/marketing/dashboard-pilotage.webp"
            alt="Le tableau de bord Rappel Beauty pour suivre l’activité de l’institut"
            width={1640}
            height={545}
            sizes="(max-width: 760px) 100vw, 50vw"
            priority
          />
        </div>
      </section>
      <section className="bl-wrap bl-library" id="guides">
        <div className="bl-section-heading">
          <span className="bl-eyebrow">La bibliothèque de votre institut</span>
          <h2>
            Des réponses pour <em>passer à l’action</em>
          </h2>
        </div>
        <form action="/blog/" className="bl-search" role="search">
          <label htmlFor="blog-query">Rechercher un guide</label>
          <div>
            <Search size={19} aria-hidden="true" />
            <input
              id="blog-query"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={150}
              placeholder="Rendez-vous, stock, fidélité…"
            />
          </div>
          <label htmlFor="blog-theme">Thème</label>
          <select id="blog-theme" name="theme" defaultValue={theme}>
            <option value="">Tous les thèmes</option>
            {BLOG_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button type="submit" className="bl-primary">
            Rechercher
          </button>
        </form>
        {articles.length === 0 ? (
          <div className="bl-empty">
            <BookOpen size={30} aria-hidden="true" />
            <h3>Les premiers guides sont en préparation</h3>
            <p>
              Nous préparons des réponses sur la gestion, la réservation et le développement de
              votre institut. Chaque guide sera relu avant sa publication.
            </p>
            <Link href="/faq/">Consulter les réponses sur Rappel Beauty →</Link>
          </div>
        ) : (
          <>
            <p role="status" className="bl-result-count">
              {matches.length} guide{matches.length > 1 ? "s" : ""}
              {query ? ` pour « ${query} »` : ""}
            </p>
            {matches.length ? (
              <div className="bl-grid">
                {matches.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            ) : (
              <div className="bl-empty">
                <h3>Aucun guide ne correspond à cette recherche</h3>
                <p>Essayez un autre terme ou consultez tous les thèmes.</p>
                <Link href="/blog/">Voir tous les guides →</Link>
              </div>
            )}
          </>
        )}
      </section>
      <section className="bl-wrap">
        <div className="bl-banner">
          <div>
            <h2>
              Une question sur <em>votre organisation ?</em>
            </h2>
            <p>Parlons de vos rendez-vous, de vos clientes et de votre quotidien.</p>
          </div>
          <Link href="/contact/">Contacter l’équipe →</Link>
        </div>
      </section>
    </div>
  );
}
