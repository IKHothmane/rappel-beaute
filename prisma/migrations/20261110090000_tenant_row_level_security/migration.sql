-- Isolation par institut au niveau de Postgres (Row-Level Security).
-- Sans effet tant que l'application se connecte avec le rôle postgres (superutilisateur).
-- Les règles refusent tout par défaut : le rôle rappel_app doit annoncer soit un institut, soit un accès
-- explicitement autorisé (route publique, back-office, tâche de fond). Voir docs/rls-activation.md.

CREATE OR REPLACE FUNCTION app_current_org() RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.current_org', true), '') $$;

CREATE OR REPLACE FUNCTION app_rls_bypass() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT COALESCE(current_setting('app.rls_bypass', true) = 'on', false) $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rappel_app') THEN
    CREATE ROLE rappel_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO rappel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rappel_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rappel_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rappel_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO rappel_app;

DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON "_prisma_migrations" FROM rappel_app;
  END IF;
END $$;

-- Tables portant organizationId
ALTER TABLE "AIConversation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AIConversation" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AIUsagePeriod" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AIUsagePeriod" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AppleWalletPass" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AppleWalletPass" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Appointment" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AssistantAction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AssistantAction" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AssistantConversation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AssistantConversation" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AssistantCustomerSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AssistantCustomerSession" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AssistantSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AssistantSettings" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AssistantVerificationChallenge" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AssistantVerificationChallenge" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AssistantWidgetSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AssistantWidgetSession" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "BookingPolicySettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BookingPolicySettings" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Campaign" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CashRegisterSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CashRegisterSession" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CashRegisterTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CashRegisterTransaction" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CommissionAdjustment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CommissionAdjustment" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CommissionPeriod" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CommissionPeriod" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CommissionRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CommissionRecord" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CommissionSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CommissionSettings" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Customer" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CustomerNote" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CustomerNote" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "CustomerPushDelivery" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CustomerPushDelivery" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Expense" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "GiftCard" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GiftCard" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "GiftCardTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GiftCardTransaction" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "GoogleCalendarConnection" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GoogleCalendarConnection" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "GoogleWalletMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GoogleWalletMessage" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InventoryMovement" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invoice" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "InvoiceSequence" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InvoiceSequence" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyAccount" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyCard" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyCard" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyCreditCode" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyCreditCode" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyEvent" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyJoinQr" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyJoinQr" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyProgram" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyProgram" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyRedemption" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyRedemption" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyReward" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyReward" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyTransaction" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "LoyaltyVisitReward" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyVisitReward" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notification" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "NotificationPreference" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "OrganizationClosure" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "OrganizationClosure" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Package" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Package" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PackageSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PackageSession" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Payment" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PaymentTicketSequence" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentTicketSequence" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PosSale" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PosSale" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PostVisitSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PostVisitSettings" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Product" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Promotion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Promotion" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PromotionUsage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PromotionUsage" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PublicBookingEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PublicBookingEvent" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PublicWidget" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PublicWidget" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Purchase" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PurchaseReceipt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseReceipt" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "PushAccessGrant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PushAccessGrant" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "ReactivationSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReactivationSettings" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "ReactivationSnooze" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReactivationSnooze" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Resource" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Review" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "ReviewRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReviewRequest" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "ReviewSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReviewSettings" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Service" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Staff" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "StaffOvertime" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StaffOvertime" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "StaffReplacement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StaffReplacement" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Subscription" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Supplier" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "SupportSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SupportSession" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SupportTicket" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "User" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "WaitingListEntry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WaitingListEntry" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "WebPushSubscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WebPushSubscription" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "WhatsAppTask" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WhatsAppTask" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

ALTER TABLE "WhatsAppTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WhatsAppTemplate" USING (app_rls_bypass() OR "organizationId" = app_current_org()) WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

-- Tables enfants : visibles si leur ligne parente l'est
ALTER TABLE "ServiceStaff" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ServiceStaff" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceStaff"."serviceId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceStaff"."serviceId"));

ALTER TABLE "ServiceResource" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ServiceResource" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceResource"."serviceId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceResource"."serviceId"));

ALTER TABLE "ServiceProduct" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ServiceProduct" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceProduct"."serviceId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceProduct"."serviceId"));

ALTER TABLE "ServiceCommission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ServiceCommission" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceCommission"."serviceId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Service" parent WHERE parent.id = "ServiceCommission"."serviceId"));

