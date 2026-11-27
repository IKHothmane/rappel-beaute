import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

/**
 * Webhook WhatsApp : signature obligatoire en production/staging, comparaisons à temps constant,
 * attribution d'un message entrant à un institut seulement si une seule cliente correspond, journal sans
 * texte ni numéro, et une seule écriture par message même si Meta le relivre. Pool simulé, aucune base.
 */
const db = vi.hoisted(() => ({
  customers: [] as Array<{ id: string; organizationId: string; firstName: string; lastName: string; phone: string }>,
  audited: new Set<string>(),
  calls: [] as Array<{ sql: string; params: unknown[] }>,
}));

vi.mock("@/lib/db/pool", () => {
  const run = async (sql: string, params: unknown[] = []) => {
    db.calls.push({ sql, params });
    if (sql.includes("app_public_customer_by_phone")) return { rows: db.customers, rowCount: db.customers.length };
    if (sql.includes(`SELECT 1 FROM "AuditLog"`)) {
      const hit = db.audited.has(`${params[0]}:${params[1]}`);
      return { rows: hit ? [{}] : [], rowCount: hit ? 1 : 0 };
    }
    if (sql.includes(`INSERT INTO "AuditLog"`)) {
      db.audited.add(`${params[1]}:${params[5]}`);
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
  return {
    pool: {
      query: vi.fn(run),
      connect: vi.fn(async () => ({ query: vi.fn(run), release: vi.fn() })),
    },
  };
});

import {
  processWhatsAppWebhookEvent,
  verifyMetaSignature,
  verifyMetaWebhookChallenge,
  whatsappSignatureRequired,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp/webhook";
import { POST } from "@/app/api/whatsapp/webhook/route";

const SECRET = "app_secret_test_123";
const TEXT = "Bonjour, message privé de la cliente";

function payload(messageId = "wamid.TEST1"): WhatsAppWebhookPayload {
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
              messages: [{ from: "212661223344", id: messageId, timestamp: "1", type: "text", text: { body: TEXT } }],
            },
          },
        ],
      },
    ],
  };
}

const customer = (id: string, organizationId: string) => ({
  id,
  organizationId,
  firstName: "Sara",
  lastName: "B",
  phone: "0661223344",
});

const auditInserts = () => db.calls.filter((c) => c.sql.includes(`INSERT INTO "AuditLog"`));

function post(body: string, signature?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature) headers["x-hub-signature-256"] = signature;
  return new NextRequest("http://localhost/api/whatsapp/webhook", { method: "POST", body, headers });
}

const sign = (body: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

beforeEach(() => {
  db.customers = [];
  db.audited = new Set();
  db.calls = [];
  // Aucune alerte ni écriture Redis depuis l'enveloppe de route.
  vi.stubEnv("MONITORING_ENABLED", "false");
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST : signature obligatoire hors développement", () => {
  it.each([
    ["NODE_ENV=production", { NODE_ENV: "production" }],
    ["APP_ENV=staging", { APP_ENV: "staging" }],
    ["APP_ENV=production", { APP_ENV: "production" }],
  ])("%s sans WHATSAPP_APP_SECRET : 503 sans détail, rien n'est traité", async (_label, env) => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    db.customers = [customer("c1", "org_a")];

    const res = await POST(post(JSON.stringify(payload())));
    expect(res.status).toBe(503);
    expect(await res.text()).toBe("Service Unavailable");
    expect(db.calls).toHaveLength(0);
  });

  it("développement/test sans secret : comportement inchangé (événement traité, 200)", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    vi.stubEnv("APP_ENV", "");
    expect(whatsappSignatureRequired()).toBe(false);
    const res = await POST(post(JSON.stringify(payload())));
    expect(res.status).toBe(200);
  });

  it("secret défini : signature absente ou fausse refusée (401), valide acceptée", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", SECRET);
    vi.stubEnv("NODE_ENV", "production");
    const body = JSON.stringify(payload());

    expect((await POST(post(body))).status).toBe(401);
    expect((await POST(post(body, sign(body, "autre-secret")))).status).toBe(401);
    expect(db.calls).toHaveLength(0);

    expect((await POST(post(body, sign(body)))).status).toBe(200);
  });
});

