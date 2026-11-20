import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { signJwt, verifyJwt } from "@/lib/auth/crypto";
import { getSessionSecret } from "@/lib/auth/env";
import { PLATFORM_SESSION_MAX_AGE_SEC, SESSION_MAX_AGE_SEC } from "@/lib/auth/types";

/**
 * Routes d'authentification (hors Google) : CSRF / Content-Type, déconnexion qui révoque la session, renouvellement
 * qui respecte la révocation, réponses génériques (login, mot de passe oublié). Aucune base ni service externe.
 */
const m = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  authenticatePlatformUser: vi.fn(),
  getUserSessionState: vi.fn(),
  getPlatformUserById: vi.fn(),
  revokeSession: vi.fn(),
  isSessionRevoked: vi.fn(),
  consume: vi.fn(),
  issueToken: vi.fn(),
  sendEmail: vi.fn(),
  audit: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h, tenantRoute: <T,>(h: T) => h }));
vi.mock("@/lib/logger", () => ({ logger: m.logger }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("@/lib/db/users", () => ({ authenticateUser: m.authenticateUser, getUserSessionState: m.getUserSessionState }));
vi.mock("@/lib/db/platform-users", () => ({
  authenticatePlatformUser: m.authenticatePlatformUser,
  getPlatformUserById: m.getPlatformUserById,
}));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: m.audit }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/organization", () => ({ getOrganizationLogoUrl: vi.fn(async () => null) }));
vi.mock("@/lib/auth/api-guard", () => ({ stripOrganizationId: <T,>(b: T) => b }));
vi.mock("@/lib/db/session-revocation", () => ({ revokeSession: m.revokeSession, isSessionRevoked: m.isSessionRevoked }));
vi.mock("@/lib/db/activation", () => ({ issuePasswordResetToken: m.issueToken, activateAccount: vi.fn() }));
vi.mock("@/lib/email/send", () => ({ sendTransactionalEmail: m.sendEmail, isEmailConfigured: () => true }));
vi.mock("@/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/rate-limit")>()),
  consumeDimensions: (...args: unknown[]) => m.consume(...args),
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as sessionGet } from "@/app/api/auth/session/route";
import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as activate } from "@/app/api/auth/activate/route";
import { DELETE as platformLogout } from "@/app/api/auth/platform/login/route";
import { flushResetRequests } from "@/lib/auth/password-reset-task";
import { RATE_POLICIES } from "@/lib/rate-limit";

const appSession = {
  id: "u_1", email: "u@t.test", firstName: "S", lastName: "A", role: "OWNER", organizationId: "org_a",
  orgName: "A", orgSlug: "a", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
  mustChangePassword: false, sessionVersion: 2,
};
const JTI = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const AUTH_AT = Math.floor(Date.now() / 1000) - 3600;

function sessionCookie(extra: Record<string, unknown> = {}, secs = 3600) {
  return `rappel_session=${signJwt({ ...appSession, ...extra }, getSessionSecret(), secs)}`;
}

function req(url: string, init: { method?: string; headers?: Record<string, string>; body?: unknown; raw?: string } = {}) {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  let body: string | undefined = init.raw;
  if (body === undefined && init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["content-type"] ??= "application/json";
  }
  return new NextRequest(`http://localhost${url}`, { method: init.method ?? "POST", headers, body });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.consume.mockResolvedValue({ allowed: true });
  m.authenticateUser.mockResolvedValue(null);
  m.authenticatePlatformUser.mockResolvedValue(null);
  m.audit.mockResolvedValue(undefined);
  m.isSessionRevoked.mockResolvedValue(false);
  m.revokeSession.mockResolvedValue(undefined);
  m.issueToken.mockResolvedValue(null);
  m.sendEmail.mockResolvedValue({ messageId: "id" });
});

