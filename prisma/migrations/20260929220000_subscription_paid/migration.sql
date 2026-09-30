-- Suivi manuel du paiement de l'abonnement institut

ALTER TABLE "Subscription" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "paidAt" TIMESTAMP(3);
