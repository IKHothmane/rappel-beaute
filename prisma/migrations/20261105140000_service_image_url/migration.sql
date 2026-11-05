-- Photo principale optionnelle pour chaque service

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
