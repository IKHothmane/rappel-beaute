import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AssistantSessionError,
  openCustomerSession,
  openWidgetSession,
} from "@/lib/db/assistant-session";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Assistant public — sessions", () => {
  let orgId: string;
  let otherOrgId: string;
  let widgetId: string;
  let publicId: string;
  let customerId: string;
  const phone = `+2126${Date.now().toString().slice(-8)}`;
  const origin = "https://institut-exemple.ma";

  beforeAll(async () => {
    resetRateLimitsForTests();
    orgId = await getSeedOrgId();
    otherOrgId = await ensureSecondOrg();
    widgetId = testId("wdg");
    publicId = testId("pub");
    customerId = testId("cus");
    await testPool.query(
      `INSERT INTO "PublicWidget" (id, "organizationId", "publicId", name, "updatedAt")
       VALUES ($1, $2, $3, 'Widget session', NOW())`,
      [widgetId, orgId, publicId],
    );
    await testPool.query(
      `INSERT INTO "PublicWidgetOrigin" (id, "widgetId", origin) VALUES ($1, $2, $3)`,
      [testId("ori"), widgetId, origin],
    );
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Amina', 'Test', $3, NOW())`,
      [customerId, orgId, phone],
    );
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "PublicWidget" WHERE id = $1`, [widgetId]);
    await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
  });

  it("résout l'institut depuis le widget et refuse un institut ou un domaine imposés", async () => {
    const opened = await openWidgetSession({
      publicId,
      origin,
      ip: "203.0.113.10",
    });
    expect(opened.organizationId).toBe(orgId);

    await expect(
      openWidgetSession({
        publicId,
        origin,
        ip: "203.0.113.11",
        organizationId: otherOrgId,
      }),
    ).rejects.toMatchObject({ code: "CLIENT_AUTHORITY" });

    await expect(
      openWidgetSession({ publicId, origin: "https://autre.example", ip: "203.0.113.14" }),
    ).rejects.toMatchObject({ code: "ORIGIN_DENIED" });
  });

  it("refuse une session cliente sans OTP consommé", async () => {
    const opened = await openWidgetSession({
      publicId,
      origin,
      ip: "203.0.113.12",
    });
    await expect(
      openCustomerSession({ widgetToken: opened.token, phone, customerId: "cus_injectee" }),
    ).rejects.toBeInstanceOf(AssistantSessionError);
  });

  it("associe la cliente du téléphone vérifié, pas l'identifiant demandé", async () => {
    const opened = await openWidgetSession({
      publicId,
      origin,
      ip: "203.0.113.13",
    });
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(opened.token).digest("hex");
    const found = await testPool.query<{ id: string }>(
      `SELECT id FROM "AssistantWidgetSession" WHERE "tokenHash" = $1`,
      [hash],
    );
    await testPool.query(
      `INSERT INTO "AssistantVerificationChallenge"
        (id, "widgetSessionId", "organizationId", phone, "codeHash", "expiresAt", "consumedAt")
       VALUES ($1, $2, $3, $4, 'hash', NOW() + INTERVAL '5 minutes', NOW())`,
      [testId("chl"), found.rows[0].id, orgId, phone],
    );

    await expect(
      openCustomerSession({ widgetToken: opened.token, phone, customerId: "cus_injectee" }),
    ).rejects.toMatchObject({ code: "CLIENT_AUTHORITY" });

    const verified = await openCustomerSession({ widgetToken: opened.token, phone });
    expect(verified.customerId).toBe(customerId);
    expect(verified.organizationId).toBe(orgId);
  });
});
