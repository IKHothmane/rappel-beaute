import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { sendAlert } from "@/lib/monitoring/alerts";

describe("monitoring/alerts", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.ALERT_WEBHOOK_URL;
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
});
