import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Assistant public — tables et contraintes", () => {
  let orgId: string;
  const widgetId = testId("wdg");
  const publicId = testId("pub");
  const sessionId = testId("wss");
  const conversationId = testId("acv");
  const actionId = testId("act");
  const idempotencyKey = testId("idem");

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    await testPool.query(
      `INSERT INTO "PublicWidget" (id, "organizationId", "publicId", name, "updatedAt")
       VALUES ($1, $2, $3, 'Widget test', NOW())`,
      [widgetId, orgId, publicId],
    );
    await testPool.query(
      `INSERT INTO "PublicWidgetOrigin" (id, "widgetId", origin)
       VALUES ($1, $2, $3)`,
      [testId("ori"), widgetId, "https://institut-exemple.ma"],
    );
    await testPool.query(
      `INSERT INTO "AssistantWidgetSession" (id, "widgetId", "organizationId", "tokenHash", "expiresAt")
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes')`,
      [sessionId, widgetId, orgId, testId("tok")],
    );
    await testPool.query(
      `INSERT INTO "AssistantConversation" (id, "organizationId", channel, "widgetSessionId", "updatedAt")
       VALUES ($1, $2, 'WIDGET', $3, NOW())`,
      [conversationId, orgId, sessionId],
    );
    await testPool.query(
      `INSERT INTO "AssistantAction"
        (id, "conversationId", "organizationId", type, status, payload, "idempotencyKey", "expiresAt")
       VALUES ($1, $2, $3, 'CREATE_APPOINTMENT', 'PENDING_CONFIRMATION', '{}'::jsonb, $4, NOW() + INTERVAL '10 minutes')`,
      [actionId, conversationId, orgId, idempotencyKey],
    );
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "PublicWidget" WHERE id = $1`, [widgetId]);
  });

  it("crée les tables de session, de conversation et d'action", async () => {
    const { rows } = await testPool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [[
        "PublicWidget",
        "PublicWidgetOrigin",
        "AssistantSettings",
        "AssistantWidgetSession",
        "AssistantCustomerSession",
        "AssistantVerificationChallenge",
        "AssistantConversation",
        "AssistantMessage",
        "AssistantAction",
      ]],
    );
    expect(rows).toHaveLength(9);
  });

  it("n'attache aucun customerId à la session widget", async () => {
    const { rows } = await testPool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'AssistantWidgetSession' AND column_name = 'customerId'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("exige un customerId sur la session cliente", async () => {
    const { rows } = await testPool.query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'AssistantCustomerSession' AND column_name = 'customerId'`,
    );
    expect(rows[0]?.is_nullable).toBe("NO");
  });

  it("refuse un second widget avec le même publicId", async () => {
    await expect(
      testPool.query(
        `INSERT INTO "PublicWidget" (id, "organizationId", "publicId", name, "updatedAt")
         VALUES ($1, $2, $3, 'Doublon', NOW())`,
        [testId("wdg"), orgId, publicId],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("refuse une seconde action avec la même clé d'idempotence", async () => {
    await expect(
      testPool.query(
        `INSERT INTO "AssistantAction"
          (id, "conversationId", "organizationId", type, payload, "idempotencyKey", "expiresAt")
         VALUES ($1, $2, $3, 'CREATE_APPOINTMENT', '{}'::jsonb, $4, NOW() + INTERVAL '10 minutes')`,
        [testId("act"), conversationId, orgId, idempotencyKey],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });
});
