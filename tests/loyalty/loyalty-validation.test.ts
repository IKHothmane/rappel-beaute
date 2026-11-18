import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { cleanupTestPrefix, ensureSecondOrg, getSeedOrgId, insertTestAppointment, testId, testPool } from "../helpers/db";
import { issueLoyaltyCard, listVisitCards, loadCardProgress } from "@/lib/loyalty/cards";
import { updateAppointmentRow } from "@/lib/db/appointments";
import { createPayments } from "@/lib/db/finance";
import { POST as scan } from "@/app/api/loyalty/scan/route";
import { POST as legacyCredit } from "@/app/api/loyalty/credit-code/route";

const session = vi.hoisted(() => ({
  organizationId: "",
  id: "u_owner",
  firstName: "Amina",
  lastName: "Staff",
  role: "OWNER",
}));
const allowWrite = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/api-guard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/api-guard")>()),
  requireFeatureWrite: (...args: unknown[]) => allowWrite(...args),
  requireFeatureWriteLimited: (...args: unknown[]) => allowWrite(...args),
}));

function request(body: unknown, path = "/api/loyalty/scan") {
  return new NextRequest(new URL(path, "http://localhost"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PREFIX = "test_lval";
describe.skipIf(!process.env.DATABASE_URL)("Crédit de passage par scan confirmé", () => {
  let orgId: string;
  let otherOrg: string;
  let customerId: string;
  let card: { id: string; publicToken: string };

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    otherOrg = await ensureSecondOrg();
    session.organizationId = orgId;
    allowWrite.mockImplementation(async () => ({ ok: true, session: { ...session } }));
    customerId = testId(PREFIX + "_cust");
    const phone = "+2126" + Math.floor(10000000 + Math.random() * 90000000);
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Amina', 'Chraibi', $3, NOW())`,
      [customerId, orgId, phone],
    );
    card = await issueLoyaltyCard(orgId, customerId);
  });

  afterAll(async () => {
    const appointments = `SELECT id FROM "Appointment" WHERE "organizationId" = $1 AND "customerId" = $2`;
    const customer = [orgId, customerId];
    await testPool.query(`DELETE FROM "Payment" WHERE "appointmentId" IN (${appointments})`, customer);
    await testPool.query(`DELETE FROM "Invoice" WHERE "appointmentId" IN (${appointments})`, customer);
    await testPool.query(`DELETE FROM "Appointment" WHERE "organizationId" = $1 AND "customerId" = $2`, customer);
    await testPool.query(`DELETE FROM "LoyaltyVisitReward" WHERE "organizationId" = $1 AND "customerId" = $2`, customer);
    await testPool.query(`DELETE FROM "LoyaltyEvent" WHERE "organizationId" = $1 AND "customerId" = $2`, customer);
    await testPool.query(`DELETE FROM "LoyaltyCard" WHERE "organizationId" = $1 AND "customerId" = $2`, customer);
    await cleanupTestPrefix(PREFIX);
  });

  async function begin(token = card.publicToken) {
    const response = await scan(request({ action: "scan", token }));
    expect(response.status).toBe(200);
    return response.json() as Promise<{ validationId: string; customerId: string; customerName: string }>;
  }

  const confirm = (validationId: string) => scan(request({ action: "confirm", validationId }));

  it("exige une confirmation, crédite une seule fois et conserve la carte pour le passage suivant", async () => {
    const preview = await begin(`https://rappelbeauty.com/carte/${card.publicToken}/`);
    expect(preview).toMatchObject({ customerId, customerName: "Amina Chraibi" });
    expect((await loadCardProgress(card.id, orgId))?.visits).toBe(0);
    const getListedCard = async () =>
      (await listVisitCards(orgId, { pinIds: [customerId] })).cards.find((item) => item.id === card.id);
    expect((await getListedCard())?.lastVisitAt).toBeNull();

    const results = await Promise.all([confirm(preview.validationId), confirm(preview.validationId)]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    const success = results.find((response) => response.ok)!;
    expect(await success.json()).toMatchObject({ customerId, visits: 1 });
    const replay = await confirm(preview.validationId);
    expect(replay.status).toBe(409);
    expect(await replay.json()).toMatchObject({ code: "ALREADY_VALIDATED" });

    const { rows } = await testPool.query(
      `SELECT id, "validatedBy", "validatedAt", points FROM "LoyaltyEvent"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND "loyaltyCardId" = $3 AND type = 'VISIT'`,
      [orgId, customerId, card.id],
    );
    expect(rows).toEqual([{ id: expect.any(String), validatedBy: session.id, validatedAt: expect.any(Date), points: 1 }]);
    expect((await getListedCard())?.lastVisitAt).toBe(rows[0].validatedAt.toISOString());
    expect((await issueLoyaltyCard(orgId, customerId)).publicToken).toBe(card.publicToken);
    const next = await begin();
    expect(next.validationId).not.toBe(preview.validationId);
  });

  it("refuse les codes courts, un autre institut, un autre employé et une carte révoquée après le scan", async () => {
    const preview = await begin();
    const before = (await loadCardProgress(card.id, orgId))?.visits;
    expect((await scan(request({ action: "scan", token: card.publicToken.slice(-4) }))).ok).toBe(false);
    expect((await scan(request({ action: "scan", token: "RBLOY_INEXISTANT" }))).ok).toBe(false);
    session.organizationId = otherOrg;
    try {
      expect((await scan(request({ action: "scan", token: card.publicToken, organizationId: orgId }))).ok).toBe(false);
      expect((await confirm(preview.validationId)).ok).toBe(false);
    } finally {
      session.organizationId = orgId;
    }

    const actorId = session.id;
    session.id = "u_cashier";
    try {
      expect((await confirm(preview.validationId)).ok).toBe(false);
    } finally {
      session.id = actorId;
    }
    await testPool.query(`UPDATE "LoyaltyCard" SET status = 'REVOKED' WHERE id = $1`, [card.id]);
    try {
      expect((await scan(request({ action: "scan", token: card.publicToken }))).ok).toBe(false);
      expect((await confirm(preview.validationId)).ok).toBe(false);
    } finally {
      await testPool.query(`UPDATE "LoyaltyCard" SET status = 'ACTIVE' WHERE id = $1`, [card.id]);
    }
    expect((await loadCardProgress(card.id, orgId))?.visits).toBe(before);
  });

  it("refuse les crédits manuels et les opérations sans droit d'écriture", async () => {
    const before = (await loadCardProgress(card.id, orgId))?.visits;
    const preview = await begin();
    for (const body of [
      { token: card.publicToken, appointmentId: "old_appointment" },
      { action: "confirm", validationId: "invented", token: card.publicToken },
      { action: "adjust-visit", customerId, delta: 1, reason: "Correction manuelle" },
    ]) {
      expect((await scan(request(body))).ok).toBe(false);
    }
    for (const action of ["add", "issue", "redeem"]) {
      expect((await legacyCredit(request({ action, token: card.publicToken }, "/api/loyalty/credit-code"))).ok).toBe(false);
    }
    for (const status of [401, 403]) {
      const deny = { ok: false, response: NextResponse.json({}, { status }) };
      allowWrite.mockResolvedValueOnce(deny);
      expect((await scan(request({ action: "scan", token: card.publicToken }))).status).toBe(status);
      allowWrite.mockResolvedValueOnce(deny);
      expect((await confirm(preview.validationId)).status).toBe(status);
    }
    expect((await loadCardProgress(card.id, orgId))?.visits).toBe(before);
  });

  it.each(["before", "after"])("ne crédite pas automatiquement quand le paiement arrive %s la fin du rendez-vous", async (when) => {
    const before = (await loadCardProgress(card.id, orgId))?.visits;
    const appointmentId = await insertTestAppointment({ organizationId: orgId, customerId, status: "CONFIRMED", price: 150 });
    const pay = () => createPayments(orgId, {
      appointmentId,
      idempotencyKey: testId(`test:${PREFIX}:pay`),
      items: [{ method: "CARD", amount: 150 }],
    }, session.id);
    if (when === "before") await pay();
    expect((await updateAppointmentRow(appointmentId, orgId, { status: "COMPLETED" }))?.status).toBe("COMPLETED");
    if (when === "after") await pay();
    expect((await loadCardProgress(card.id, orgId))?.visits).toBe(before);
  });
});
