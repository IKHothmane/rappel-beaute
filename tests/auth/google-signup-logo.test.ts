import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * POST /api/auth/google/signup/ accepte multipart/form-data (champ logo) EN PLUS du JSON, avec la validation et le
 * stockage de /api/public/signup : 2 Mo, PNG/JPG/WEBP/SVG, catégorie "logos", échec toléré, logo traité APRÈS la
 * création et jamais sur un rejeu.
 */
const m = vi.hoisted(() => {
  class PublicSignupErrorStub extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
  return {
    PublicSignupErrorStub,
    consume: vi.fn(),
    getGooglePendingState: vi.fn(),
    completeGoogleSignup: vi.fn(),
    loadAppSessionForUser: vi.fn(),
    loginWithGoogleIdentity: vi.fn(),
    sendEmail: vi.fn(),
    put: vi.fn(),
    setLogo: vi.fn(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h }));
vi.mock("@/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/rate-limit")>()),
  consumeDimensions: (...args: unknown[]) => m.consume(...args),
}));
vi.mock("@/lib/logger", () => ({ logger: m.logger }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("@/lib/db/institute-create", () => ({ PublicSignupError: m.PublicSignupErrorStub }));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: () => true, sendTransactionalEmail: m.sendEmail }));
vi.mock("@/lib/db/auth-identities", () => ({
  getGooglePendingState: m.getGooglePendingState,
  completeGoogleSignup: m.completeGoogleSignup,
  loadAppSessionForUser: m.loadAppSessionForUser,
  loginWithGoogleIdentity: m.loginWithGoogleIdentity,
}));
vi.mock("@/lib/storage", () => ({ getStorageService: () => ({ put: m.put }) }));
vi.mock("@/lib/db/organization", () => ({ setOrganizationLogoUrl: m.setLogo }));

import { POST as googleSignup } from "@/app/api/auth/google/signup/route";
import { pendingCookieName } from "@/lib/auth/google-http";

const ORIGIN = "http://localhost:3000";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const FIELDS = { institut: "Institut Ada", ville: "Casablanca", phone: "0612345678", localisation: "", no_website: "1" };
const SESSION = {
  id: "u_1", email: "ada@example.test", firstName: "Ada", lastName: "Owner", role: "OWNER", organizationId: "org_1",
  orgName: "Institut", orgSlug: "institut", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
  mustChangePassword: false, sessionVersion: 0,
};
const created = { kind: "created", organizationId: "org_1", userId: "u_1", email: "ada@example.test", firstName: "Ada", institut: "Institut Ada", sub: "sub-1" };

function multipart(logo?: File, extra: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries({ ...FIELDS, ...extra })) form.set(k, v);
  if (logo) form.set("logo", logo);
  return new NextRequest(`${ORIGIN}/api/auth/google/signup/`, {
    method: "POST",
    headers: { origin: ORIGIN, "sec-fetch-site": "same-origin", cookie: `${pendingCookieName()}=pending-token`, ...headers },
    body: form,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  m.consume.mockResolvedValue({ allowed: true });
  vi.stubEnv("AUTH_GOOGLE_ENABLED", "true");
  vi.stubEnv("GOOGLE_AUTH_CLIENT_ID", "client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_AUTH_CLIENT_SECRET", "secret-de-test");
  vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", `${ORIGIN}/api/auth/google/callback/`);
  vi.stubEnv("COOKIE_SECURE", "false");
  m.getGooglePendingState.mockResolvedValue({ sub: "sub-1", consumed: false, organizationId: null, expired: false, replayable: false });
  m.completeGoogleSignup.mockResolvedValue(created);
  m.loadAppSessionForUser.mockResolvedValue(SESSION);
  m.put.mockResolvedValue({ url: "/uploads/logos/org_1/logo.png" });
});
afterEach(() => vi.unstubAllEnvs());

