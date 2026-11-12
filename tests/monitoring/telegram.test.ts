import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis/client", () => ({
  getRedis: vi.fn(async () => null),
  pingRedis: vi.fn(async () => false),
}));

import { resetTelegramState, sendTelegramAlert } from "@/lib/monitoring/telegram";

describe("monitoring/telegram", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetTelegramState();
    delete process.env.MONITORING_ENABLED;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reste inactif tant que le monitoring n'est pas activé", async () => {
    global.fetch = vi.fn() as typeof fetch;
    const sent = await sendTelegramAlert({
      level: "warning",
      title: "Inactif",
      source: "vitest",
    });
    expect(sent).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("n'envoie pas deux fois la même alerte dans la fenêtre anti-spam", async () => {
    process.env.MONITORING_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "token-test";
    process.env.TELEGRAM_CHAT_ID = "1";
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;

    const alert = {
      level: "warning" as const,
      title: `Cooldown ${Date.now()}`,
      source: "vitest",
      status: 500,
    };

    await expect(sendTelegramAlert(alert)).resolves.toBe(true);
    await expect(sendTelegramAlert(alert)).resolves.toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retente l'envoi si Telegram est indisponible", async () => {
    process.env.MONITORING_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "token-test";
    process.env.TELEGRAM_CHAT_ID = "1";
    global.fetch = vi.fn().mockRejectedValue(new Error("down")) as typeof fetch;
    const alert = {
      level: "critical" as const,
      title: `Indisponible ${Date.now()}`,
      source: "vitest",
      status: 500,
    };
    await expect(sendTelegramAlert(alert)).resolves.toBe(false);
    await expect(sendTelegramAlert(alert)).resolves.toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});