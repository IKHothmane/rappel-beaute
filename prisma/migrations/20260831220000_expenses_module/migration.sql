-- Expenses + AuditLog + CashTxn EXPENSE

DO $$ BEGIN
  ALTER TYPE "CashTxnType" ADD VALUE 'EXPENSE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE "ExpenseCategory" AS ENUM (
  'RENT',
  'ELECTRICITY',
  'WATER',
  'INTERNET',
  'SALARY',
  'MARKETING',
  'MAINTENANCE',
  'TRANSPORT',
  'OFFICE',
  'PRODUCT_PURCHASE',
  'OTHER'
);

CREATE TYPE "ExpenseStatus" AS ENUM ('RECORDED', 'VOID');

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "category" "ExpenseCategory" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "description" TEXT,
  "supplierId" TEXT,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'RECORDED',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Expense_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Expense_organizationId_idx" ON "Expense"("organizationId");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_expenseDate_idx" ON "Expense"("organizationId", "expenseDate");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_category_idx" ON "Expense"("organizationId", "category");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_status_idx" ON "Expense"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Expense_supplierId_idx" ON "Expense"("supplierId");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_deletedAt_idx" ON "Expense"("organizationId", "deletedAt");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_entityType_entityId_idx"
  ON "AuditLog"("organizationId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx"
  ON "AuditLog"("organizationId", "createdAt");
