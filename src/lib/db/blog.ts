import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/db/tenant-pool";
import { runInScope } from "@/lib/db/tenant-context";
import { BLOG_DRAFTS, editorialQuestionKey } from "@/lib/blog/articles";
import type { BlogArticle, BlogContent } from "@/lib/blog/types";
import { validateBlogContent } from "@/lib/blog/validation";

const globalPool = globalThis as unknown as { blogPool?: Pool };
const pool = (globalPool.blogPool ??= withTenantIsolation(
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 5000,
    statement_timeout: 8000,
  }),
));
type Row = Omit<BlogArticle, keyof BlogContent | "createdAt" | "updatedAt" | "publishedAt"> & {
  content: BlogContent;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};
function fromRow(row: Row): BlogArticle {
  return {
    ...row.content,
    status: row.status,
    author: row.author,
    version: row.version,
    reviewedBy: row.reviewedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}
export async function listEditorialArticles(): Promise<BlogArticle[]> {
  const { rows } = await pool.query<Row>('SELECT * FROM "BlogArticle" ORDER BY "updatedAt" DESC');
  const stored = new Map(rows.map((row) => [row.content.slug, fromRow(row)]));
  return [
    ...BLOG_DRAFTS.map((seed) => stored.get(seed.slug) ?? seed),
    ...[...stored.values()].filter(
      (article) => !BLOG_DRAFTS.some((seed) => seed.slug === article.slug),
    ),
  ];
}

/** Accès public limité aux versions explicitement relues et publiées. Aucun retour des brouillons. */
export async function listPublishedArticles(): Promise<BlogArticle[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await runInScope({ kind: "public", reason: "articles publics relus" }, async () => {
      const { rows } = await pool.query<Row>(`SELECT * FROM "BlogArticle"
        WHERE status = 'published' AND "reviewedBy" IS NOT NULL AND "publishedAt" <= NOW()
        ORDER BY "publishedAt" DESC, slug ASC`);
      return rows.filter((row) => !validateBlogContent(row.content)).map(fromRow);
    });
  } catch (error) {
    // Avant migration : la vitrine reste utilisable, sans rendre un brouillon public.
    if ((error as { code?: string }).code === "42P01") return [];
    throw error;
  }
}

export async function saveEditorialArticle(
  content: BlogContent,
  status: "draft" | "published",
  version: number,
  reviewer: string,
): Promise<BlogArticle | null> {
  // La version évite qu'une relecture écrase silencieusement une modification concurrente.
  if (version === 0) {
    const { rows } = await pool.query<Row>(
      `INSERT INTO "BlogArticle"
      (slug, content, status, "reviewedBy", "publishedAt", "version")
      VALUES ($1, $2::jsonb, $3, $4, CASE WHEN $3 = 'published' THEN NOW() ELSE NULL END, 1)
      ON CONFLICT (slug) DO NOTHING RETURNING *`,
      [content.slug, JSON.stringify(content), status, status === "published" ? reviewer : null],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }
  const { rows } = await pool.query<Row>(
    `UPDATE "BlogArticle" SET content = $2::jsonb, status = $3,
    "reviewedBy" = $4, "publishedAt" = CASE WHEN $3 = 'published' THEN COALESCE("publishedAt", NOW()) ELSE "publishedAt" END,
    "updatedAt" = NOW(), version = version + 1
    WHERE slug = $1 AND version = $5 RETURNING *`,
    [
      content.slug,
      JSON.stringify(content),
      status,
      status === "published" ? reviewer : null,
      version,
    ],
  );
  return rows[0] ? fromRow(rows[0]) : null;
}
export type EditorialQuestion = {
  id: string;
  question: string;
  category: string;
  occurrences: number;
  articleSlug: string | null;
  updatedAt: string;
};
export async function listEditorialQuestions(): Promise<EditorialQuestion[]> {
  const { rows } = await pool.query(
    'SELECT id, question, category, occurrences, "articleSlug", "updatedAt" FROM "BlogQuestion" ORDER BY "updatedAt" DESC LIMIT 500',
  );
  return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }));
}
export async function addEditorialQuestion(question: string, category: string) {
  const key = editorialQuestionKey(question);
  const fingerprint = createHash("sha256").update(key).digest("hex");
  await pool.query(
    `INSERT INTO "BlogQuestion" (id, fingerprint, question, category) VALUES ($1, $2, $3, $4)
    ON CONFLICT (fingerprint) DO UPDATE SET occurrences = "BlogQuestion".occurrences + 1, "updatedAt" = NOW()`,
    [randomUUID(), fingerprint, question.trim(), category],
  );
}
export async function linkEditorialQuestion(id: string, slug: string | null) {
  const { rowCount } = await pool.query(
    `UPDATE "BlogQuestion" SET "articleSlug" = $2, "updatedAt" = NOW() WHERE id = $1`,
    [id, slug],
  );
  return rowCount === 1;
}
