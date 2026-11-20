import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { signJwt, signJwtDerived } from "@/lib/auth/crypto";
import { getSessionSecret } from "@/lib/auth/env";

/**
 * Intégration Google Calendar : retour OAuth protégé comme une route métier (session validée en base, rôle courant,
 * utilisateur et institut du state), state à usage unique lié au navigateur (cookie __Host- court) et PKCE S256.
 * Aucun appel Google, aucune base : les échanges et l'accès base sont des doubles.
 */
const m = vi.hoisted(() => ({
  requireAppSession: vi.fn(),
  consume: vi.fn(),
  exchange: vi.fn(),
  fetchEmail: vi.fn(),
  listCalendars: vi.fn(),
  upsert: vi.fn(),
  audit: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h, tenantRoute: <T,>(h: T) => h }));
vi.mock("@/lib/auth/api-guard", () => ({ requireAppSession: m.requireAppSession }));
vi.mock("@/lib/db/session-revocation", () => ({ consumeOneTimeToken: m.consume }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: m.audit }));
vi.mock("@/lib/db/google-calendar", () => ({
  getGoogleCalendarConnection: vi.fn(async () => null),
  getOrganizationName: vi.fn(async () => "Institut A"),
  upsertGoogleCalendarConnection: m.upsert,
}));
vi.mock("@/lib/integrations/google-calendar-sync", () => ({ pushUpcomingAppointmentsToGoogle: m.push }));
vi.mock("@/lib/google/calendar", async (original) => ({
  ...(await original<typeof import("@/lib/google/calendar")>()),
  exchangeGoogleCode: m.exchange,
  fetchGoogleAccountEmail: m.fetchEmail,
  listGoogleCalendars: m.listCalendars,
}));

import { GET as connect } from "@/app/api/integrations/google-calendar/connect/route";
import { GET as callback } from "@/app/api/integrations/google-calendar/callback/route";
import { verifyGoogleOAuthState } from "@/lib/google/calendar";

const session = (over: Record<string, unknown> = {}) => ({
  id: "u_1", email: "u@t.test", firstName: "S", lastName: "A", role: "OWNER", organizationId: "org_a",
  orgName: "A", orgSlug: "a", scope: "app", accountType: "ORGANIZATION", mustChangePassword: false, sessionVersion: 0,
  ...over,
});
const authOk = (over: Record<string, unknown> = {}) => ({ ok: true, session: session(over) });
const sha256 = (v: string, enc: "hex" | "base64url") => createHash("sha256").update(v).digest(enc);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
  vi.stubEnv("GOOGLE_CALENDAR_PKCE", "");
  vi.stubEnv("COOKIE_SECURE", "");
  m.requireAppSession.mockResolvedValue(authOk());
  m.consume.mockResolvedValue(true);
  m.exchange.mockResolvedValue({ accessToken: "acc", refreshToken: "ref", expiresAt: new Date(Date.now() + 3_600_000) });
  m.fetchEmail.mockResolvedValue({ email: "owner@gmail.test", accountId: "sub-1" });
  m.listCalendars.mockResolvedValue([{ id: "primary", name: "Institut A", primary: true, canWrite: true }]);
  m.upsert.mockResolvedValue({});
  m.audit.mockResolvedValue(undefined);
  m.push.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

/** Lance le flux comme le navigateur : renvoie l'URL Google, le state et le cookie posé. */
async function startFlow() {
  const res = await connect(new NextRequest("http://localhost/api/integrations/google-calendar/connect/"));
  expect(res.status).toBeGreaterThanOrEqual(300);
  const url = new URL(res.headers.get("location")!);
  const cookie = [...res.cookies.getAll()].find((c) => c.name.endsWith("rb_gcal"))!;
  return { res, url, state: url.searchParams.get("state")!, cookie };
}

function callbackRequest(state: string, cookieValue?: string, cookieName = "rb_gcal", code = "auth-code") {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) headers.cookie = `${cookieName}=${cookieValue}`;
  return new NextRequest(
    `http://localhost/api/integrations/google-calendar/callback/?code=${code}&state=${encodeURIComponent(state)}`,
    { headers },
  );
}

const reasonOf = (res: Response) => new URL(res.headers.get("location")!).searchParams.get("reason");
const googleOf = (res: Response) => new URL(res.headers.get("location")!).searchParams.get("google");
const clearedCookie = (res: NextResponse) => res.cookies.getAll().find((c) => c.name.endsWith("rb_gcal"));