describe("inscription Google avec logo", () => {
  it("multipart avec un PNG valide : institut créé PUIS logo stocké (catégorie logos) et enregistré", async () => {
    const order: string[] = [];
    m.completeGoogleSignup.mockImplementation(async () => (order.push("create"), created));
    m.put.mockImplementation(async () => (order.push("logo"), { url: "/uploads/logos/org_1/logo.png" }));
    const res = await googleSignup(multipart(new File([PNG], "mon logo.png", { type: "image/png" })));
    expect(res.status).toBe(200);
    expect(order).toEqual(["create", "logo"]);
    expect(m.put).toHaveBeenCalledWith(expect.objectContaining({ category: "logos", organizationId: "org_1", filename: "logo.png", contentType: "image/png" }));
    expect(Buffer.from(m.put.mock.calls[0][0].data).equals(Buffer.from(PNG))).toBe(true);
    expect(m.setLogo).toHaveBeenCalledWith("org_1", "/uploads/logos/org_1/logo.png");
  });

  it("le JSON reste accepté tel quel, sans logo", async () => {
    const res = await googleSignup(
      new NextRequest(`${ORIGIN}/api/auth/google/signup/`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN, "sec-fetch-site": "same-origin", cookie: `${pendingCookieName()}=pending-token` },
        body: JSON.stringify(FIELDS),
      }),
    );
    expect(res.status).toBe(200);
    expect(m.put).not.toHaveBeenCalled();
    expect(m.completeGoogleSignup).toHaveBeenCalledTimes(1);
  });

  it("échec de stockage toléré : l'inscription aboutit et la session est émise", async () => {
    m.put.mockRejectedValue(new Error("disk full"));
    const res = await googleSignup(multipart(new File([PNG], "logo.png", { type: "image/png" })));
    expect(res.status).toBe(200);
    expect(res.cookies.get("rappel_session")?.value).toBeTruthy();
    expect(m.setLogo).not.toHaveBeenCalled();
    expect(m.logger.warn).toHaveBeenCalled();
  });

  it("rejeu : aucun stockage de logo, session réémise", async () => {
    m.completeGoogleSignup.mockResolvedValue({ kind: "replay", organizationId: "org_1", sub: "sub-1" });
    m.loginWithGoogleIdentity.mockResolvedValue(SESSION);
    const res = await googleSignup(multipart(new File([PNG], "logo.png", { type: "image/png" })));
    expect(res.status).toBe(200);
    expect(m.put).not.toHaveBeenCalled();
  });

  it.each([
    ["type non autorisé", () => new File([PNG], "x.gif", { type: "image/gif" })],
    ["octets magiques incohérents", () => new File([new Uint8Array([9, 9, 9, 9])], "x.png", { type: "image/png" })],
    ["SVG actif", () => new File(["<svg><script>alert(1)</script></svg>"], "x.svg", { type: "image/svg+xml" })],
    ["plus de 2 Mo", () => new File([new Uint8Array(2 * 1024 * 1024 + 1)], "x.png", { type: "image/png" })],
  ])("logo refusé (%s) : 400 avant toute création", async (_label, make) => {
    const res = await googleSignup(multipart(make()));
    expect(res.status).toBe(400);
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
    expect(m.put).not.toHaveBeenCalled();
  });

  it("Content-Length excessif : 413 sans lire le corps", async () => {
    const res = await googleSignup(multipart(undefined, {}, { "content-length": String(5 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
  });

  it("CSRF : multipart sans Origin ni Sec-Fetch-Site refusé (403) ; inter-sites refusé ; autre type 415", async () => {
    const noHeaders = new NextRequest(`${ORIGIN}/api/auth/google/signup/`, { method: "POST", body: (() => { const f = new FormData(); f.set("institut", "x"); return f; })() });
    expect((await googleSignup(noHeaders)).status).toBe(403);
    expect((await googleSignup(multipart(undefined, {}, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    const text = new NextRequest(`${ORIGIN}/api/auth/google/signup/`, {
      method: "POST",
      headers: { "content-type": "text/plain", origin: ORIGIN, "sec-fetch-site": "same-origin" },
      body: "x",
    });
    expect((await googleSignup(text)).status).toBe(415);
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
  });
});
