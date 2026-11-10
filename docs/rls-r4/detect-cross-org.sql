-- Détection des références entre instituts (risque R4). LECTURE SEULE : aucun UPDATE, DELETE ni INSERT.
-- À exécuter avec le rôle propriétaire (postgres), qui n'est pas soumis à RLS, sur une COPIE de la production d'abord.
-- Chaque requête renvoie le nombre de lignes dont la référence pointe vers une ligne d'un autre institut.
-- Résultat attendu avant migration : 0 partout. Toute ligne non nulle doit être traitée (voir README.md) avant d'appliquer la migration.
\pset format aligned
SELECT 'FK directes (organizationId des deux côtés)' AS section;
SELECT 'AIConversation.userId -> User' AS reference, count(*) AS lignes_incompatibles
  FROM "AIConversation" c JOIN "User" p ON p.id = c."userId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AppleWalletPass.loyaltyCardId -> LoyaltyCard' AS reference, count(*) AS lignes_incompatibles
  FROM "AppleWalletPass" c JOIN "LoyaltyCard" p ON p.id = c."loyaltyCardId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Appointment.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "Appointment" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Appointment.promotionId -> Promotion' AS reference, count(*) AS lignes_incompatibles
  FROM "Appointment" c JOIN "Promotion" p ON p.id = c."promotionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Appointment.resourceId -> Resource' AS reference, count(*) AS lignes_incompatibles
  FROM "Appointment" c JOIN "Resource" p ON p.id = c."resourceId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Appointment.serviceId -> Service' AS reference, count(*) AS lignes_incompatibles
  FROM "Appointment" c JOIN "Service" p ON p.id = c."serviceId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Appointment.staffId -> Staff' AS reference, count(*) AS lignes_incompatibles
  FROM "Appointment" c JOIN "Staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantAction.conversationId -> AssistantConversation' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantAction" c JOIN "AssistantConversation" p ON p.id = c."conversationId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantAction.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantAction" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantConversation.customerSessionId -> AssistantCustomerSession' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantConversation" c JOIN "AssistantCustomerSession" p ON p.id = c."customerSessionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantConversation.widgetSessionId -> AssistantWidgetSession' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantConversation" c JOIN "AssistantWidgetSession" p ON p.id = c."widgetSessionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantCustomerSession.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantCustomerSession" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantCustomerSession.widgetSessionId -> AssistantWidgetSession' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantCustomerSession" c JOIN "AssistantWidgetSession" p ON p.id = c."widgetSessionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantVerificationChallenge.widgetSessionId -> AssistantWidgetSession' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantVerificationChallenge" c JOIN "AssistantWidgetSession" p ON p.id = c."widgetSessionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'AssistantWidgetSession.widgetId -> PublicWidget' AS reference, count(*) AS lignes_incompatibles
  FROM "AssistantWidgetSession" c JOIN "PublicWidget" p ON p.id = c."widgetId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Campaign.promotionId -> Promotion' AS reference, count(*) AS lignes_incompatibles
  FROM "Campaign" c JOIN "Promotion" p ON p.id = c."promotionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CashRegisterTransaction.paymentId -> Payment' AS reference, count(*) AS lignes_incompatibles
  FROM "CashRegisterTransaction" c JOIN "Payment" p ON p.id = c."paymentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CashRegisterTransaction.sessionId -> CashRegisterSession' AS reference, count(*) AS lignes_incompatibles
  FROM "CashRegisterTransaction" c JOIN "CashRegisterSession" p ON p.id = c."sessionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CommissionAdjustment.commissionRecordId -> CommissionRecord' AS reference, count(*) AS lignes_incompatibles
  FROM "CommissionAdjustment" c JOIN "CommissionRecord" p ON p.id = c."commissionRecordId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CommissionRecord.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "CommissionRecord" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CommissionRecord.posSaleId -> PosSale' AS reference, count(*) AS lignes_incompatibles
  FROM "CommissionRecord" c JOIN "PosSale" p ON p.id = c."posSaleId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CommissionRecord.staffId -> Staff' AS reference, count(*) AS lignes_incompatibles
  FROM "CommissionRecord" c JOIN "Staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CustomerNote.authorId -> User' AS reference, count(*) AS lignes_incompatibles
  FROM "CustomerNote" c JOIN "User" p ON p.id = c."authorId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CustomerNote.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "CustomerNote" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'CustomerPushDelivery.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "CustomerPushDelivery" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Expense.supplierId -> Supplier' AS reference, count(*) AS lignes_incompatibles
  FROM "Expense" c JOIN "Supplier" p ON p.id = c."supplierId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'GiftCard.beneficiaryCustomerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "GiftCard" c JOIN "Customer" p ON p.id = c."beneficiaryCustomerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'GiftCard.buyerCustomerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "GiftCard" c JOIN "Customer" p ON p.id = c."buyerCustomerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'GiftCardTransaction.giftCardId -> GiftCard' AS reference, count(*) AS lignes_incompatibles
  FROM "GiftCardTransaction" c JOIN "GiftCard" p ON p.id = c."giftCardId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'GoogleWalletMessage.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "GoogleWalletMessage" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'GoogleWalletMessage.loyaltyCardId -> LoyaltyCard' AS reference, count(*) AS lignes_incompatibles
  FROM "GoogleWalletMessage" c JOIN "LoyaltyCard" p ON p.id = c."loyaltyCardId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'InventoryMovement.productId -> Product' AS reference, count(*) AS lignes_incompatibles
  FROM "InventoryMovement" c JOIN "Product" p ON p.id = c."productId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Invoice.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "Invoice" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Invoice.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "Invoice" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Invoice.promotionId -> Promotion' AS reference, count(*) AS lignes_incompatibles
  FROM "Invoice" c JOIN "Promotion" p ON p.id = c."promotionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyAccount.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyAccount" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyCard.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyCard" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyEvent.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyEvent" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyEvent.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyEvent" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyEvent.loyaltyCardId -> LoyaltyCard' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyEvent" c JOIN "LoyaltyCard" p ON p.id = c."loyaltyCardId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyRedemption.accountId -> LoyaltyAccount' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyRedemption" c JOIN "LoyaltyAccount" p ON p.id = c."accountId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyRedemption.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyRedemption" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyRedemption.rewardId -> LoyaltyReward' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyRedemption" c JOIN "LoyaltyReward" p ON p.id = c."rewardId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyTransaction.accountId -> LoyaltyAccount' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyTransaction" c JOIN "LoyaltyAccount" p ON p.id = c."accountId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyVisitReward.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyVisitReward" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyVisitReward.loyaltyCardId -> LoyaltyCard' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyVisitReward" c JOIN "LoyaltyCard" p ON p.id = c."loyaltyCardId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'LoyaltyVisitReward.loyaltyEventId -> LoyaltyEvent' AS reference, count(*) AS lignes_incompatibles
  FROM "LoyaltyVisitReward" c JOIN "LoyaltyEvent" p ON p.id = c."loyaltyEventId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Notification.userId -> User' AS reference, count(*) AS lignes_incompatibles
  FROM "Notification" c JOIN "User" p ON p.id = c."userId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'NotificationPreference.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "NotificationPreference" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Package.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "Package" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Package.serviceId -> Service' AS reference, count(*) AS lignes_incompatibles
  FROM "Package" c JOIN "Service" p ON p.id = c."serviceId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PackageSession.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "PackageSession" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PackageSession.packageId -> Package' AS reference, count(*) AS lignes_incompatibles
  FROM "PackageSession" c JOIN "Package" p ON p.id = c."packageId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Payment.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "Payment" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Payment.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "Payment" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Payment.giftCardId -> GiftCard' AS reference, count(*) AS lignes_incompatibles
  FROM "Payment" c JOIN "GiftCard" p ON p.id = c."giftCardId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Payment.invoiceId -> Invoice' AS reference, count(*) AS lignes_incompatibles
  FROM "Payment" c JOIN "Invoice" p ON p.id = c."invoiceId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Payment.parentPaymentId -> Payment' AS reference, count(*) AS lignes_incompatibles
  FROM "Payment" c JOIN "Payment" p ON p.id = c."parentPaymentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PosSale.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "PosSale" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PosSale.invoiceId -> Invoice' AS reference, count(*) AS lignes_incompatibles
  FROM "PosSale" c JOIN "Invoice" p ON p.id = c."invoiceId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PromotionUsage.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "PromotionUsage" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PromotionUsage.promotionId -> Promotion' AS reference, count(*) AS lignes_incompatibles
  FROM "PromotionUsage" c JOIN "Promotion" p ON p.id = c."promotionId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Purchase.supplierId -> Supplier' AS reference, count(*) AS lignes_incompatibles
  FROM "Purchase" c JOIN "Supplier" p ON p.id = c."supplierId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PurchaseReceipt.purchaseId -> Purchase' AS reference, count(*) AS lignes_incompatibles
  FROM "PurchaseReceipt" c JOIN "Purchase" p ON p.id = c."purchaseId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'PushAccessGrant.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "PushAccessGrant" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'ReactivationSnooze.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "ReactivationSnooze" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Review.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "Review" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Review.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "Review" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Review.reviewRequestId -> ReviewRequest' AS reference, count(*) AS lignes_incompatibles
  FROM "Review" c JOIN "ReviewRequest" p ON p.id = c."reviewRequestId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'Review.staffId -> Staff' AS reference, count(*) AS lignes_incompatibles
  FROM "Review" c JOIN "Staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'ReviewRequest.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "ReviewRequest" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'ReviewRequest.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "ReviewRequest" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'ReviewRequest.whatsappTaskId -> WhatsAppTask' AS reference, count(*) AS lignes_incompatibles
  FROM "ReviewRequest" c JOIN "WhatsAppTask" p ON p.id = c."whatsappTaskId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'StaffOvertime.staffId -> Staff' AS reference, count(*) AS lignes_incompatibles
  FROM "StaffOvertime" c JOIN "Staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'StaffReplacement.absentStaffId -> Staff' AS reference, count(*) AS lignes_incompatibles
  FROM "StaffReplacement" c JOIN "Staff" p ON p.id = c."absentStaffId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'StaffReplacement.substituteStaffId -> Staff' AS reference, count(*) AS lignes_incompatibles
  FROM "StaffReplacement" c JOIN "Staff" p ON p.id = c."substituteStaffId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'SupportTicket.createdByUserId -> User' AS reference, count(*) AS lignes_incompatibles
  FROM "SupportTicket" c JOIN "User" p ON p.id = c."createdByUserId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WaitingListEntry.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "WaitingListEntry" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WaitingListEntry.serviceId -> Service' AS reference, count(*) AS lignes_incompatibles
  FROM "WaitingListEntry" c JOIN "Service" p ON p.id = c."serviceId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WaitingListEntry.staffId -> Staff' AS reference, count(*) AS lignes_incompatibles
  FROM "WaitingListEntry" c JOIN "Staff" p ON p.id = c."staffId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WebPushSubscription.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "WebPushSubscription" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WhatsAppTask.appointmentId -> Appointment' AS reference, count(*) AS lignes_incompatibles
  FROM "WhatsAppTask" c JOIN "Appointment" p ON p.id = c."appointmentId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WhatsAppTask.campaignId -> Campaign' AS reference, count(*) AS lignes_incompatibles
  FROM "WhatsAppTask" c JOIN "Campaign" p ON p.id = c."campaignId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WhatsAppTask.customerId -> Customer' AS reference, count(*) AS lignes_incompatibles
  FROM "WhatsAppTask" c JOIN "Customer" p ON p.id = c."customerId" WHERE c."organizationId" <> p."organizationId"
