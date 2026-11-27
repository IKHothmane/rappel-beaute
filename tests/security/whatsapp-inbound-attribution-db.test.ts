import { randomInt } from "crypto";
import { afterAll, describe, expect, it } from "vitest";
import { processWhatsAppWebhookEvent, type WhatsAppWebhookPayload } from "@/lib/whatsapp/webhook";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

/**
 * Base de test locale : la journalisation d'un message entrant passe par la vraie requête (verrou transactionnel,
 * contrôle d'existence, insertion). Une seule ligne par message relivré, aucune donnée de contenu, et aucune
 * écriture quand le numéro appartient à des clientes de plusieurs instituts.
 */
const run = process.env.DATABASE_URL ? describe : describe.skip;

const TEXT = "Texte privé à ne pas journaliser";

function payload(from: string, messageId: string): WhatsAppWebhookPayload {
  return {
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
              messages: [{ from, id: messageId, timestamp: "1", type: "text", text: { body: TEXT } }],
            },
          },
        ],
      },
    ],
  };
}

async function auditRows(messageId: string) {
  const { rows } = await testPool.query<{ organizationId: string; after: unknown }>(
    `SELECT "organizationId", "after" FROM "AuditLog"
     WHERE "entityType" = 'WhatsAppMessage' AND "entityId" = $1 AND action = 'INCOMING_MESSAGE'`,
    [messageId],
  );
  return rows;
}

run("Webhook WhatsApp : journal d'un message entrant (base réelle)", () => {
  // Numéro marocain unique (06 + 8 chiffres) : aucune cliente seed ne le porte.
  const local = `06${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
  const intl = `212${local.slice(1)}`;
  const customerA = testId("wa_cust_a");
  const customerB = testId("wa_cust_b");
  const messageIds = [testId("wamid.dup"), testId("wamid.ambig")];

  afterAll(async () => {
    await testPool.query(`DELETE FROM "AuditLog" WHERE "entityType" = 'WhatsAppMessage' AND "entityId" = ANY($1::text[])`, [
      messageIds,
    ]);
    await testPool.query(`DELETE FROM "Customer" WHERE id = ANY($1::text[])`, [[customerA, customerB]]);
  });

  it("cliente unique : une seule ligne malgré deux livraisons, sans texte ni numéro", async () => {
    const orgA = await getSeedOrgId();
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Wa', 'Unique', $3, NOW())`,
      [customerA, orgA, local],
    );

    const [first, second] = await Promise.all([
      processWhatsAppWebhookEvent(payload(intl, messageIds[0])),
      processWhatsAppWebhookEvent(payload(intl, messageIds[0])),
    ]);
    expect([first[0].recorded, second[0].recorded].sort()).toEqual([false, true]);

    const rows = await auditRows(messageIds[0]);
    expect(rows).toHaveLength(1);
    expect(rows[0].organizationId).toBe(orgA);
    expect(rows[0].after).toEqual({ type: "text", hasText: true, customerId: customerA });
    const stored = JSON.stringify(rows[0].after);
    expect(stored).not.toContain(TEXT);
    expect(stored).not.toContain(intl);
    expect(stored).not.toContain(local);
  });

  it("même numéro dans deux instituts : aucune écriture chez l'un ou l'autre", async () => {
    const orgB = await ensureSecondOrg();
    await testPool.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt")
       VALUES ($1, $2, 'Wa', 'Double', $3, NOW())`,
      [customerB, orgB, local],
    );

    const events = await processWhatsAppWebhookEvent(payload(intl, messageIds[1]));
    expect(events).toHaveLength(1);
    expect(events[0].customer).toBeUndefined();
    expect(await auditRows(messageIds[1])).toHaveLength(0);
  });
});
