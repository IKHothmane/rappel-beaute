import { createECDH } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  REQUEST_PERMISSION_ON_LOAD,
  canClaimDelivery,
  cardTokenFromClient,
  decideDelivery,
  deliveryAfterAttempts,
  grantAllowsCard,
  nextDeliveryState,
  permissionDecision,
  phonesMatch,
  preferencesOnEnable,
  publicPushBody,
  pushGoneStatus,
  subscriptionExpiration,
  validPushEndpoint,
  type PushConsent,
} from "@/lib/push/eligibility";
import { vapidKeyPairMatches, vapidPublicConfig } from "@/lib/push/vapid";

const now = new Date("2026-10-10T12:00:00.000Z");

const consent = (patch: Partial<PushConsent> = {}): PushConsent => ({
  consentedAt: now,
  revokedAt: null,
  loyaltyReward: true,
  loyaltyProgress: false,
  reviewRequest: true,
  rewardExpiry: true,
  offers: false,
  ...patch,
});

const base = {
  eventOrganizationId: "org-a",
  subscriptionOrganizationId: "org-a",
  category: "LOYALTY_REWARD" as const,
  eligible: true,
  alreadySent: false,
  consent: consent(),
  subscriptionRevoked: false,
  subscriptionExpired: false,
  marketingOptIn: false,
};

