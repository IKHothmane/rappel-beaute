CREATE TABLE "BlogArticle" (
  "slug" TEXT PRIMARY KEY,
  "content" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'published')),
  "author" TEXT NOT NULL DEFAULT 'Rappel Beauty',
  "version" INTEGER NOT NULL DEFAULT 1,
  "reviewedBy" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogArticle_review_required" CHECK ("status" <> 'published' OR ("reviewedBy" IS NOT NULL AND "publishedAt" IS NOT NULL))
);
CREATE INDEX "BlogArticle_publication_idx" ON "BlogArticle" ("status", "publishedAt");

CREATE TABLE "BlogQuestion" (
  "id" TEXT PRIMARY KEY,
  "fingerprint" TEXT NOT NULL UNIQUE,
  "question" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "articleSlug" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BlogQuestion_updatedAt_idx" ON "BlogQuestion" ("updatedAt");
