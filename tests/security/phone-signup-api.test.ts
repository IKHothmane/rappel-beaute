import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ create: vi.fn(), send: vi.fn(), configured: vi.fn(), logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/db/public-signup", () => ({ createPublicSignup: mocks.create, PublicSignupError: class extends Error { code = "PHONE_TAKEN"; } }));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: mocks.configured, sendTransactionalEmail: mocks.send }));
vi.mock("@/lib/rate-limit", () => ({ consumeDimensions: async () => ({ allowed: true }), emailKey: (value: string) => value, RATE_POLICIES: { signup: { ip: {}, account: {} } } }));
vi.mock("@/lib/logger", () => ({ logger: mocks.logger }));
vi.mock("@/lib/db/organization", () => ({ setOrganizationLogoUrl: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorageService: vi.fn() }));
import { POST } from "@/app/api/public/signup/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured.mockReturnValue(false);
  mocks.create.mockResolvedValue({ organizationId: "org", email: null, phone: "0612345678", firstName: "Sara", institut: "Institut Sara", temporaryPassword: "123456" });
});
function request() {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: "Sara Amrani", institut: "Institut Sara", phone: "0612345678", ville: "Casablanca", no_website: "1" })) form.set(key, value);
  return new NextRequest("http://localhost:3000/api/public/signup/", { method: "POST", body: form });
}
describe("Phone signup API", () => {
  it("works without an email address or configured email provider and returns uncached credentials", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, credentials: { identifier: "0612345678", temporaryPassword: "123456" } });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ phone: "0612345678", email: "" }));
    expect(mocks.send).not.toHaveBeenCalled();
    expect(JSON.stringify(Object.values(mocks.logger).flatMap((method) => method.mock.calls))).not.toContain("123456");
  });
});
