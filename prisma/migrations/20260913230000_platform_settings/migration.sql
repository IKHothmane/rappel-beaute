-- Paramètres Super Admin : profil étendu + config JSON plateforme

ALTER TABLE "PlatformUser"
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Casablanca';

CREATE TABLE IF NOT EXISTS "PlatformConfig" (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT
);

INSERT INTO "PlatformConfig" (id, data)
VALUES ('default', '{
  "platform": {
    "name": "Rappel Beauty",
    "url": "app.rappelbeauty.com",
    "locale": "fr",
    "timezone": "Africa/Casablanca",
    "currency": "MAD",
    "maintenance": false
  },
  "billing": {
    "price": 400,
    "currency": "MAD",
    "vatPercent": 20,
    "period": "MONTHLY",
    "reminderDays": 7,
    "suspendAfterDays": 3
  },
  "notifications": {
    "emailNewTicket": true,
    "emailPaymentReceived": true,
    "emailPaymentFailed": true,
    "emailNewOrg": true,
    "emailNewUser": true,
    "internalUrgentTicket": true,
    "internalSystemError": true,
    "internalNewPayment": true
  },
  "email": {
    "provider": "resend",
    "fromEmail": "support@rappelbeauty.com",
    "fromName": "Rappel Beauty",
    "transactional": true,
    "support": true,
    "billing": true
  },
  "ai": {
    "marketing": true,
    "generation": true,
    "suggestions": true,
    "monthlyLimit": 1000,
    "model": "gpt"
  },
  "security": {
    "secureSession": true,
    "forceTempPasswordChange": true,
    "sessionExpiry": true,
    "bruteForceProtection": true,
    "twoFactorEnabled": false
  },
  "whatsapp": {
    "preferManualSend": true
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