UNION ALL
SELECT 'WhatsAppTask.templateId -> WhatsAppTemplate' AS reference, count(*) AS lignes_incompatibles
  FROM "WhatsAppTask" c JOIN "WhatsAppTemplate" p ON p.id = c."templateId" WHERE c."organizationId" <> p."organizationId"
ORDER BY lignes_incompatibles DESC, reference;

SELECT 'Tables enfants sans organizationId : la référence secondaire doit viser le même institut que la ligne parente' AS section;
SELECT 'CampaignRecipient.customerId -> Customer (institut de Campaign.campaignId)' AS reference, count(*) AS lignes_incompatibles
  FROM "CampaignRecipient" c JOIN "Campaign" pp ON pp.id = c."campaignId" JOIN "Customer" t ON t.id = c."customerId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'CampaignRecipient.whatsappTaskId -> WhatsAppTask (institut de Campaign.campaignId)' AS reference, count(*) AS lignes_incompatibles
  FROM "CampaignRecipient" c JOIN "Campaign" pp ON pp.id = c."campaignId" JOIN "WhatsAppTask" t ON t.id = c."whatsappTaskId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'InvoiceItem.productId -> Product (institut de Invoice.invoiceId)' AS reference, count(*) AS lignes_incompatibles
  FROM "InvoiceItem" c JOIN "Invoice" pp ON pp.id = c."invoiceId" JOIN "Product" t ON t.id = c."productId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'PackageItem.serviceId -> Service (institut de Package.packageId)' AS reference, count(*) AS lignes_incompatibles
  FROM "PackageItem" c JOIN "Package" pp ON pp.id = c."packageId" JOIN "Service" t ON t.id = c."serviceId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'ProductSupplier.supplierId -> Supplier (institut de Product.productId)' AS reference, count(*) AS lignes_incompatibles
  FROM "ProductSupplier" c JOIN "Product" pp ON pp.id = c."productId" JOIN "Supplier" t ON t.id = c."supplierId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'PurchaseItem.productId -> Product (institut de Purchase.purchaseId)' AS reference, count(*) AS lignes_incompatibles
  FROM "PurchaseItem" c JOIN "Purchase" pp ON pp.id = c."purchaseId" JOIN "Product" t ON t.id = c."productId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'ReviewStaffRating.staffId -> Staff (institut de Review.reviewId)' AS reference, count(*) AS lignes_incompatibles
  FROM "ReviewStaffRating" c JOIN "Review" pp ON pp.id = c."reviewId" JOIN "Staff" t ON t.id = c."staffId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'ServiceCommission.staffId -> Staff (institut de Service.serviceId)' AS reference, count(*) AS lignes_incompatibles
  FROM "ServiceCommission" c JOIN "Service" pp ON pp.id = c."serviceId" JOIN "Staff" t ON t.id = c."staffId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'ServiceProduct.productId -> Product (institut de Service.serviceId)' AS reference, count(*) AS lignes_incompatibles
  FROM "ServiceProduct" c JOIN "Service" pp ON pp.id = c."serviceId" JOIN "Product" t ON t.id = c."productId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'ServiceResource.resourceId -> Resource (institut de Service.serviceId)' AS reference, count(*) AS lignes_incompatibles
  FROM "ServiceResource" c JOIN "Service" pp ON pp.id = c."serviceId" JOIN "Resource" t ON t.id = c."resourceId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'ServiceStaff.staffId -> Staff (institut de Service.serviceId)' AS reference, count(*) AS lignes_incompatibles
  FROM "ServiceStaff" c JOIN "Service" pp ON pp.id = c."serviceId" JOIN "Staff" t ON t.id = c."staffId" WHERE pp."organizationId" <> t."organizationId"
UNION ALL
SELECT 'SupportMessage.senderUserId -> User (institut de SupportTicket.ticketId)' AS reference, count(*) AS lignes_incompatibles
  FROM "SupportMessage" c JOIN "SupportTicket" pp ON pp.id = c."ticketId" JOIN "User" t ON t.id = c."senderUserId" WHERE pp."organizationId" <> t."organizationId"
ORDER BY lignes_incompatibles DESC, reference;

SELECT 'Détail (identifiants) : remplacer <table>, <colonne>, <parent> pour lister les lignes d''une référence non nulle' AS section;
-- SELECT c.id, c."organizationId" AS org_ligne, p."organizationId" AS org_reference
--   FROM "<table>" c JOIN "<parent>" p ON p.id = c."<colonne>" WHERE c."organizationId" <> p."organizationId";
