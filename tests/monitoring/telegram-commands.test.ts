import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/monitoring/telegram/route";
import { runMonitorCommand } from "@/lib/monitoring/commands";
import { allowTelegramCommand, resetTelegramState } from "@/lib/monitoring/telegram";

const query = vi.fn();

vi.mock("@/lib/db/pool", () => ({
  pool: { query: (...args: unknown[]) => query(...args) },
}));

vi.mock("@/lib/redis/client", () => ({
  getRedis: vi.fn(async () => null),
  pingRedis: vi.fn(async () => false),
}));

const SECRET = "webhook-secret-24chars";
const CHAT = "945076824";

function update(text: string, chatId = Number(CHAT)) {
  return {
    message: {
      text,
      chat: { id: chatId, type: "private" },
      from: { id: chatId, is_bot: false },
    },
  };
}

function call(body: unknown, secret: string | null = SECRET) {
  const headers = new Headers({ "content-type": "application/json" });
  if (secret) headers.set("x-telegram-bot-api-secret-token", secret);
  return POST(
    new NextRequest("http://localhost/api/monitoring/telegram", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function replies(): string[] {
  const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, { body?: string }][];
  return calls
    .filter(([url]) => String(url).includes("api.telegram.org"))
    .map(([, init]) => JSON.parse(init.body ?? "{}").text as string);
}

describe("commandes Telegram", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetTelegramState();
    query.mockReset();
    query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    process.env.MONITORING_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "token-test";
    process.env.TELEGRAM_CHAT_ID = CHAT;
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    process.env.REDIS_URL = "redis://unit-test";
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.MONITORING_ENABLED;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.REDIS_URL;
  });

  it("refuse un secret absent ou incorrect", async () => {
    expect((await call(update("/help"), null)).status).toBe(401);
    expect((await call(update("/help"), "mauvais-secret-inconnu")).status).toBe(401);
    expect(replies()).toHaveLength(0);
  });

  it("ignore un autre chat et un groupe", async () => {
    expect((await call(update("/status", 1))).status).toBe(200);
    const group = {
      message: {
        text: "/status",
        chat: { id: Number(CHAT), type: "group" },
        from: { id: Number(CHAT), is_bot: false },
      },
    };
    expect((await call(group)).status).toBe(200);
    expect(replies()).toHaveLength(0);
  });

  it("répond à /help sans recopier de donnée personnelle", async () => {
    const response = await call(update(`/help cliente.jane@exemple.ma`));
    expect(response.status).toBe(200);
    const text = replies().join("\n");
    expect(text).toContain("/status");
    expect(text).toContain("/report");
    expect(text).not.toContain("exemple.ma");
    expect(text).not.toContain("token-test");
  });

  it("décrit PostgreSQL et Redis sans détail technique", async () => {
    expect(await runMonitorCommand("/database")).toBe("PostgreSQL : ok");
    query.mockRejectedValueOnce(new Error("password=secret host=db.internal"));
    expect(await runMonitorCommand("/database")).toBe("PostgreSQL : indisponible");
    expect(await runMonitorCommand("/redis")).toBe("Redis : indisponible");
    expect(await runMonitorCommand("/database")).not.toContain("password");
  });

  it("limite le nombre de commandes", async () => {
    for (let i = 0; i < 15; i += 1) {
      expect(await allowTelegramCommand(CHAT)).toBe(true);
    }
    expect(await allowTelegramCommand(CHAT)).toBe(false);
  });
});