describe("départ du flux (connect)", () => {
  it("URL Google : scopes et redirection inchangés, PKCE S256, state signé, cookie lié au navigateur", async () => {
    const { res, url, state, cookie } = await startFlow();
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope")).toBe(
      [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    );
    expect(url.searchParams.get("redirect_uri")).toMatch(/\/api\/integrations\/google-calendar\/callback\/$/);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const payload = verifyGoogleOAuthState(state)!;
    expect(payload).toMatchObject({ orgId: "org_a", userId: "u_1", purpose: "gcal", pkce: true });

    // Le cookie porte nonce.verifier ; le state ne contient que le hachage du nonce et le challenge est S256(verifier).
    const [nonce, verifier] = cookie.value.split(".");
    expect(payload.nonceHash).toBe(sha256(nonce, "hex"));
    expect(url.searchParams.get("code_challenge")).toBe(sha256(verifier, "base64url"));
    expect(state).not.toContain(nonce);
    expect(decodeURIComponent(url.search)).not.toContain(verifier);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("cookies Secure : nom préfixé __Host-, Secure, sans Domain", async () => {
    vi.stubEnv("COOKIE_SECURE", "true");
    const { cookie } = await startFlow();
    expect(cookie.name).toBe("__Host-rb_gcal");
    expect(cookie).toMatchObject({ secure: true, path: "/" });
    expect(cookie).not.toHaveProperty("domain");
  });

  it("chaque flux a son propre state, nonce et verifier", async () => {
    const a = await startFlow();
    const b = await startFlow();
    expect(a.state).not.toBe(b.state);
    expect(a.cookie.value).not.toBe(b.cookie.value);
    expect(verifyGoogleOAuthState(a.state)!.jti).not.toBe(verifyGoogleOAuthState(b.state)!.jti);
  });

  it("GOOGLE_CALENDAR_PKCE=off : pas de challenge, le state le mémorise", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_PKCE", "off");
    const { url, state } = await startFlow();
    expect(url.searchParams.has("code_challenge")).toBe(false);
    expect(verifyGoogleOAuthState(state)!.pkce).toBe(false);
  });

  it("un non-gestionnaire est refusé avant tout state", async () => {
    m.requireAppSession.mockResolvedValue(authOk({ role: "STAFF" }));
    const res = await connect(new NextRequest("http://localhost/api/integrations/google-calendar/connect/"));
    expect(new URL(res.headers.get("location")!).searchParams.get("reason")).toBe("forbidden");
    expect([...res.cookies.getAll()].some((c) => c.name.endsWith("rb_gcal") && c.value)).toBe(false);
  });
});

describe("retour OAuth (callback)", () => {
  it("chemin nominal : même contrôle qu'une route métier, état consommé, verifier PKCE envoyé, jetons stockés, cookie effacé", async () => {
    const { state, cookie } = await startFlow();
    const res = await callback(callbackRequest(state, cookie.value));
    expect(googleOf(res)).toBe("connected");
    expect(m.requireAppSession).toHaveBeenCalledTimes(2); // connect + callback
    expect(m.consume).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u_1", organizationId: "org_a", jti: verifyGoogleOAuthState(state)!.jti }),
    );
    const [code, redirectUri, verifier] = m.exchange.mock.calls[0];
    expect(code).toBe("auth-code");
    expect(redirectUri).toMatch(/\/callback\/$/);
    expect(verifier).toBe(cookie.value.split(".")[1]);
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org_a", googleEmail: "owner@gmail.test" }));
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "GOOGLE_CALENDAR_CONNECTED", actorId: "u_1" }));
    expect(clearedCookie(res as NextResponse)).toMatchObject({ value: "", maxAge: 0 });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("rejeu du state refusé : le second retour avec le même state ne déclenche aucun échange", async () => {
    const { state, cookie } = await startFlow();
    m.consume.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const first = await callback(callbackRequest(state, cookie.value));
    expect(googleOf(first)).toBe("connected");
    const replay = await callback(callbackRequest(state, cookie.value));
    expect(googleOf(replay)).toBe("error");
    expect(reasonOf(replay)).toBe("state");
    expect(m.exchange).toHaveBeenCalledTimes(1);
    expect(m.upsert).toHaveBeenCalledTimes(1);
  });

  it("consommation de l'état impossible (base indisponible, table absente) : refus, jamais d'échange", async () => {
    const { state, cookie } = await startFlow();
    m.consume.mockRejectedValueOnce(Object.assign(new Error("relation does not exist"), { code: "42P01" }));
    const res = await callback(callbackRequest(state, cookie.value));
    expect(reasonOf(res)).toBe("state");
    expect(m.exchange).not.toHaveBeenCalled();
  });

  it("session révoquée / invalidée / institut suspendu : refusé, rien n'est consommé ni échangé", async () => {
    const { state, cookie } = await startFlow();
    m.requireAppSession.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ code: "SESSION_REVOKED" }, { status: 401 }),
    });
    const res = await callback(callbackRequest(state, cookie.value));
    expect(reasonOf(res)).toBe("session");
    expect(m.consume).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
    expect(m.upsert).not.toHaveBeenCalled();
    expect(clearedCookie(res as NextResponse)).toMatchObject({ value: "", maxAge: 0 });
  });

  it("utilisateur non gestionnaire (rôle courant en base) : refusé, l'état n'est pas brûlé", async () => {
    const { state, cookie } = await startFlow();
    m.requireAppSession.mockResolvedValue(authOk({ role: "STAFF" }));
    const res = await callback(callbackRequest(state, cookie.value));
    expect(reasonOf(res)).toBe("forbidden");
    expect(m.consume).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
  });

  it("state émis pour un autre utilisateur ou un autre institut : refusé", async () => {
    const { state, cookie } = await startFlow();
    for (const over of [{ id: "u_2" }, { organizationId: "org_b" }]) {
      m.requireAppSession.mockResolvedValue(authOk(over));
      const res = await callback(callbackRequest(state, cookie.value));
      expect(reasonOf(res)).toBe("session");
    }
    expect(m.consume).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
  });

  it("lié au navigateur : cookie absent, nonce différent ou mal formé = refus", async () => {
    const { state, cookie } = await startFlow();
    const other = await startFlow();
    const [, verifier] = cookie.value.split(".");
    for (const value of [undefined, other.cookie.value, `autre-nonce.${verifier}`, "sans-point", `${cookie.value}.extra`, `${cookie.value.split(".")[0]}.court`]) {
      const res = await callback(callbackRequest(state, value));
      expect(reasonOf(res)).toBe("state");
    }
    expect(m.consume).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
  });

  it("state invalide : falsifié, expiré, signé avec la clé de session, signé avec l'ancienne clé brute, mal formé", async () => {
    const { state, cookie } = await startFlow();
    const payload = verifyGoogleOAuthState(state)!;
    const { exp: _exp, ...claims } = payload;
    const root = getSessionSecret();
    const tampered = state.slice(0, -4) + (state.endsWith("AAAA") ? "BBBB" : "AAAA");
    const states = [
      tampered,
      signJwtDerived(claims, root, "oauth-state", -10), // expiré
      signJwtDerived(claims, root, "session", 600), // mauvais usage
      signJwt(claims, root, 600), // clé historique : jamais acceptée pour un state
      "pas-un-jwt",
    ];
    for (const bad of states) {
      const res = await callback(callbackRequest(bad, cookie.value));
      expect(reasonOf(res)).toBe("state");
    }
    expect(m.requireAppSession).toHaveBeenCalledTimes(1); // seulement celui de connect
    expect(m.exchange).not.toHaveBeenCalled();
  });

  it("un jeton de session ne peut pas servir de state, ni l'inverse", async () => {
    const { state } = await startFlow();
    expect(verifyGoogleOAuthState(signJwtDerived({ id: "u_1", orgId: "org_a" }, getSessionSecret(), "session", 600))).toBeNull();
    const { verifyJwt } = await import("@/lib/auth/crypto");
    expect(verifyJwt(state, getSessionSecret())).toBeNull(); // usage « session » par défaut
  });

  it("sans PKCE dans le state, aucun code_verifier n'est envoyé", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_PKCE", "off");
    const { state, cookie } = await startFlow();
    await callback(callbackRequest(state, cookie.value));
    expect(m.exchange.mock.calls[0][2]).toBeUndefined();
  });

  it("refus du fournisseur (access_denied) : redirection d'erreur, cookie effacé, aucune consommation", async () => {
    const res = await callback(
      new NextRequest("http://localhost/api/integrations/google-calendar/callback/?error=access_denied", {
        headers: { cookie: "rb_gcal=quelque.chose" },
      }),
    );
    expect(reasonOf(res)).toBe("denied");
    expect(clearedCookie(res as NextResponse)).toMatchObject({ value: "", maxAge: 0 });
    expect(m.consume).not.toHaveBeenCalled();
  });

  it("les erreurs d'échange sont traduites sans fuite, cookie effacé", async () => {
    const { state, cookie } = await startFlow();
    m.exchange.mockRejectedValueOnce(new Error("GOOGLE_REFRESH_MISSING"));
    const res = await callback(callbackRequest(state, cookie.value));
    expect(reasonOf(res)).toBe("refresh");
    expect(clearedCookie(res as NextResponse)).toMatchObject({ value: "", maxAge: 0 });
  });
});
