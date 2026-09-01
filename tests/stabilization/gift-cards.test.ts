import { describe, expect, it, afterAll } from "vitest";
import { issueGiftCard, redeemGiftCard } from "@/lib/db/gift-cards";
import { getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Cartes cadeaux — concurrence sur solde", () => {
  let orgId: string;
  let cardId: string;
  const paymentIds: string[] = [];

  afterAll(async () => {
    for (const pid of paymentIds) {
      await testPool.query(`DELETE FROM "GiftCardTransaction" WHERE "paymentId" = $1`, [pid]);
    }
    if (cardId) {
      await testPool.query(`DELETE FROM "GiftCardTransaction" WHERE "giftCardId" = $1`, [cardId]);
      await testPool.query(`DELETE FROM "GiftCard" WHERE id = $1`, [cardId]);
    }
  });

  it("200 MAD — deux remboursements simultanés de 200 → un seul succès complet", async () => {
    orgId = await getSeedOrgId();
    const card = await issueGiftCard(
      orgId,
      { amount: 200, notes: "Test concurrence" },
      { id: "u_owner", name: "Test" },
    );
    cardId = card.id;

    const pay1 = testId("test_gc_pay");
    const pay2 = testId("test_gc_pay");
    paymentIds.push(pay1, pay2);

    const redeem = (paymentId: string) =>
      redeemGiftCard({
        organizationId: orgId,
        giftCardId: cardId,
        amount: 200,
        paymentId,
        userId: "u_owner",
      });

    const results = await Promise.allSettled([redeem(pay1), redeem(pay2)]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length + rejected.length).toBe(2);
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const totalRedeemed = fulfilled.reduce((sum, r) => {
      if (r.status === "fulfilled") return sum + r.value.redeemed;
      return sum;
    }, 0);
    expect(totalRedeemed).toBeLessThanOrEqual(200);

    const { rows } = await testPool.query<{ balance: string }>(
      `SELECT balance::text FROM "GiftCard" WHERE id = $1`,
      [cardId],
    );
    expect(parseFloat(rows[0].balance)).toBeGreaterThanOrEqual(0);
    expect(totalRedeemed).toBe(200);
  });
});
