import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { blogCategory } from "@/lib/blog/categories";
import { readingMinutes } from "@/lib/blog/articles";
import type { BlogArticle } from "@/lib/blog/types";
export function ArticleCard({ article }: { article: BlogArticle }) {
  return (
    <article className="bl-card">
      <div className="bl-card-top">
        <BookOpen size={22} aria-hidden="true" />
        <span>{blogCategory(article.category).label}</span>
      </div>
      <h2>
        <Link href={`/blog/${article.slug}/`} prefetch={false}>
          {article.title}
        </Link>
      </h2>
      <p>{article.description}</p>
      <div className="bl-card-bottom">
        <span>{readingMinutes(article)} min de lecture</span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </div>
    </article>
  );
}
