-- LoyaltyAccount: contrainte 1:1 Customer ↔ LoyaltyAccount (Prisma 7)
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_customerId_key" ON "LoyaltyAccount"("customerId");
