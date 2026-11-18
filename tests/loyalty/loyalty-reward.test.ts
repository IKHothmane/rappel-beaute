import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getSeedOrgId, testId, testPool, cleanupTestPrefix } from "../helpers/db";
import { issueLoyaltyCard, loadCardProgress } from "@/lib/loyalty/cards";
import { updateLoyaltyProgram } from "@/lib/db/loyalty";
import { beginLoyaltyScan, confirmLoyaltyScan } from "@/lib/loyalty/validation";

describe("Loyalty Reward — Attribution automatique des récompenses", () => {
  const PREFIX = "test_lrew";
  let orgId: string;
  let customerId: string;
  let card: { id: string; publicToken: string };
  let programBefore: { visitsPerReward: number; rewardLabel: string; eligibleServiceIds: string[] } | null =
    null;

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    customerId = testId(PREFIX + "_cust");

    const phone = "+2126" + Math.floor(10000000 + Math.random() * 90000000);
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Houda', 'Fassi', $3, NOW())`,
      [customerId, orgId, phone],
    );

    card = await issueLoyaltyCard(orgId, customerId);
    const saved = await testPool.query<{
      visitsPerReward: number;
      rewardLabel: string;
      eligibleServiceIds: string[] | null;
    }>(
      `SELECT "visitsPerReward", "rewardLabel", "eligibleServiceIds"
       FROM "LoyaltyProgram" WHERE "organizationId" = $1`,
      [orgId],
    );
    programBefore = saved.rows[0]
      ? {
          visitsPerReward: saved.rows[0].visitsPerReward,
          rewardLabel: saved.rows[0].rewardLabel,
          eligibleServiceIds: saved.rows[0].eligibleServiceIds ?? [],
        }
      : null;
    await updateLoyaltyProgram(
      orgId,
      { visitsPerReward: 10, rewardLabel: "Récompense", active: true, eligibleServiceIds: [] },
      { id: "test_lrew" },
    );
  });

  afterAll(async () => {
    if (programBefore) {
      await updateLoyaltyProgram(orgId, programBefore, { id: "test_lrew" });
    }
    await testPool.query(`DELETE FROM "LoyaltyVisitReward" WHERE "customerId" = $1`, [customerId]);
    await testPool.query(`DELETE FROM "LoyaltyEvent" WHERE "customerId" = $1`, [customerId]);
    await testPool.query(`DELETE FROM "LoyaltyCard" WHERE "customerId" = $1`, [customerId]);
    await cleanupTestPrefix(PREFIX);
  });

  async function confirmVisit() {
    const actorId = "staff_test";
    const { validationId } = await beginLoyaltyScan({ organizationId: orgId, rawToken: card.publicToken, actorId });
    return confirmLoyaltyScan({ organizationId: orgId, validationId, actorId });
  }

  it("1er à 9e passage : pas de récompense créée", async () => {
    for (let i = 1; i <= 9; i++) {
      await confirmVisit();
    }

    const progress = await loadCardProgress(card.id, orgId);
    expect(progress?.visits).toBe(9);
    expect(progress?.cycle).toBe(9);
    expect(progress?.remaining).toBe(1);
    expect(progress?.rewardsAvailable).toBe(0);
  });

  it("10e passage : création automatique de la Récompense", async () => {
    const result = await confirmVisit();
    expect(result.visits).toBe(10);
    expect(result.cycle).toBe(0);
    expect(result.remaining).toBe(10);

    const progress = await loadCardProgress(card.id, orgId);
    expect(progress?.rewardsAvailable).toBe(1);
    expect(progress?.rewards[0].name).toBe("Récompense");
    expect(progress?.rewards[0].status).toBe("AVAILABLE");
  });

  it("11e passage : ne recrée pas de récompense de manière incorrecte", async () => {
    const result = await confirmVisit();
    expect(result.visits).toBe(11);
    expect(result.cycle).toBe(1);
    expect(result.remaining).toBe(9);

    const progress = await loadCardProgress(card.id, orgId);
    expect(progress?.rewardsAvailable).toBe(1); // toujours 1 seul reward
  });
});
