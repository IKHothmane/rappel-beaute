import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  configured: vi.fn(),
  consume: vi.fn(),
  claim: vi.fn(),
  release: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: mocks.configured, sendTransactionalEmail: mocks.send }));
vi.mock("@/lib/rate-limit", () => ({
  consumeDimensions: mocks.consume,
  claimIdempotency: mocks.claim,
  releaseIdempotency: mocks.release,
}));
vi.mock("@/lib/logger", () => ({ logger: mocks.logger }));

import { POST } from "@/app/api/public/website-quote/route";
import { websiteQuoteEmail } from "@/lib/website-quote/email";
import { PROFESSIONAL_SIGNUP_NOTIFY_EMAIL } from "@/lib/email/signup-lead";

const valid = {
  name: "Sara Amrani",
  institute: "Institut Sara",
  email: "Sara@Example.com",
  phone: "06 12 34 56 78",
  project: "Site vitrine",
  message: "Je souhaite un site avec réservation.\nMerci.",
};

function request(body: unknown, init: { contentType?: string; raw?: string; ip?: string } = {}) {
  return new NextRequest("http://localhost:3000/api/public/website-quote", {
    method: "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      "cf-connecting-ip": init.ip ?? "203.0.113.7",
    },
    body: init.raw ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.claim.mockResolvedValue(true);
  mocks.release.mockResolvedValue(undefined);
  mocks.send.mockResolvedValue({ messageId: "msg_1" });
});

describe("POST /api/public/website-quote", () => {
  it("sends one escaped email to the site owner with the visitor as reply-to", async () => {
    const response = await POST(request({ ...valid, website: "" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    const mail = mocks.send.mock.calls[0][0];
    expect(mail.to).toBe(PROFESSIONAL_SIGNUP_NOTIFY_EMAIL);
    expect(mail.replyTo).toBe("sara@example.com");
    expect(mail.subject).toBe("Demande de site web — Institut Sara");
    expect(mail.text).toContain("0612345678");
    expect(mail.text).toContain("Je souhaite un site avec réservation.");
    const rateKeys = mocks.consume.mock.calls[0][0].map((c: { key: string }) => c.key);
    expect(rateKeys).toEqual(["website-quote:ip:203.0.113.7", "website-quote:global"]);
  });

  it("does not log the visitor's e-mail, phone or message", async () => {
    await POST(request(valid));
    const logged = JSON.stringify(Object.values(mocks.logger).flatMap((m) => m.mock.calls));
    expect(logged).not.toContain("example.com");
    expect(logged).not.toContain("0612345678");
    expect(logged).not.toContain("réservation");
  });

  it("silently accepts a filled honeypot without sending or consuming quota", async () => {
    for (const website of ["http://spam.example", 1, ["x"]]) {
      const response = await POST(request({ ...valid, website }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    }
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it.each([
    ["name too short", { name: "A" }],
    ["name with newline", { name: "Sara\r\nBcc: victim@example.com" }],
    ["institute with newline", { institute: "Institut\nBcc: victim@example.com" }],
    ["institute too long", { institute: "x".repeat(81) }],
    ["invalid email", { email: "pas-un-email" }],
    ["email with header injection", { email: "a@b.com\r\nBcc: v@x.com" }],
    ["email with display name", { email: "Sara <a@b.com>" }],
    ["email too long", { email: `${"a".repeat(120)}@example.com` }],
    ["invalid phone", { phone: "12" }],
    ["project with newline", { project: "Site\nvitrine" }],
    ["project missing", { project: "" }],
    ["project too long", { project: "x".repeat(81) }],
    ["message too long", { message: "x".repeat(1001) }],
    ["message with control character", { message: "bonjour\u0000" }],
    ["non-string name", { name: { $ne: "" } }],
    ["non-string phone", { phone: 612345678 }],
  ])("rejects %s with a French 400 and sends nothing", async (_label, patch) => {
    const response = await POST(request({ ...valid, ...patch }));
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(typeof payload.error).toBe("string");
    expect(payload.error.length).toBeGreaterThan(5);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", "   "],
  ])("requires the phone (%s)", async (_label, value) => {
    const { phone: _phone, ...withoutPhone } = valid;
    const body = value === undefined ? withoutPhone : { ...withoutPhone, phone: value };
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("téléphone");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("treats the message as optional", async () => {
    const response = await POST(request({ ...valid, message: "   " }));
    expect(response.status).toBe(200);
    expect(mocks.send.mock.calls[0][0].text).toContain("Non renseigné");
  });

  it("requires JSON content type and a JSON object body", async () => {
    expect((await POST(request(valid, { contentType: "text/plain" }))).status).toBe(415);
    expect((await POST(request(null, { raw: "{not json" }))).status).toBe(400);
    expect((await POST(request(null, { raw: "[]" }))).status).toBe(400);
    expect((await POST(request(null, { raw: JSON.stringify({ ...valid, message: "x".repeat(20_000) }) }))).status).toBe(413);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After when the rate limit is exceeded", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfterSec: 1234 });
    const response = await POST(request(valid));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1234");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("answers 503 without sending when e-mail is not configured", async () => {
    mocks.configured.mockReturnValue(false);
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(typeof (await response.json()).error).toBe("string");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it("answers 503 without leaking provider details and releases the duplicate guard when sending fails", async () => {
    mocks.send.mockRejectedValue(new Error("re_secret_key rejected for mail.example"));
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain("re_secret_key");
    expect(mocks.release).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.logger.error.mock.calls)).not.toContain("re_secret_key");
  });

  it("does not send a second email for an identical resubmission", async () => {
    mocks.claim.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await POST(request(valid))).status).toBe(200);
    expect((await POST(request(valid))).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.claim.mock.calls[0][0]).toBe(mocks.claim.mock.calls[1][0]);
    expect(mocks.claim.mock.calls[0][0]).not.toContain("example.com");
  });
});

describe("websiteQuoteEmail", () => {
  it("escapes every visitor value in the HTML body", () => {
    const hostile = `<script>alert("x")</script> & 'q'`;
    const { html, subject } = websiteQuoteEmail({
      name: hostile,
      institute: hostile,
      email: "a@b.com",
      phone: "0612345678",
      project: hostile,
      message: `${hostile}\n<img src=x onerror=alert(1)>`,
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;");
    expect(html).toContain("<br>&lt;img src=x onerror=alert(1)&gt;");
    expect(subject.startsWith("Demande de site web — ")).toBe(true);
  });
});
