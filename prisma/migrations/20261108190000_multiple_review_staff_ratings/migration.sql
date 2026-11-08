CREATE TABLE "ReviewStaffRating" (
  "reviewId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "rating" INTEGER,
  CONSTRAINT "ReviewStaffRating_pkey" PRIMARY KEY ("reviewId", "staffId"),
  CONSTRAINT "ReviewStaffRating_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
  CONSTRAINT "ReviewStaffRating_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReviewStaffRating_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReviewStaffRating_staffId_idx" ON "ReviewStaffRating"("staffId");
INSERT INTO "ReviewStaffRating" ("reviewId", "staffId", rating)
SELECT id, "staffId", "staffRating" FROM "Review" WHERE "staffId" IS NOT NULL;
