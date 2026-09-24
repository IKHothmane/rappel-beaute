-- Allow creating a purchase without a supplier.
ALTER TABLE "Purchase" ALTER COLUMN "supplierId" DROP NOT NULL;
