import Link from "next/link";
import Image from "next/image";
import { absoluteUrl } from "@/lib/seo";
import { blogCategory } from "@/lib/blog/categories";
import { readingMinutes } from "@/lib/blog/articles";
import type { BlogArticle } from "@/lib/blog/types";
function date(value: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  }).format(new Date(value));
}
export function ArticleBody({
  article,
  preview = false,
}: {
  article: BlogArticle;
  preview?: boolean;
}) {
  const category = blogCategory(article.category);
  return (
    <article className="bl-article">
      {preview && (
        <p className="bl-review-note" role="status">
          Aperçu de relecture ·{" "}
          {article.status === "published" ? "Version publiée" : "Brouillon non public"}
        </p>
      )}
      <header className="bl-article-header">
        <p className="bl-eyebrow">{category.label}</p>
        <h1>{article.title}</h1>
        <p className="bl-meta">
          Par {article.author} · {readingMinutes(article)} min de lecture
        </p>
        {article.publishedAt && (
          <p className="bl-meta">
            Publié le <time dateTime={article.publishedAt}>{date(article.publishedAt)}</time>
            {article.updatedAt !== article.publishedAt && (
              <>
                {" "}
                · Mis à jour le <time dateTime={article.updatedAt}>{date(article.updatedAt)}</time>
              </>
            )}
          </p>
        )}
      </header>
      <div className="bl-answer">
        <strong>La réponse à retenir</strong>
        <p>{article.answer}</p>
      </div>
      <nav className="bl-toc" aria-label="Sommaire de l’article">
        <strong>Dans ce guide</strong>
        <ol>
          {article.sections.map((section, i) => (
            <li key={i}>
              <a href={`#section-${i + 1}`}>{section.title}</a>
            </li>
          ))}
          <li>
            <a href="#questions-professionnels">Questions fréquentes</a>
          </li>
        </ol>
      </nav>
      <div className="bl-prose">
        {article.sections.map((section, i) => (
          <section key={i} id={`section-${i + 1}`}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph, j) => (
              <p key={j}>{paragraph}</p>
            ))}
            {section.steps?.length ? (
              <ol>
                {section.steps.map((step, j) => (
                  <li key={j}>{step}</li>
                ))}
              </ol>
            ) : null}
            {section.table && (
              <div
                className="bl-table-scroll"
                role="region"
                aria-label={section.table.caption}
                tabIndex={0}
              >
                <table>
                  <caption>{section.table.caption}</caption>
                  <thead>
                    <tr>
                      {section.table.columns.map((column, j) => (
                        <th scope="col" key={j}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) =>
                          k === 0 ? (
                            <th scope="row" key={k}>
                              {cell}
                            </th>
                          ) : (
                            <td key={k}>{cell}</td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.image && (
              <figure className="bl-capture">
                <Image
                  src={section.image.src}
                  alt={section.image.alt}
                  width={section.image.width}
                  height={section.image.height}
                  sizes="(max-width: 800px) 100vw, 780px"
                />
                <figcaption>{section.image.caption}</figcaption>
              </figure>
            )}
          </section>
        ))}
      </div>
      <section id="questions-professionnels" className="bl-faq">
        <h2>Questions fréquentes des professionnels</h2>
        {article.faqs.map((faq, i) => (
          <details key={i}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </section>
      {article.sources.length > 0 && (
        <section className="bl-sources">
          <h2>Pour vérifier et approfondir</h2>
          <ul>
            {article.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p>
            Les ressources officielles et les conseils de professionnels compétents priment pour les
            décisions juridiques, comptables ou techniques propres à votre établissement.
          </p>
        </section>
      )}
      <section className="bl-next">
        <h2>Passer à la pratique avec Rappel Beauty</h2>
        <p>Vérifiez les fonctions et les conditions adaptées à votre institut.</p>
        <ul>
          {article.links.map((link) => (
            <li key={link.href}>
              <Link href={preview ? absoluteUrl(link.href) : link.href}>
                {link.label} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href={preview ? absoluteUrl("/demo/") : "/demo/"} className="bl-primary">
          Découvrir la démonstration <span aria-hidden="true">→</span>
        </Link>
      </section>
    </article>
  );
}
