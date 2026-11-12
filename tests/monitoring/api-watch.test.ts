import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TenantContextError } from "@/lib/db/tenant-context";
import { publicRoute, tenantRoute } from "@/lib/http/route-scope";
import { readMonitorSnapshot, resetMonitorMemory } from "@/lib/monitoring/events";
import { resetTelegramState } from "@/lib/monitoring/telegram";

vi.mock("@/lib/redis/client", () => ({
  getRedis: vi.fn(async () => null),
  pingRedis: vi.fn(async () => false),
}));

const EMAIL = "cliente.jane@exemple.ma";
const UUID = "11111111-1111-4111-8111-111111111111";

function request() {
  return {
    method: "GET",
    nextUrl: { pathname: `/api/customers/${UUID}` },
    url: `http://localhost/api/customers/${UUID}?email=${EMAIL}`,
  };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

function telegramTexts(): string[] {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, { body?: string }][];
  return calls
    .filter(([url]) => String(url).includes("api.telegram.org"))
    .map(([, init]) => JSON.parse(init.body ?? "{}").text as string);
}

describe("surveillance des routes API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetMonitorMemory();
    resetTelegramState();
    process.env.MONITORING_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "token-test";
    process.env.TELEGRAM_CHAT_ID = "1";
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.MONITORING_ENABLED;
  });

  it("enregistre un succès sans alerter", async () => {
    const route = publicRoute(async () => Response.json({ ok: true }));
    const response = await route(request());
    await settle();
    expect(response.status).toBe(200);
    expect(telegramTexts()).toHaveLength(0);
    const snap = await readMonitorSnapshot();
    expect(snap.requests).toBe(1);
    expect(snap.errors).toBe(0);
    expect(JSON.stringify(snap)).not.toContain(EMAIL);
    expect(JSON.stringify(snap)).not.toContain(UUID);
  });

  it("n'alerte pas une erreur métier 400", async () => {
    const route = publicRoute(async () => Response.json({ error: "Nom invalide" }, { status: 400 }));
    const response = await route(request());
    await settle();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Nom invalide" });
    expect(telegramTexts()).toHaveLength(0);
    expect((await readMonitorSnapshot()).errors).toBe(0);
  });

  it("alerte un HTTP 500 sans reprendre le corps", async () => {
    const route = publicRoute(async () => Response.json({ error: EMAIL }, { status: 500 }));
    const response = await route(request());
    await settle();
    expect(response.status).toBe(500);
    const texts = telegramTexts();
    expect(texts.some((text) => text.includes("HTTP 500"))).toBe(true);
    expect(texts.join("\n")).not.toContain(EMAIL);
    expect(texts.join("\n")).not.toContain(UUID);
  });

  it("alerte un HTTP 503", async () => {
    const route = publicRoute(async () => new Response(null, { status: 503 }));
    await route(request());
    await settle();
    expect(telegramTexts().some((text) => text.includes("HTTP 503"))).toBe(true);
  });

  it("alerte une exception et la laisse remonter", async () => {
    const route = publicRoute(async () => {
      throw new Error(`panne ${EMAIL}`);
    });
    await expect(route(request())).rejects.toThrow(EMAIL);
    await settle();
    const texts = telegramTexts();
    expect(texts.some((text) => text.includes("Exception API"))).toBe(true);
    expect(texts.join("\n")).not.toContain(EMAIL);
  });

  it("alerte une requête lente", async () => {
    const route = publicRoute(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5_010));
      return Response.json({ ok: true });
    });
    const response = await route(request());
    await settle();
    expect(response.status).toBe(200);
    expect(telegramTexts().some((text) => text.includes("API lente"))).toBe(true);
    expect((await readMonitorSnapshot()).slow).toBe(1);
  });

  it("ne transforme pas un refus d'accès en alerte", async () => {
    const route = tenantRoute(async () => {
      throw new TenantContextError(`acces ${EMAIL}`);
    });
    const response = await route(request());
    await settle();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "TENANT_CONTEXT_MISSING" });
    expect(telegramTexts()).toHaveLength(0);
  });
});