describe("notifications Web Push clientes", () => {
  it("ne demande jamais la permission au chargement", () => {
    expect(REQUEST_PERMISSION_ON_LOAD).toBe(false);
    expect(permissionDecision("default", false)).toBe("blocked");
  });

  it("reconnaît une permission refusée sans créer d'abonnement", () => {
    expect(permissionDecision("denied", true)).toBe("denied");
    expect(permissionDecision("unsupported", true)).toBe("denied");
  });

  it("ignore l'institut envoyé par le navigateur", () => {
    const body = publicPushBody({
      cardToken: "rbloy_abcdefgh",
      organizationId: "autre-institut",
      customerId: "cliente-devinee",
      endpoint: "https://push.example/1",
    });
    expect(body.cardToken).toBe("RBLOY_ABCDEFGH");
    expect(body).not.toHaveProperty("organizationId");
    expect(body).not.toHaveProperty("customerId");
    expect(cardTokenFromClient({ cardToken: "RBJOIN_ABCDEF12" })).toBeNull();
  });

  it("refuse un abonnement expiré ou un endpoint non HTTPS", () => {
    expect(subscriptionExpiration(now.getTime() - 1000, now)).toBe("expired");
    expect(subscriptionExpiration(now.getTime() + 60_000, now)).toBeInstanceOf(Date);
    expect(validPushEndpoint("http://push.example/abonnement")).toBe(false);
    expect(validPushEndpoint("https://push.example/abonnement")).toBe(true);
  });

  it("isole les instituts", () => {
    expect(decideDelivery({ ...base, subscriptionOrganizationId: "org-b" })).toBe("wrong_organization");
  });

  it("bloque les doublons et les événements non éligibles", () => {
    expect(decideDelivery({ ...base, alreadySent: true })).toBe("duplicate");
    expect(decideDelivery({ ...base, eligible: false })).toBe("ineligible");
  });

  it("respecte le consentement et les catégories", () => {
    expect(decideDelivery({ ...base, consent: null })).toBe("no_consent");
    expect(decideDelivery({ ...base, consent: consent({ revokedAt: now }) })).toBe("no_consent");
    expect(decideDelivery({ ...base, category: "LOYALTY_PROGRESS" })).toBe("category_off");
    expect(
      decideDelivery({
        ...base,
        category: "LOYALTY_PROGRESS",
        consent: consent({ loyaltyProgress: true }),
      }),
    ).toBe("send");
  });

  it("n'envoie une offre que si la préférence et le consentement marketing sont actifs", () => {
    expect(
      decideDelivery({
        ...base,
        category: "OFFER",
        consent: consent({ offers: true }),
        marketingOptIn: false,
      }),
    ).toBe("offer_without_marketing");
    expect(
      decideDelivery({
        ...base,
        category: "OFFER",
        consent: consent({ offers: true }),
        marketingOptIn: true,
      }),
    ).toBe("send");
  });

  it("écarte un abonnement révoqué ou expiré", () => {
    expect(decideDelivery({ ...base, subscriptionRevoked: true })).toBe("subscription_revoked");
    expect(decideDelivery({ ...base, subscriptionExpired: true })).toBe("subscription_expired");
  });

  it("désactive l'abonnement quand le fournisseur le déclare invalide", () => {
    expect(pushGoneStatus(404)).toBe(true);
    expect(pushGoneStatus(410)).toBe(true);
    expect(pushGoneStatus(500)).toBe(false);
    expect(deliveryAfterAttempts(["gone"], null)).toBe("FAILED");
    expect(deliveryAfterAttempts(["retry"], null)).toBe("PENDING");
    expect(deliveryAfterAttempts(["retry"], "retry")).toBe("FAILED");
    expect(deliveryAfterAttempts(["sent", "gone"], null)).toBe("SENT");
  });

  it("laisse la progression et les offres désactivées par défaut", () => {
    expect(preferencesOnEnable(undefined)).toEqual({
      loyaltyReward: true,
      loyaltyProgress: false,
      reviewRequest: true,
      rewardExpiry: true,
      offers: false,
    });
  });

  it("ne renvoie jamais la clé privée VAPID", () => {
    const config = vapidPublicConfig({
      VAPID_PUBLIC_KEY: "cle-publique",
      VAPID_PRIVATE_KEY: "cle-privee-secrete",
      VAPID_SUBJECT: "mailto:contact@rappelbeauty.com",
    });
    expect(config).toEqual({ configured: false, publicKey: null });
    expect(JSON.stringify(config)).not.toContain("cle-privee-secrete");
  });

  it("accepte une paire VAPID cohérente et refuse une paire mélangée", () => {
    const first = createECDH("prime256v1");
    first.generateKeys();
    const second = createECDH("prime256v1");
    second.generateKeys();
    const publicKey = first.getPublicKey().toString("base64url");
    const privateKey = first.getPrivateKey().toString("base64url");
    expect(vapidKeyPairMatches(publicKey, privateKey)).toBe(true);
    expect(vapidKeyPairMatches(publicKey, second.getPrivateKey().toString("base64url"))).toBe(false);
    expect(
      vapidPublicConfig({
        VAPID_PUBLIC_KEY: publicKey,
        VAPID_PRIVATE_KEY: privateKey,
        VAPID_SUBJECT: "mailto:contact@rappelbeauty.com",
      }).publicKey,
    ).toBe(publicKey);
  });

  it("refuse de modifier les préférences avec le seul jeton public de la carte", () => {
    const card = { organizationId: "org-a", customerId: "cliente-a" };
    expect(grantAllowsCard(null, card, now)).toBe("missing");
    expect(
      grantAllowsCard(
        {
          organizationId: "org-b",
          customerId: "cliente-b",
          expiresAt: new Date(now.getTime() + 60_000),
          revokedAt: null,
        },
        card,
        now,
      ),
    ).toBe("mismatch");
    expect(phonesMatch("+212619440375", "0619440375")).toBe(true);
    expect(phonesMatch("+212619440375", "0611111111")).toBe(false);
  });

  it("ne reprend pas une livraison déjà verrouillée par un autre envoi", () => {
    const row = {
      status: "PENDING",
      scheduledFor: now,
      nextAttemptAt: now,
      lockedUntil: new Date(now.getTime() + 60_000),
    };
    expect(canClaimDelivery(row, now)).toBe(false);
    expect(canClaimDelivery({ ...row, lockedUntil: new Date(now.getTime() - 1000) }, now)).toBe(true);
  });

  it("espace les reprises et abandonne après cinq essais", () => {
    const retry = nextDeliveryState({ results: ["retry"], attemptCount: 1, consent: "send" });
    expect(retry).toEqual({ status: "PENDING", delayMs: 60_000 });
    expect(nextDeliveryState({ results: ["retry"], attemptCount: 2, consent: "send" }).delayMs).toBe(5 * 60_000);
    expect(nextDeliveryState({ results: ["retry"], attemptCount: 5, consent: "send" }).status).toBe("FAILED");
    expect(
      nextDeliveryState({ results: ["sent"], attemptCount: 1, consent: "offer_without_marketing" }).status,
    ).toBe("SKIPPED");
  });

  it("déclenche les envois sans ouvrir l'agenda", () => {
    const source = readFileSync("src/lib/push/scheduler.ts", "utf8");
    expect(source).toContain("dispatchAllDueCustomerPushes");
    expect(source).not.toContain("listAppointments");
    const manifest = readFileSync("public/manifest.webmanifest", "utf8");
    expect(manifest).toContain('"display": "standalone"');
  });
});
