import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getSeedOrgId, testId, testPool, cleanupTestPrefix } from "../helpers/db";
import { issueLoyaltyCard, getPublicCardByToken } from "@/lib/loyalty/cards";

describe("Loyalty Card — Création & Lecture publique", () => {
  const PREFIX = "test_lcard";
  let orgId: string;
  let customerId: string;

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    customerId = testId(PREFIX + "_cust");
    const phone = "+2126" + Math.floor(10000000 + Math.random() * 90000000);
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Fatima', 'Zohra', $3, NOW())`,
      [customerId, orgId, phone],
    );
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "LoyaltyVisitReward" WHERE "customerId" = $1`, [customerId]);
    await testPool.query(`DELETE FROM "LoyaltyEvent" WHERE "customerId" = $1`, [customerId]);
    await testPool.query(`DELETE FROM "LoyaltyCard" WHERE "customerId" = $1`, [customerId]);
    await cleanupTestPrefix(PREFIX);
  });

  it("émission de carte fidélité avec jeton RBLOY_", async () => {
    const card = await issueLoyaltyCard(orgId, customerId);
    expect(card.id).toBeTruthy();
    expect(card.publicToken).toMatch(/^RBLOY_[A-Z2-9]+$/);
    expect(card.customerId).toBe(customerId);
    expect(card.firstName).toBe("Fatima");
  });

  it("réémission de carte (idempotence)", async () => {
    const first = await issueLoyaltyCard(orgId, customerId);
    const second = await issueLoyaltyCard(orgId, customerId);
    expect(second.id).toBe(first.id);
    expect(second.publicToken).toBe(first.publicToken);
  });

  it("lecture publique par jeton RBLOY_", async () => {
    const card = await issueLoyaltyCard(orgId, customerId);
    const loaded = await getPublicCardByToken(card.publicToken);
    expect(loaded).not.toBeNull();
    expect(loaded?.firstName).toBe("Fatima");
    expect(loaded?.visits).toBe(0);
    expect(loaded?.visitsPerReward).toBeGreaterThan(0);
  });

  it("jeton invalide ou inexistant renvoie null", async () => {
    const loaded = await getPublicCardByToken("RBLOY_INVALID_TOKEN");
    expect(loaded).toBeNull();
  });
});
