import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getSessionSecret, verifyJwt } from "@/lib/auth/crypto";
import { PLATFORM_SESSION_MAX_AGE_SEC } from "@/lib/auth/types";

/** Routes : cookie ré-émis au changement de mot de passe admin, durée et version à la connexion. */
const mocks = vi.hoisted(() => ({
  change: vi.fn(),
  limit: vi.fn(),
  authPlatform: vi.fn(),
  authUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/http/route-scope", () => ({
  platformRoute: <T,>(h: T) => h,
  publicRoute: <T,>(h: T) => h,
}));
vi.mock("@/lib/admin/api-helpers", async () => {
  const { NextResponse } = await import("next/server");
  return {
    adminJson: (data: unknown, status = 200) => NextResponse.json(data, { status }),
    adminError: (message: string, status: number) => NextResponse.json({ error: message }, { status }),
    requireAdmin: mocks.requireAdmin,
  };
});
vi.mock("@/lib/db/platform-users", async () => ({
  PLATFORM_MIN_PASSWORD_LENGTH: 8,
  PLATFORM_MAX_PASSWORD_LENGTH: 200,
  changePlatformUserPassword: mocks.change,
  authenticatePlatformUser: mocks.authPlatform,
}));
vi.mock("@/lib/db/users", () => ({ authenticateUser: mocks.authUser }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/auth/api-guard", () => ({ stripOrganizationId: <T,>(b: T) => b }));
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return { ...actual, consumeDimensions: mocks.limit };
});

import { POST as changePassword } from "@/app/api/admin/settings/password/route";
import { POST as login } from "@/app/api/auth/login/route";

const admin = {
  id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Admin", role: "SUPER_ADMIN",
  scope: "platform", accountType: "PLATFORM", sessionVersion: 2,
};
function post(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ allowed: true });
  mocks.requireAdmin.mockResolvedValue({ ok: true, session: admin });
  mocks.change.mockResolvedValue({ sessionVersion: 3 });
  mocks.authUser.mockResolvedValue(null);
});

describe("POST /api/admin/settings/password", () => {
  const valid = { currentPassword: "old-password", newPassword: "new-password-1" };

  it("ré-émet le cookie de l'auteur avec la nouvelle sessionVersion", async () => {
    const res = await changePassword(post("/api/admin/settings/password", valid));
    expect(res.status).toBe(200);
    expect(mocks.change).toHaveBeenCalledWith(expect.objectContaining({ id: "pu_1", currentPassword: "old-password" }));
    const cookie = res.cookies.get("rappel_session");
    expect(cookie).toBeDefined();
    const payload = verifyJwt<Record<string, unknown>>(cookie!.value, getSessionSecret());
    expect(payload?.sessionVersion).toBe(3);
    expect(payload?.scope).toBe("platform");
    expect(cookie!.maxAge).toBe(PLATFORM_SESSION_MAX_AGE_SEC);
  });

  it("refuse un corps invalide ou typé de travers sans toucher la base", async () => {
    for (const body of ["not json", "[]", { currentPassword: 1, newPassword: "new-password-1" }, { newPassword: "new-password-1" }]) {
      const res = await changePassword(post("/api/admin/settings/password", body));
      expect(res.status).toBe(400);
    }
    expect((await changePassword(post("/api/admin/settings/password", { ...valid, newPassword: "short" }))).status).toBe(400);
    expect((await changePassword(post("/api/admin/settings/password", { ...valid, newPassword: "x".repeat(201) }))).status).toBe(400);
    expect(mocks.change).not.toHaveBeenCalled();
  });

  it("ne pose aucun cookie quand le mot de passe actuel est faux", async () => {
    mocks.change.mockRejectedValue(new Error("BAD_PASSWORD"));
    const res = await changePassword(post("/api/admin/settings/password", valid));
    expect(res.status).toBe(400);
    expect(res.cookies.get("rappel_session")).toBeUndefined();
  });

  it("limite les tentatives (429) avant de lire le mot de passe", async () => {
    mocks.limit.mockResolvedValue({ allowed: false, retryAfterSec: 120 });
    const res = await changePassword(post("/api/admin/settings/password", valid));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(mocks.change).not.toHaveBeenCalled();
  });

  it("refuse sans session plateforme valide (jeton révoqué)", async () => {
    const { NextResponse } = await import("next/server");
    mocks.requireAdmin.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "x" }, { status: 401 }) });
    const res = await changePassword(post("/api/admin/settings/password", valid));
    expect(res.status).toBe(401);
    expect(mocks.change).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login (plateforme)", () => {
  beforeEach(() => {
    mocks.authPlatform.mockResolvedValue(admin);
  });

  it("émet un jeton de 7 jours portant la sessionVersion lue en base", async () => {
    const res = await login(post("/api/auth/login", { identifier: "a@t.test", password: "secret-pass-1" }));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("rappel_session")!;
    expect(cookie.maxAge).toBe(PLATFORM_SESSION_MAX_AGE_SEC);
    const payload = verifyJwt<{ sessionVersion: number; exp: number; iat: number }>(cookie.value, getSessionSecret());
    expect(payload?.sessionVersion).toBe(2);
    expect(payload!.exp - payload!.iat).toBe(PLATFORM_SESSION_MAX_AGE_SEC);
  });

  it("remember=false : cookie de navigateur, sans maxAge", async () => {
    const res = await login(post("/api/auth/login", { identifier: "a@t.test", password: "secret-pass-1", remember: false }));
    expect(res.cookies.get("rappel_session")!.maxAge).toBeUndefined();
  });
});
