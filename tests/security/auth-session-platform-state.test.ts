import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getSessionSecret, signJwt, verifyJwt } from "@/lib/auth/crypto";
import { PLATFORM_SESSION_MAX_AGE_SEC } from "@/lib/auth/types";

/** GET /api/auth/session : une session plateforme est relue en base avant tout profil ou cookie. */
const mocks = vi.hoisted(() => ({ getPlatformUserById: vi.fn() }));

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h }));
vi.mock("@/lib/db/platform-users", () => ({ getPlatformUserById: mocks.getPlatformUserById }));
vi.mock("@/lib/db/users", () => ({ getUserSessionState: vi.fn() }));
vi.mock("@/lib/db/organization", () => ({ getOrganizationLogoUrl: vi.fn() }));

import { GET } from "@/app/api/auth/session/route";

const tokenAdmin = {
  id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Admin", role: "SUPER_ADMIN",
  scope: "platform", accountType: "PLATFORM",
};

function request(claims: Record<string, unknown>) {
  const token = signJwt(claims as never, getSessionSecret(), PLATFORM_SESSION_MAX_AGE_SEC);
  return new NextRequest("http://localhost/api/auth/session", { headers: { cookie: `rappel_session=${token}` } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/session (plateforme)", () => {
  it("jeton à jour : renvoie le profil de la base et ré-émet le cookie avec la version courante", async () => {
    mocks.getPlatformUserById.mockResolvedValue({ ...tokenAdmin, lastName: "Renamed", sessionVersion: 4 });
    const res = await GET(request({ ...tokenAdmin, sessionVersion: 4 }));
    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ id: "pu_1", lastName: "Renamed", sessionVersion: 4 });
    const cookie = res.cookies.get("rappel_session")!;
    expect(cookie.value).not.toBe("");
    expect(cookie.maxAge).toBe(PLATFORM_SESSION_MAX_AGE_SEC);
    expect(verifyJwt<{ sessionVersion: number }>(cookie.value, getSessionSecret())?.sessionVersion).toBe(4);
  });

  it("ancien jeton sans version : traité 0, ré-émis avec la version courante", async () => {
    mocks.getPlatformUserById.mockResolvedValue({ ...tokenAdmin, sessionVersion: 0 });
    const res = await GET(request(tokenAdmin));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("rappel_session")!;
    expect(verifyJwt<{ sessionVersion: number }>(cookie.value, getSessionSecret())?.sessionVersion).toBe(0);
  });

  it("jeton révoqué (version dépassée) : 401 SESSION_REVOKED, ni profil ni nouveau jeton", async () => {
    mocks.getPlatformUserById.mockResolvedValue({ ...tokenAdmin, sessionVersion: 5 });
    const res = await GET(request({ ...tokenAdmin, sessionVersion: 4 }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ user: null, code: "SESSION_REVOKED" });
    expect(res.cookies.get("rappel_session")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("ancien jeton sans version alors que la base est passée à 1 : révoqué", async () => {
    mocks.getPlatformUserById.mockResolvedValue({ ...tokenAdmin, sessionVersion: 1 });
    const res = await GET(request(tokenAdmin));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("SESSION_REVOKED");
  });

  it("administrateur désactivé ou supprimé : 401 sans profil, cookie effacé", async () => {
    mocks.getPlatformUserById.mockResolvedValue(null);
    const res = await GET(request({ ...tokenAdmin, sessionVersion: 0 }));
    expect(res.status).toBe(401);
    expect((await res.json()).user).toBeNull();
    expect(res.cookies.get("rappel_session")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("sans cookie : 401 sans lecture en base", async () => {
    const res = await GET(new NextRequest("http://localhost/api/auth/session"));
    expect(res.status).toBe(401);
    expect(mocks.getPlatformUserById).not.toHaveBeenCalled();
  });
});
