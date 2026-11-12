import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/redis/client", () => ({
  getRedis: vi.fn(async () => null),
  pingRedis: vi.fn(async () => false),
}));

import { sendAlert } from "@/lib/monitoring/alerts";
import { resetTelegramState } from "@/lib/monitoring/telegram";

describe("monitoring/alerts", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetTelegramState();
    delete process.env.ALERT_WEBHOOK_URL;
    delete process.env.MONITORING_ENABLED;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("no-op sans ALERT_WEBHOOK_URL", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sent = await sendAlert({
      severity: "critical",
      title: "Test",
      source: "vitest",
    });
    expect(sent).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it("format Discord quand webhook discord.com", async () => {
    process.env.ALERT_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    await sendAlert({
      severity: "critical",
      title: "DB down",
      source: "vitest",
    });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.content).toContain("DB down");
  });

  it("envoie Telegram sans le champ details", async () => {
    process.env.MONITORING_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "token-test";
    process.env.TELEGRAM_CHAT_ID = "1";
    process.env.ALERT_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    await sendAlert({
      severity: "critical",
      title: "DB down",
      source: "vitest",
      details: "mot-de-passe-client@exemple.ma",
    });

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [string, { body: string }][];
    const telegram = calls.find(([url]) => String(url).includes("api.telegram.org"));
    expect(telegram).toBeTruthy();
    const body = JSON.parse(telegram![1].body);
    expect(body.text).toContain("DB down");
    expect(body.text).not.toContain("mot-de-passe");
    expect(body.text).not.toContain("exemple.ma");
  });
});
