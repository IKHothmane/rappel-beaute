import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * GET /api/auth/session renvoie le champ ADDITIF `emailSetupRequired` (e-mail absent) sans casser le
 * format existant, sans l'écrire dans le jeton signé, et l'omet quand l'information est indisponible.
 */
const m = vi.hoisted(() => ({ state: vi.fn(), setup: vi.fn() }));

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("@/lib/db/users", () => ({ getUserSessionState: m.state }));
vi.mock("@/lib/db/platform-users", () => ({ getPlatformUserById: vi.fn() }));
vi.mock("@/lib/db/organization", () => ({ getOrganizationLogoUrl: vi.fn(async () => null) }));
vi.mock("@/lib/db/session-revocation", () => ({ isSessionRevoked: vi.fn(async () => false) }));
vi.mock("@/lib/db/account-security", () => ({ getEmailSetupRequired: m.setup }));

import { GET } from "@/app/api/auth/session/route";
import { createSessionCookie, parseSessionToken } from "@/lib/auth/session";

const SESSION = {
  id: "u_1", email: "ada@example.test", firstName: "Ada", lastName: "Owner", role: "OWNER", organizationId: "org_1",
  orgName: "Institut", orgSlug: "institut", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
  mustChangePassword: false, sessionVersion: 2,
} as never;

function call() {
  const cookie = createSessionCookie(SESSION);
  return GET(new NextRequest("http://localhost:3000/api/auth/session", { headers: { cookie: `${cookie.name}=${cookie.value}` } }));
}

beforeEach(() => {
  vi.resetAllMocks();
  m.state.mockResolvedValue({ status: "ACTIVE", mustChangePassword: false, sessionVersion: 2, role: "OWNER", orgStatus: "ACTIVE" });
});

describe("GET /api/auth/session : emailSetupRequired", () => {
  it.each([true, false])("ajoute emailSetupRequired=%s au profil et garde le format existant", async (value) => {
    m.setup.mockResolvedValue(value);
    const res = await call();
    const { user } = await res.json();
    expect(user).toMatchObject({ id: "u_1", email: "ada@example.test", role: "OWNER", orgSlug: "institut", sessionVersion: 2, emailSetupRequired: value });
    expect(user).not.toHaveProperty("jti");
    expect(user).not.toHaveProperty("authAt");
    // Le champ n'entre jamais dans le jeton signé (le cookie ré-émis ne le porte pas).
    const cookie = res.cookies.get("rappel_session");
    expect(parseSessionToken(cookie?.value as string)).not.toHaveProperty("emailSetupRequired");
  });

  it("information indisponible : le champ est simplement omis", async () => {
    m.setup.mockResolvedValue(undefined);
    const { user } = await (await call()).json();
    expect(user).not.toHaveProperty("emailSetupRequired");
    expect(user.id).toBe("u_1");
  });
});
