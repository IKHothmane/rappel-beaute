-- Index manquants sur des clés étrangères (suppression ou rattachement d'une cliente, d'un soin,
-- d'un membre d'équipe, d'un paiement : sans index, chaque suppression parent parcourt la table fille),
-- et Appointment(customerId, status) pour la fiche cliente (rendez-vous par statut).
--
-- Sûreté du déploiement : CREATE INDEX IF NOT EXISTS (rejouable), aucune donnée modifiée. Un index
-- non concurrent bloque les écritures de la table le temps de sa construction ; prisma migrate
-- exécute le fichier dans une seule transaction, où CREATE INDEX CONCURRENTLY est interdit.
-- Les tables concernées sont de taille modeste (ordre de grandeur : dizaines de milliers de lignes,
-- construction en moins d'une seconde). lock_timeout évite d'attendre indéfiniment derrière une
-- transaction longue : la migration échoue et se relance, sans bloquer le trafic.
-- AssistantVerificationChallenge(organizationId) accompagne la clé étrangère ajoutée par la migration suivante.
-- Appointment(customerId) existe déjà : (customerId, status) le complète, ne le remplace pas.
-- Pas de pg_trgm ni de changement de politiques RLS ici.
--
-- Retour arrière : DROP INDEX IF EXISTS "<nom>"; pour chaque index ci-dessous (sans perte de données).

SET lock_timeout = '10s';

CREATE INDEX IF NOT EXISTS "Appointment_serviceId_idx" ON "Appointment" ("serviceId");
CREATE INDEX IF NOT EXISTS "Appointment_customerId_status_idx" ON "Appointment" ("customerId", "status");
CREATE INDEX IF NOT EXISTS "Review_customerId_idx" ON "Review" ("customerId");
CREATE INDEX IF NOT EXISTS "Review_staffId_idx" ON "Review" ("staffId");
CREATE INDEX IF NOT EXISTS "PosSale_customerId_idx" ON "PosSale" ("customerId");
CREATE INDEX IF NOT EXISTS "PosSale_paymentId_idx" ON "PosSale" ("paymentId");
CREATE INDEX IF NOT EXISTS "Promotion_customerId_idx" ON "Promotion" ("customerId");
CREATE INDEX IF NOT EXISTS "LoyaltyVisitReward_customerId_idx" ON "LoyaltyVisitReward" ("customerId");
CREATE INDEX IF NOT EXISTS "WaitingListEntry_customerId_idx" ON "WaitingListEntry" ("customerId");
CREATE INDEX IF NOT EXISTS "WaitingListEntry_serviceId_idx" ON "WaitingListEntry" ("serviceId");
CREATE INDEX IF NOT EXISTS "ReactivationSnooze_customerId_idx" ON "ReactivationSnooze" ("customerId");
CREATE INDEX IF NOT EXISTS "NotificationPreference_customerId_idx" ON "NotificationPreference" ("customerId");
CREATE INDEX IF NOT EXISTS "WebPushSubscription_customerId_idx" ON "WebPushSubscription" ("customerId");
CREATE INDEX IF NOT EXISTS "PushAccessGrant_customerId_idx" ON "PushAccessGrant" ("customerId");
CREATE INDEX IF NOT EXISTS "GoogleWalletMessage_customerId_idx" ON "GoogleWalletMessage" ("customerId");
CREATE INDEX IF NOT EXISTS "AssistantCustomerSession_customerId_idx" ON "AssistantCustomerSession" ("customerId");
CREATE INDEX IF NOT EXISTS "InvoiceItem_serviceId_idx" ON "InvoiceItem" ("serviceId");
CREATE INDEX IF NOT EXISTS "CommissionRecord_serviceId_idx" ON "CommissionRecord" ("serviceId");
CREATE INDEX IF NOT EXISTS "LoyaltyEvent_serviceId_idx" ON "LoyaltyEvent" ("serviceId");
CREATE INDEX IF NOT EXISTS "AssistantVerificationChallenge_organizationId_idx" ON "AssistantVerificationChallenge" ("organizationId");

RESET lock_timeout;
