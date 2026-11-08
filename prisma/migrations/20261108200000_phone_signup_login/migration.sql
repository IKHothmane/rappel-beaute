ALTER TABLE "User" ALTER COLUMN email DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "loginPhone" TEXT;
CREATE UNIQUE INDEX "User_loginPhone_key" ON "User"("loginPhone");
