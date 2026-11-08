ALTER TABLE "Review" ADD COLUMN "staffId" TEXT;
ALTER TABLE "Review" ADD COLUMN "staffRating" INTEGER;
ALTER TABLE "Review" ADD CONSTRAINT "Review_staffRating_check"
  CHECK ("staffRating" IS NULL OR "staffRating" BETWEEN 1 AND 5);
ALTER TABLE "Review" ADD CONSTRAINT "Review_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Review_organizationId_staffId_idx" ON "Review"("organizationId", "staffId");
