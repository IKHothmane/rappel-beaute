import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getSeedOrgId, ensureSecondOrg, testId, testPool, insertTestAppointment, cleanupTestPrefix } from "../helpers/db";
import { issueLoyaltyCard } from "@/lib/loyalty/cards";
import { previewLoyaltyScan } from "@/lib/loyalty/validation";
import { updateLoyaltyProgram } from "@/lib/db/loyalty";

describe("Loyalty Scan — Prévisualisation du scan", () => {
  const PREFIX = "test_lscan";
  let orgA: string;
  let orgB: string;
  let customerA: string;
  let customerNoAppt: string;
  let cardA: { id: string; publicToken: string };

  beforeAll(async () => {
    orgA = await getSeedOrgId();
    orgB = await ensureSecondOrg();
    customerA = testId(PREFIX + "_custA");
    customerNoAppt = testId(PREFIX + "_custNoAppt");

    const p1 = "+2126" + Math.floor(10000000 + Math.random() * 90000000);
    const p2 = "+2126" + Math.floor(10000000 + Math.random() * 90000000);
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Sara', 'Alami', $4, NOW()),
              ($3, $2, 'Khadija', 'Bennani', $5, NOW())`,
      [customerA, orgA, customerNoAppt, p1, p2],
    );

    cardA = await issueLoyaltyCard(orgA, customerA);
    await issueLoyaltyCard(orgA, customerNoAppt);
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "LoyaltyVisitReward" WHERE "organizationId" = $1`, [orgA]);
    await testPool.query(`DELETE FROM "LoyaltyEvent" WHERE "organizationId" = $1`, [orgA]);
    await testPool.query(`DELETE FROM "LoyaltyCard" WHERE "organizationId" = $1`, [orgA]);
    await testPool.query(`DELETE FROM "Appointment" WHERE "customerId" LIKE $1`, [`${PREFIX}_%`]);
    await cleanupTestPrefix(PREFIX);
  });

  it("scan valide d'un RDV terminé", async () => {
    const apptId = await insertTestAppointment({
      organizationId: orgA,
      customerId: customerA,
      status: "COMPLETED",
      price: 250,
    });

    const preview = await previewLoyaltyScan(orgA, cardA.publicToken);
    expect(preview.token).toBe(cardA.publicToken);
    expect(preview.customerName).toContain("Sara");
    expect(preview.appointmentId).toBe(apptId);
    expect(preview.amount).toBe(250);
  });

  it("scan avec jeton inexistant (QR falsifié)", async () => {
    await expect(previewLoyaltyScan(orgA, "RBLOY_INEXISTANT")).rejects.toThrow("CARD_NOT_FOUND");
  });

  it("scan d'une carte de l'Institut A dans l'Institut B", async () => {
    await expect(previewLoyaltyScan(orgB, cardA.publicToken)).rejects.toThrow("CARD_NOT_FOUND");
  });

  it("scan sans aucun RDV terminé", async () => {
    await expect(previewLoyaltyScan(orgA, (await issueLoyaltyCard(orgA, customerNoAppt)).publicToken)).rejects.toThrow(
      "NO_COMPLETED_APPOINTMENT",
    );
  });

  it("scan lorsque le programme est désactivé", async () => {
    await updateLoyaltyProgram(orgA, { active: false }, { id: "test" });
    try {
      await expect(previewLoyaltyScan(orgA, cardA.publicToken)).rejects.toThrow("PROGRAM_DISABLED");
    } finally {
      await updateLoyaltyProgram(orgA, { active: true }, { id: "test" });
    }
  });
});