ALTER TABLE "StaffSchedule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StaffSchedule" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Staff" parent WHERE parent.id = "StaffSchedule"."staffId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Staff" parent WHERE parent.id = "StaffSchedule"."staffId"));

ALTER TABLE "StaffBreak" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StaffBreak" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Staff" parent WHERE parent.id = "StaffBreak"."staffId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Staff" parent WHERE parent.id = "StaffBreak"."staffId"));

ALTER TABLE "StaffLeave" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StaffLeave" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Staff" parent WHERE parent.id = "StaffLeave"."staffId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Staff" parent WHERE parent.id = "StaffLeave"."staffId"));

ALTER TABLE "ResourceMaintenance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ResourceMaintenance" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Resource" parent WHERE parent.id = "ResourceMaintenance"."resourceId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Resource" parent WHERE parent.id = "ResourceMaintenance"."resourceId"));

ALTER TABLE "ProductLot" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProductLot" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Product" parent WHERE parent.id = "ProductLot"."productId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Product" parent WHERE parent.id = "ProductLot"."productId"));

ALTER TABLE "ProductPriceHistory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProductPriceHistory" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Product" parent WHERE parent.id = "ProductPriceHistory"."productId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Product" parent WHERE parent.id = "ProductPriceHistory"."productId"));

ALTER TABLE "ProductSupplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProductSupplier" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Product" parent WHERE parent.id = "ProductSupplier"."productId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Product" parent WHERE parent.id = "ProductSupplier"."productId"));

ALTER TABLE "PurchaseItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseItem" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Purchase" parent WHERE parent.id = "PurchaseItem"."purchaseId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Purchase" parent WHERE parent.id = "PurchaseItem"."purchaseId"));

ALTER TABLE "PurchaseReceiptLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseReceiptLine" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "PurchaseReceipt" parent WHERE parent.id = "PurchaseReceiptLine"."receiptId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "PurchaseReceipt" parent WHERE parent.id = "PurchaseReceiptLine"."receiptId"));

ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InvoiceItem" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Invoice" parent WHERE parent.id = "InvoiceItem"."invoiceId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Invoice" parent WHERE parent.id = "InvoiceItem"."invoiceId"));

ALTER TABLE "PackageItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PackageItem" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Package" parent WHERE parent.id = "PackageItem"."packageId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Package" parent WHERE parent.id = "PackageItem"."packageId"));

ALTER TABLE "CampaignRecipient" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CampaignRecipient" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Campaign" parent WHERE parent.id = "CampaignRecipient"."campaignId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Campaign" parent WHERE parent.id = "CampaignRecipient"."campaignId"));

ALTER TABLE "ActivationToken" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ActivationToken" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "User" parent WHERE parent.id = "ActivationToken"."userId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "User" parent WHERE parent.id = "ActivationToken"."userId"));

ALTER TABLE "SupportMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SupportMessage" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "SupportTicket" parent WHERE parent.id = "SupportMessage"."ticketId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "SupportTicket" parent WHERE parent.id = "SupportMessage"."ticketId"));

ALTER TABLE "AIMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AIMessage" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "AIConversation" parent WHERE parent.id = "AIMessage"."conversationId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "AIConversation" parent WHERE parent.id = "AIMessage"."conversationId"));

ALTER TABLE "PublicWidgetOrigin" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PublicWidgetOrigin" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "PublicWidget" parent WHERE parent.id = "PublicWidgetOrigin"."widgetId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "PublicWidget" parent WHERE parent.id = "PublicWidgetOrigin"."widgetId"));

ALTER TABLE "AssistantMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AssistantMessage" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "AssistantConversation" parent WHERE parent.id = "AssistantMessage"."conversationId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "AssistantConversation" parent WHERE parent.id = "AssistantMessage"."conversationId"));

ALTER TABLE "AppleWalletRegistration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AppleWalletRegistration" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "AppleWalletPass" parent WHERE parent.id = "AppleWalletRegistration"."passId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "AppleWalletPass" parent WHERE parent.id = "AppleWalletRegistration"."passId"));

ALTER TABLE "ReviewStaffRating" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReviewStaffRating" USING (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Review" parent WHERE parent.id = "ReviewStaffRating"."reviewId")) WITH CHECK (app_rls_bypass() OR EXISTS (SELECT 1 FROM "Review" parent WHERE parent.id = "ReviewStaffRating"."reviewId"));

