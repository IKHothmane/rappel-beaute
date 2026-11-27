import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, Pool } from "pg";
import { randomInt, randomBytes } from "crypto";
import { runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "../db/role-pools";

const holder = vi.hoisted(() => ({ pool: null as unknown as Pool }));
vi.mock("@/lib/db/pool", () => ({
  get pool() {
    return holder.pool;
  },
}));

import { processWhatsAppWebhookEvent, type WhatsAppWebhookPayload } from "@/lib/whatsapp/webhook";

/**
 * Message entrant sous rôles séparés : le webhook tourne sous rappel_public. La journalisation doit réussir
 * pour l'institut de la cliente, sans accès aux autres instituts. Base locale jetable uniquement.
 */
const adminUrl = rolesAdminUrl();

describe.skipIf(!adminUrl)("webhook WhatsApp sous rôles séparés", () => {
  let admin: Client;
  let restoreEnv: () => void;
  const suffix = randomBytes(4).toString("hex");
  const customerId = `wa_roles_cust_${suffix}`;
  const messageId = `wamid.roles.${suffix}`;
  let organizationId = "";
  const local = `06${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
  const intl = `212${local.slice(1)}`;

  const payload: WhatsAppWebhookPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "+212522000000", phone_number_id: "PHONE_ID" },
              messages: [{ from: intl, id: messageId, timestamp: "1", type: "text", text: { body: "Bonjour" } }],
            },
          },
        ],
      },
    ],
  };

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    holder.pool = appPool(adminUrl);
    organizationId = (await admin.query(`SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1`)).rows[0].id;
    await admin.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Wa', 'Roles', $3, NOW())`,
      [customerId, organizationId, local],
    );
  });

  afterAll(async () => {
    await admin?.query(`DELETE FROM "AuditLog" WHERE "entityId" = $1`, [messageId]);
    await admin?.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
    await holder.pool?.end().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("journalise le message chez l'institut de la cliente, sous rappel_public", async () => {
    const events = await runInScope({ kind: "public", reason: "route publique" }, () =>
      processWhatsAppWebhookEvent(payload),
    );
    expect(events[0].recorded).toBe(true);
    const rows = (
      await admin.query(`SELECT "organizationId" FROM "AuditLog" WHERE "entityId" = $1 AND action = 'INCOMING_MESSAGE'`, [messageId])
    ).rows;
    expect(rows).toEqual([{ organizationId }]);
  });
});