describe("comparaisons à temps constant", () => {
  it("signature : format strict (64 caractères hexadécimaux), sans exception sur une entrée hostile", () => {
    const body = "{}";
    const good = sign(body);
    expect(verifyMetaSignature(body, good, SECRET)).toBe(true);
    expect(verifyMetaSignature(body, good.toUpperCase().replace("SHA256=", "sha256="), SECRET)).toBe(true);
    expect(verifyMetaSignature(body, `sha256=${"z".repeat(64)}`, SECRET)).toBe(false);
    expect(verifyMetaSignature(body, `${good}00`, SECRET)).toBe(false);
    expect(verifyMetaSignature(body, good.slice(0, -2), SECRET)).toBe(false);
    expect(verifyMetaSignature(body, good, "")).toBe(false);
  });

  it("jeton de vérification Meta : longueurs différentes refusées sans exception", () => {
    const params = (token: string) =>
      new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "42" });
    expect(verifyMetaWebhookChallenge(params("x"), "jeton-attendu")).toMatchObject({ ok: false, status: 403 });
    expect(verifyMetaWebhookChallenge(params("jeton-attendu-plus-long"), "jeton-attendu")).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(verifyMetaWebhookChallenge(params("jeton-attendu"), "jeton-attendu")).toEqual({ ok: true, challenge: "42" });
  });
});

describe("message entrant : attribution à un institut", () => {
  it("une seule cliente : journal chez son institut, sans texte ni numéro", async () => {
    db.customers = [customer("c1", "org_a")];
    const events = await processWhatsAppWebhookEvent(payload());

    expect(events[0]).toMatchObject({ customer: { id: "c1", organizationId: "org_a" }, recorded: true });
    const inserts = auditInserts();
    expect(inserts).toHaveLength(1);
    expect(inserts[0].params[1]).toBe("org_a");
    const after = JSON.parse(String(inserts[0].params[8]));
    expect(after).toEqual({ type: "text", hasText: true, customerId: "c1" });
    expect(JSON.stringify(inserts[0].params)).not.toContain(TEXT);
    expect(JSON.stringify(inserts[0].params)).not.toContain("212661223344");
  });

  it("plusieurs clientes (deux instituts) : aucune attribution, aucune écriture, journal sans donnée personnelle", async () => {
    const info = vi.mocked(console.log);
    db.customers = [customer("c1", "org_a"), customer("c2", "org_b")];
    const events = await processWhatsAppWebhookEvent(payload());

    expect(events).toHaveLength(1);
    expect(events[0].customer).toBeUndefined();
    expect(auditInserts()).toHaveLength(0);
    const logged = info.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("not attributed");
    expect(logged).not.toContain("212661223344");
    expect(logged).not.toContain(TEXT);
    expect(logged).not.toContain("org_a");
  });

  it("aucune cliente : aucune écriture", async () => {
    await processWhatsAppWebhookEvent(payload());
    expect(auditInserts()).toHaveLength(0);
  });

  it("message relivré par Meta : une seule écriture, sous verrou transactionnel", async () => {
    db.customers = [customer("c1", "org_a")];
    const first = await processWhatsAppWebhookEvent(payload("wamid.DUP"));
    const second = await processWhatsAppWebhookEvent(payload("wamid.DUP"));

    expect(first[0].recorded).toBe(true);
    expect(second[0].recorded).toBe(false);
    expect(auditInserts()).toHaveLength(1);
    expect(db.calls.filter((c) => c.sql.includes("pg_advisory_xact_lock"))).toHaveLength(2);
  });

  it("corps hostile (types inattendus) : ignoré sans exception", async () => {
    const hostile = {
      object: "whatsapp_business_account",
      entry: [{ changes: "x" }, { changes: [{ field: "messages", value: { messages: [{ id: 42 }, null] } }] }],
    } as unknown as WhatsAppWebhookPayload;
    await expect(processWhatsAppWebhookEvent(hostile)).resolves.toEqual([]);
    await expect(processWhatsAppWebhookEvent(null as unknown as WhatsAppWebhookPayload)).resolves.toEqual([]);
  });
});
