import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth/crypto";

/**
 * Drapeau AUTH_PHONE_LOGIN_ENABLED (vrai par défaut). Faux/0/off : /api/auth/login refuse tout identifiant qui n'est
 * pas une adresse e-mail (même réponse et même coût qu'un autre refus), authenticateUser n'interroge plus loginPhone,
 * normalizeLoginIdentifier n'essaie plus le téléphone. L'e-mail fonctionne dans les deux états.
 */
const m = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  authenticatePlatformUser: vi.fn(),
  burn: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: (...a: unknown[]) => m.query(...a), connect: vi.fn() } }));
vi.mock("@/lib/db/platform-users", () => ({ authenticatePlatformUser: m.authenticatePlatformUser }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/auth/api-guard", () => ({ stripOrganizationId: <T,>(b: T) => b }));
vi.mock("@/lib/auth/crypto", async (original) => {
  const actual = await original<typeof import("@/lib/auth/crypto")>();
  return { ...actual, burnPasswordCheck: (...a: unknown[]) => (m.burn(...a), actual.burnPasswordCheck(a[0] as string)) };
});

import { POST as login } from "@/app/api/auth/login/route";
import * as usersModule from "@/lib/db/users";
import { normalizeLoginIdentifier, looksLikeEmail } from "@/lib/auth/login-identifier";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

const SESSION = {
  id: "u_1", email: "ada@example.test", firstName: "Ada", lastName: "Owner", role: "OWNER", organizationId: "org_1",
  orgName: "Institut", orgSlug: "institut", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
  mustChangePassword: false, sessionVersion: 0,
};

function attempt(identifier: string, ip = "198.51.100.9") {
  return login(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ identifier, password: "mot-de-passe-1" }),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("REDIS_URL", "");
  vi.stubEnv("TRUST_PROXY_IP_HEADERS", "false");
  resetRateLimitsForTests();
  m.authenticatePlatformUser.mockReset();
  m.burn.mockClear();
  m.query.mockReset();
  m.query.mockResolvedValue({ rows: [] });
  m.authenticatePlatformUser.mockResolvedValue(null);
});
afterEach(() => {
  resetRateLimitsForTests();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("normalizeLoginIdentifier", () => {
  it("vrai (défaut) : un numéro devient ses chiffres locaux ; faux : jamais le téléphone", () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "");
    expect(normalizeLoginIdentifier("+212 6 12 34 56 78")).toBe("0612345678");
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "false");
    expect(normalizeLoginIdentifier("+212 6 12 34 56 78")).toBe("+212 6 12 34 56 78");
    expect(normalizeLoginIdentifier("  Ada@Example.TEST ")).toBe("ada@example.test");
    expect(looksLikeEmail("ada@example.test")).toBe(true);
    expect(looksLikeEmail("0612345678")).toBe(false);
  });
});

describe("authenticateUser (SQL) selon le drapeau, mot de passe vérifié pour de vrai", () => {
  const row = {
    id: "u_1", email: "ada@example.test", loginPhone: "0612345678", firstName: "Ada", lastName: "Owner", role: "OWNER",
    passwordHash: hashPassword("mot-de-passe-1"), organizationId: "org_1", orgName: "I", orgSlug: "i", userStatus: "ACTIVE",
    orgStatus: "ACTIVE", mustChangePassword: false, sessionVersion: 0,
  };
  const userQuery = () => m.query.mock.calls.find((c) => String(c[0]).includes('FROM "User" u'));

  it("faux : un numéro n'interroge aucune table et brûle une vérification factice", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "false");
    expect(await usersModule.authenticateUser("0612345678", "mot-de-passe-1")).toBeNull();
    expect(m.query).not.toHaveBeenCalled();
    expect(m.burn).toHaveBeenCalledTimes(1);
  });

  it("faux : l'e-mail est interrogé avec loginPhone = NULL et connecte", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "false");
    m.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [row] });
    const session = await usersModule.authenticateUser("Ada@Example.test", "mot-de-passe-1");
    expect(session?.id).toBe("u_1");
    expect(userQuery()?.[1]).toEqual(["ada@example.test", null]);
  });

  it("vrai : un numéro est cherché dans loginPhone", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "true");
    m.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [row] });
    expect((await usersModule.authenticateUser("06 12 34 56 78", "mot-de-passe-1"))?.id).toBe("u_1");
    expect(userQuery()?.[1]).toEqual(["0612345678", "0612345678"]);
  });
});

describe("POST /api/auth/login selon le drapeau", () => {
  it("faux : un numéro est refusé (401 « Identifiants invalides. ») sans interroger les comptes, avec un coût factice", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "false");
    const phone = await attempt("0612345678");
    expect(phone.status).toBe(401);
    expect(await phone.json()).toEqual({ error: "Identifiants invalides." });
    expect(m.query).not.toHaveBeenCalled();
    expect(m.authenticatePlatformUser).not.toHaveBeenCalled();
    expect(m.burn).toHaveBeenCalledTimes(1);

    // Même corps et même statut qu'un refus ordinaire (adresse inconnue).
    const wrong = await attempt("inconnu@example.test");
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ error: "Identifiants invalides." });
  });

  it("faux : les limites de débit s'appliquent toujours avant le refus", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "off");
    const statuses: number[] = [];
    for (let i = 0; i < 15; i += 1) statuses.push((await attempt("0612345678", "198.51.100.30")).status);
    expect(statuses[0]).toBe(401);
    expect(statuses).toContain(429);
  });

  it.each(["", "false"])("AUTH_PHONE_LOGIN_ENABLED=%j : l'adresse e-mail est acceptée", async (value) => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", value);
    m.query.mockImplementation(async (sql: string) =>
      String(sql).includes('FROM "User" u')
        ? { rows: [{ id: "u_1", email: "ada@example.test", loginPhone: null, firstName: "Ada", lastName: "Owner", role: "OWNER", passwordHash: hashPassword("mot-de-passe-1"), organizationId: "org_1", orgName: "I", orgSlug: "i", userStatus: "ACTIVE", orgStatus: "ACTIVE", mustChangePassword: false, sessionVersion: 0 }] }
        : { rows: [] },
    );
    const res = await attempt("Ada@Example.test");
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toMatch(/"(password|passwordHash)"/);
    expect(res.cookies.get("rappel_session")?.value).toBeTruthy();
  });

  it("vrai (défaut) : un numéro de téléphone est toujours accepté", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "");
    m.query.mockImplementation(async (sql: string) =>
      String(sql).includes('FROM "User" u')
        ? { rows: [{ id: "u_1", email: null, loginPhone: "0612345678", firstName: "Ada", lastName: "Owner", role: "OWNER", passwordHash: hashPassword("mot-de-passe-1"), organizationId: "org_1", orgName: "I", orgSlug: "i", userStatus: "ACTIVE", orgStatus: "ACTIVE", mustChangePassword: false, sessionVersion: 0 }] }
        : { rows: [] },
    );
    expect((await attempt("06 12 34 56 78")).status).toBe(200);
  });
});
