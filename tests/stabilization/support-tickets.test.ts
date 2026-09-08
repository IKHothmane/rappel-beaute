import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  addOrgSupportMessage,
  addPlatformSupportMessage,
  createSupportTicket,
  getOrgSupportTicket,
  listOrgSupportTickets,
  listTicketMessages,
} from "@/lib/db/support-tickets";
import {
  ensureSecondOrg,
  getSeedOrgId,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Support tickets — isolation multi-tenant + flux", () => {
  let orgA: string;
  let orgB: string;
  let userA: string;
  let platformUserId: string;
  let ticketId: string;
  const createdTicketIds: string[] = [];

  beforeAll(async () => {
    orgA = await getSeedOrgId();
    orgB = await ensureSecondOrg();

    const { rows: users } = await testPool.query<{ id: string }>(
      `SELECT id FROM "User" WHERE "organizationId" = $1 AND role = 'OWNER' LIMIT 1`,
      [orgA],
    );
    userA = users[0]?.id ?? "";
    expect(userA).toBeTruthy();

    const { rows: platform } = await testPool.query<{ id: string }>(
      `SELECT id FROM "PlatformUser" LIMIT 1`,
    );
    platformUserId = platform[0]?.id ?? "";
    expect(platformUserId).toBeTruthy();
  });

  afterAll(async () => {
    for (const id of createdTicketIds) {
      await testPool.query(`DELETE FROM "SupportTicket" WHERE id = $1`, [id]);
    }
  });

  it("crée un ticket et isole par organizationId", async () => {
    const { ticket } = await createSupportTicket({
      organizationId: orgA,
      createdByUserId: userA,
      actorName: "Test Owner",
      subject: `Test isolation ${testId("subj")}`,
      category: "TECHNICAL",
      message: "Message initial institut A",
    });
    ticketId = ticket.id;
    createdTicketIds.push(ticketId);

    const fromA = await getOrgSupportTicket(orgA, ticketId);
    const fromB = await getOrgSupportTicket(orgB, ticketId);
    expect(fromA).not.toBeNull();
    expect(fromB).toBeNull();

    const listB = await listOrgSupportTickets(orgB);
    expect(listB.some((t) => t.id === ticketId)).toBe(false);
  });

  it("refuse le message cross-tenant et accepte le flux Admin → Institut", async () => {
    expect(ticketId).toBeTruthy();

    await expect(
      addOrgSupportMessage({
        organizationId: orgB,
        ticketId,
        userId: userA,
        actorName: "Intrus",
        message: "tentative",
      }),
    ).rejects.toThrow("NOT_FOUND");

    const platformMsg = await addPlatformSupportMessage({
      ticketId,
      platformUserId,
      platformUserName: "Super Admin",
      message: "Réponse plateforme de test",
    });
    expect(platformMsg.senderType).toBe("PLATFORM");

    const orgReply = await addOrgSupportMessage({
      organizationId: orgA,
      ticketId,
      userId: userA,
      actorName: "Test Owner",
      message: "Merci, reçu.",
    });
    expect(orgReply.senderType).toBe("INSTITUT");

    const messages = await listTicketMessages(ticketId);
    expect(messages.length).toBeGreaterThanOrEqual(3);
    expect(messages.some((m) => m.senderType === "PLATFORM")).toBe(true);
  });
});