describe("POST /api/auth/login : CSRF et réponses génériques", () => {
  const creds = { identifier: "u@t.test", password: "bon-mdp-1234" };

  it("exige application/json : form-urlencoded et absence de Content-Type refusés (415), sans authentifier", async () => {
    const form = await login(
      req("/api/auth/login", {
        headers: { "content-type": "application/x-www-form-urlencoded" },
        raw: "email=u%40t.test&password=bon-mdp-1234",
      }),
    );
    expect(form.status).toBe(415);
    const none = await login(req("/api/auth/login", { raw: JSON.stringify(creds) }));
    expect(none.status).toBe(415);
    expect(m.authenticateUser).not.toHaveBeenCalled();
    expect(m.consume).not.toHaveBeenCalled();
  });

  it("refuse une requête inter-sites (Sec-Fetch-Site ou Origin étranger) et accepte same-origin et clients sans en-tête", async () => {
    for (const headers of [
      { "sec-fetch-site": "cross-site" },
      { "sec-fetch-site": "same-site" },
      { origin: "https://evil.example" },
      { origin: "null" },
    ]) {
      const res = await login(req("/api/auth/login", { headers, body: creds }));
      expect(res.status).toBe(403);
    }
    expect(m.authenticateUser).not.toHaveBeenCalled();
    for (const headers of [{ origin: "http://localhost" }, { "sec-fetch-site": "same-origin" }, {}]) {
      const res = await login(req("/api/auth/login", { headers, body: creds }));
      expect(res.status).toBe(401); // identifiants simulés refusés : le contrôle d'origine a laissé passer
    }
  });

  it("limiteurs : IP et couple IP+compte d'abord, compte seul ensuite (plafond plus haut), jamais l'identifiant en clair", async () => {
    expect(RATE_POLICIES.login.pair.limit).toBeLessThanOrEqual(10);
    expect(RATE_POLICIES.login.account.limit).toBeGreaterThanOrEqual(4 * RATE_POLICIES.login.pair.limit);
    vi.stubEnv("ORIGIN_SECRET", "");
    vi.stubEnv("TRUST_PROXY_IP_HEADERS", "true");
    await login(req("/api/auth/login", { body: creds, headers: { "cf-connecting-ip": "203.0.113.9" } }));
    vi.unstubAllEnvs();
    expect(m.consume).toHaveBeenCalledTimes(2);
    const first = (m.consume.mock.calls[0][0] as Array<{ key: string }>).map((d) => d.key);
    const second = (m.consume.mock.calls[1][0] as Array<{ key: string }>).map((d) => d.key);
    expect(first).toHaveLength(2);
    expect(first).toContain("auth:login:ip:203.0.113.9");
    expect(first.some((k) => k.startsWith("auth:login:ip-account:203.0.113.9:"))).toBe(true);
    expect(second).toHaveLength(1);
    expect(second[0]).toMatch(/^auth:login:account:/);
    expect(second[0]).not.toContain("203.0.113.9"); // le plafond du compte ne dépend pas de l'IP
    expect([...first, ...second].join(" ")).not.toContain("u@t.test");
  });

  it("IP ou couple épuisé : 429 sans jamais alimenter le compteur du compte", async () => {
    m.consume.mockResolvedValueOnce({ allowed: false, retryAfterSec: 60 });
    const res = await login(req("/api/auth/login", { body: creds }));
    expect(res.status).toBe(429);
    expect(m.consume).toHaveBeenCalledTimes(1);
    expect(m.authenticateUser).not.toHaveBeenCalled();
  });

  it("plafond du compte atteint (attaque répartie) : 429 aussi", async () => {
    m.consume.mockResolvedValueOnce({ allowed: true }).mockResolvedValueOnce({ allowed: false, retryAfterSec: 300 });
    const res = await login(req("/api/auth/login", { body: creds }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("300");
    expect(m.authenticateUser).not.toHaveBeenCalled();
  });

  it("file de vérification pleine : 503 générique avec Retry-After, jamais « identifiants invalides »", async () => {
    m.authenticateUser.mockRejectedValueOnce(Object.assign(new Error("PASSWORD_CHECK_BUSY"), { code: "AUTH_BUSY" }));
    const res = await login(req("/api/auth/login", { body: creds }));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("5");
  });

  it("limitation de débit : 429 avec Retry-After", async () => {
    m.consume.mockResolvedValueOnce({ allowed: false, retryAfterSec: 120 });
    const res = await login(req("/api/auth/login", { body: creds }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    expect(m.authenticateUser).not.toHaveBeenCalled();
  });

  it("panne de connexion à la base : 503 générique, sans « PostgreSQL » ; toute autre erreur : réponse générique 401", async () => {
    m.authenticateUser.mockRejectedValueOnce(Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" }));
    const down = await login(req("/api/auth/login", { body: creds }));
    expect(down.status).toBe(503);
    const body = JSON.stringify(await down.json());
    expect(body).not.toMatch(/postgres|démarrez|base de données/i);

    // « connect » dans un message quelconque n'est plus pris pour une panne de base
    m.authenticateUser.mockRejectedValueOnce(new Error("failed to connect the dots in userland"));
    const other = await login(req("/api/auth/login", { body: creds }));
    expect(other.status).toBe(401);
    expect(await other.json()).toEqual({ error: "Identifiants invalides." });
  });

  it("succès : cookie de session avec jti et authAt, profil sans ces champs", async () => {
    m.authenticateUser.mockResolvedValueOnce(appSession);
    const res = await login(req("/api/auth/login", { body: creds }));
    expect(res.status).toBe(200);
    const payload = verifyJwt<Record<string, unknown>>(res.cookies.get("rappel_session")!.value, getSessionSecret())!;
    expect(payload.jti).toMatch(/^[0-9a-f]{32}$/);
    expect(typeof payload.authAt).toBe("number");
    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain(payload.jti as string);
  });

  it("identifiants absents, compte inconnu, mot de passe faux : même réponse 401", async () => {
    const empty = await login(req("/api/auth/login", { body: { identifier: "u@t.test" } }));
    const unknown = await login(req("/api/auth/login", { body: creds }));
    expect([empty.status, unknown.status]).toEqual([401, 401]);
    expect(await empty.json()).toEqual(await unknown.json());
  });
});

describe("POST /api/auth/logout : révocation réelle", () => {
  it("inscrit le jti de la session courante comme révoqué, efface le cookie, journalise", async () => {
    const res = await logout(req("/api/auth/logout", { headers: { cookie: sessionCookie({ jti: JTI, authAt: AUTH_AT }) } }));
    expect(res.status).toBe(200);
    expect(m.revokeSession).toHaveBeenCalledTimes(1);
    expect(m.revokeSession).toHaveBeenCalledWith(
      expect.objectContaining({ jti: JTI, userId: "u_1", organizationId: "org_a", scope: "app" }),
    );
    const expiresAt = (m.revokeSession.mock.calls[0][0] as { expiresAt: Date }).expiresAt;
    expect(expiresAt.getTime()).toBe((AUTH_AT + SESSION_MAX_AGE_SEC) * 1000);
    expect(res.cookies.get("rappel_session")).toMatchObject({ value: "", maxAge: 0 });
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "LOGOUT" }));
  });

  it("le cookie est effacé même si l'inscription de la révocation échoue", async () => {
    m.revokeSession.mockRejectedValueOnce(new Error("db down"));
    const res = await logout(req("/api/auth/logout", { headers: { cookie: sessionCookie({ jti: JTI }) } }));
    expect(res.status).toBe(200);
    expect(res.cookies.get("rappel_session")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("ancien jeton sans jti : déconnexion normale, rien à révoquer ; sans cookie : idem", async () => {
    const legacy = await logout(req("/api/auth/logout", { headers: { cookie: sessionCookie() } }));
    expect(legacy.status).toBe(200);
    const none = await logout(req("/api/auth/logout"));
    expect(none.status).toBe(200);
    expect(m.revokeSession).not.toHaveBeenCalled();
  });

  it("n'exige pas de corps (le bouton n'en envoie pas) mais refuse une origine étrangère, sans rien révoquer", async () => {
    const cookie = sessionCookie({ jti: JTI });
    const cross = await logout(req("/api/auth/logout", { headers: { cookie, origin: "https://evil.example" } }));
    expect(cross.status).toBe(403);
    expect(cross.cookies.get("rappel_session")).toBeUndefined();
    const site = await logout(req("/api/auth/logout", { headers: { cookie, "sec-fetch-site": "cross-site" } }));
    expect(site.status).toBe(403);
    expect(m.revokeSession).not.toHaveBeenCalled();
    const ok = await logout(req("/api/auth/logout", { headers: { cookie, "sec-fetch-site": "same-origin" } }));
    expect(ok.status).toBe(200);
    expect(m.revokeSession).toHaveBeenCalledTimes(1);
  });

  it("session plateforme : révocation sans institut, plafond de 7 jours", async () => {
    const platform = {
      id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Root", role: "SUPER_ADMIN",
      scope: "platform", accountType: "PLATFORM", sessionVersion: 0, jti: JTI, authAt: AUTH_AT,
    };
    const cookie = `rappel_session=${signJwt(platform, getSessionSecret(), 600)}`;
    for (const handler of [logout, platformLogout]) {
      m.revokeSession.mockClear();
      const res = await handler(req("/api/auth/logout", { method: "POST", headers: { cookie } }));
      expect(res.status).toBe(200);
      expect(m.revokeSession).toHaveBeenCalledWith(
        expect.objectContaining({ jti: JTI, organizationId: null, scope: "platform" }),
      );
      const expiresAt = (m.revokeSession.mock.calls[0][0] as { expiresAt: Date }).expiresAt;
      expect(expiresAt.getTime()).toBe((AUTH_AT + PLATFORM_SESSION_MAX_AGE_SEC) * 1000);
    }
  });
});

describe("GET /api/auth/session : révocation et renouvellement", () => {
  const state = { status: "ACTIVE", mustChangePassword: false, sessionVersion: 2, role: "OWNER", orgStatus: "ACTIVE" };

  it("une session révoquée ne se renouvelle pas : 401, cookie effacé, aucune relecture du profil", async () => {
    m.isSessionRevoked.mockResolvedValueOnce(true);
    const res = await sessionGet(req("/api/auth/session", { method: "GET", headers: { cookie: sessionCookie({ jti: JTI }) } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ user: null, code: "SESSION_REVOKED" });
    expect(res.cookies.get("rappel_session")).toMatchObject({ value: "", maxAge: 0 });
    expect(m.getUserSessionState).not.toHaveBeenCalled();
  });

  it("session valide : même jti et même authAt dans le cookie renouvelé ; profil sans ces champs", async () => {
    m.getUserSessionState.mockResolvedValueOnce(state);
    const authAt = Math.floor(Date.now() / 1000) - 5 * 86_400;
    const res = await sessionGet(req("/api/auth/session", { method: "GET", headers: { cookie: sessionCookie({ jti: JTI, authAt }) } }));
    expect(res.status).toBe(200);
    const payload = verifyJwt<Record<string, unknown>>(res.cookies.get("rappel_session")!.value, getSessionSecret())!;
    expect(payload.jti).toBe(JTI);
    expect(payload.authAt).toBe(authAt);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain(JTI);
    expect(body).not.toContain("authAt");
  });

  it("plateforme : le renouvellement garde aussi jti et authAt", async () => {
    m.getPlatformUserById.mockResolvedValueOnce({
      id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Root", role: "SUPER_ADMIN",
      scope: "platform", accountType: "PLATFORM", sessionVersion: 0,
    });
    const platform = {
      id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Root", role: "SUPER_ADMIN",
      scope: "platform", accountType: "PLATFORM", sessionVersion: 0, jti: JTI, authAt: AUTH_AT,
    };
    const cookie = `rappel_session=${signJwt(platform, getSessionSecret(), 600)}`;
    const res = await sessionGet(req("/api/auth/session", { method: "GET", headers: { cookie } }));
    expect(res.status).toBe(200);
    const payload = verifyJwt<Record<string, unknown>>(res.cookies.get("rappel_session")!.value, getSessionSecret())!;
    expect(payload).toMatchObject({ jti: JTI, authAt: AUTH_AT });
  });

  it("ancien jeton sans jti : aucun contrôle de révocation (compatibilité), jti attribué au renouvellement", async () => {
    m.getUserSessionState.mockResolvedValueOnce(state);
    const res = await sessionGet(req("/api/auth/session", { method: "GET", headers: { cookie: sessionCookie() } }));
    expect(res.status).toBe(200);
    expect(m.isSessionRevoked).not.toHaveBeenCalled();
    const payload = verifyJwt<Record<string, unknown>>(res.cookies.get("rappel_session")!.value, getSessionSecret())!;
    expect(payload.jti).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("POST /api/auth/forgot-password : réponse indiscernable", () => {
  const post = (body: unknown) => forgot(req("/api/auth/forgot-password", { body }));

  it("compte existant, inconnu, adresse mal formée, vide : même statut et même corps", async () => {
    m.issueToken.mockImplementation(async (email: string) => (email === "existe@t.test" ? "tok".repeat(20) : null));
    const responses = await Promise.all(
      ["existe@t.test", "inconnu@t.test", "pas-un-email", "a@b", "", "x".repeat(400) + "@t.test"].map((email) => post({ email })),
    );
    for (const res of responses) expect(res.status).toBe(200);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    for (const body of bodies) expect(body).toEqual(bodies[0]);
    await flushResetRequests();
    // Seules les adresses bien formées déclenchent un traitement ; les mal formées ne touchent jamais la base.
    expect(m.issueToken.mock.calls.map((c) => c[0]).sort()).toEqual(["existe@t.test", "inconnu@t.test"]);
    expect(m.sendEmail).toHaveBeenCalledTimes(1);
    expect(m.sendEmail.mock.calls[0][0].to).toBe("existe@t.test");
  });

  it("l'envoi d'e-mail n'est pas attendu : la réponse part même si le fournisseur ne répond jamais", async () => {
    m.issueToken.mockResolvedValue("tok".repeat(20));
    let release: () => void = () => undefined;
    m.sendEmail.mockReturnValue(new Promise<void>((resolve) => (release = resolve)));
    const res = await Promise.race([
      post({ email: "existe@t.test" }),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 1500)),
    ]);
    expect(res).not.toBe("timeout");
    expect((res as Response).status).toBe(200);
    release();
    await flushResetRequests();
  });

  it("une erreur du traitement détaché (base, e-mail) ne change rien à la réponse et ne fuit pas l'adresse", async () => {
    m.issueToken.mockRejectedValue(new Error("db down for existe@t.test"));
    const res = await post({ email: "existe@t.test" });
    expect(res.status).toBe(200);
    await flushResetRequests();
    const logged = JSON.stringify(m.logger.error.mock.calls);
    expect(logged).not.toContain("existe@t.test");
  });

  it("limitation de débit identique quel que soit le compte (clé = adresse saisie hachée) ; JSON invalide : 400", async () => {
    m.consume.mockResolvedValueOnce({ allowed: false, retryAfterSec: 90 });
    const limited = await post({ email: "inconnu@t.test" });
    expect(limited.status).toBe(429);
    const keys = (m.consume.mock.calls[0][0] as Array<{ key: string }>).map((d) => d.key).join(" ");
    expect(keys).not.toContain("inconnu@t.test");
    const bad = await forgot(req("/api/auth/forgot-password", { raw: "{pas du json", headers: { "content-type": "application/json" } }));
    expect(bad.status).toBe(400);
  });

  it("CSRF : Content-Type JSON et origine vérifiés", async () => {
    const form = await forgot(
      req("/api/auth/forgot-password", { raw: "email=a%40b.co", headers: { "content-type": "application/x-www-form-urlencoded" } }),
    );
    expect(form.status).toBe(415);
    const cross = await forgot(req("/api/auth/forgot-password", { body: { email: "a@b.co" }, headers: { origin: "https://evil.example" } }));
    expect(cross.status).toBe(403);
    expect(m.issueToken).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/activate : CSRF", () => {
  it("refuse un autre Content-Type et une origine étrangère avant tout traitement", async () => {
    const form = await activate(req("/api/auth/activate", { raw: "token=a", headers: { "content-type": "text/plain" } }));
    expect(form.status).toBe(415);
    const cross = await activate(req("/api/auth/activate", { body: { token: "a", password: "motdepasse1" }, headers: { "sec-fetch-site": "cross-site" } }));
    expect(cross.status).toBe(403);
    expect(m.consume).not.toHaveBeenCalled();
  });
});
