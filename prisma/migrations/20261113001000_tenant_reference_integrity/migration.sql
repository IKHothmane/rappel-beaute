-- Additional tenant integrity constraints, alongside Prisma's single-column FKs.
-- NOT VALID preserves legacy rows for a separate, reviewed reconciliation. New
-- references and changes to reference keys are checked immediately, including
-- concurrent SQL writes and transfers of a parent's organizationId.
-- No rows are deleted or rewritten by this migration.
BEGIN;

CREATE UNIQUE INDEX "Supplier_id_organizationId_key" ON "Supplier" (id, "organizationId");
CREATE UNIQUE INDEX "Customer_id_organizationId_key" ON "Customer" (id, "organizationId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_supplier_tenant_fkey"
  FOREIGN KEY ("supplierId", "organizationId")
  REFERENCES "Supplier" (id, "organizationId")
  ON UPDATE NO ACTION ON DELETE SET NULL ("supplierId") NOT VALID;

ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_buyer_tenant_fkey"
  FOREIGN KEY ("buyerCustomerId", "organizationId")
  REFERENCES "Customer" (id, "organizationId")
  ON UPDATE NO ACTION ON DELETE SET NULL ("buyerCustomerId") NOT VALID;

ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_beneficiary_tenant_fkey"
  FOREIGN KEY ("beneficiaryCustomerId", "organizationId")
  REFERENCES "Customer" (id, "organizationId")
  ON UPDATE NO ACTION ON DELETE SET NULL ("beneficiaryCustomerId") NOT VALID;

COMMIT;
