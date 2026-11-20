import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth/crypto";

/**
 * Routes /api/auth/google/* : aucun appel Google ni base réels (échange, id_token et accès base sont des doubles).
 * Les garanties testées : désactivé = 404, cookie + state obligatoires, état à usage unique, aucune connexion ni
 * fusion pour un e-mail existant, aucun User avant le POST de finalisation, idempotence, origine et JSON.
 */
const m = vi.hoisted(() => {
  class PublicSignupErrorStub extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
  return {
    PublicSignupErrorStub,
    createOAuthState: vi.fn(),
    consumeOAuthState: vi.fn(),
    peekOAuthState: vi.fn(),
    consume: vi.fn(),
    exchange: vi.fn(),
    verifyIdToken: vi.fn(),
    findGoogleIdentity: vi.fn(),
    loginWithGoogleIdentity: vi.fn(),
    emailBelongsToAnyAccount: vi.fn(),
    createGooglePendingSignup: vi.fn(),
    linkGoogleIdentity: vi.fn(),
    getOpenGooglePending: vi.fn(),
    getGooglePendingState: vi.fn(),
    completeGoogleSignup: vi.fn(),
    loadAppSessionForUser: vi.fn(),
    unlinkGoogleIdentity: vi.fn(),
    getLinkContext: vi.fn(),
    requireAppSession: vi.fn(),
    sendEmail: vi.fn(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h, tenantRoute: <T,>(h: T) => h }));
vi.mock("@/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/rate-limit")>()),
  consumeDimensions: (...args: unknown[]) => m.consume(...args),
}));
vi.mock("@/lib/logger", () => ({ logger: m.logger }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("@/lib/db/users", () => ({ MAX_PASSWORD_LENGTH: 200 }));
vi.mock("@/lib/db/institute-create", () => ({ PublicSignupError: m.PublicSignupErrorStub }));
vi.mock("@/lib/auth/api-guard", () => ({ requireAppSession: m.requireAppSession }));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: () => true, sendTransactionalEmail: m.sendEmail }));
vi.mock("@/lib/db/auth-oauth-state", () => ({ createOAuthState: m.createOAuthState, consumeOAuthState: m.consumeOAuthState, peekOAuthState: m.peekOAuthState }));
vi.mock("@/lib/auth/google-oidc", async (original) => ({
  ...(await original<typeof import("@/lib/auth/google-oidc")>()),
  exchangeGoogleCode: m.exchange,
  verifyGoogleIdToken: m.verifyIdToken,
}));
vi.mock("@/lib/db/auth-identities", () => ({
  findGoogleIdentity: m.findGoogleIdentity,
  loginWithGoogleIdentity: m.loginWithGoogleIdentity,
  emailBelongsToAnyAccount: m.emailBelongsToAnyAccount,
  createGooglePendingSignup: m.createGooglePendingSignup,
  linkGoogleIdentity: m.linkGoogleIdentity,
  getOpenGooglePending: m.getOpenGooglePending,
  getGooglePendingState: m.getGooglePendingState,
  completeGoogleSignup: m.completeGoogleSignup,
  loadAppSessionForUser: m.loadAppSessionForUser,
  unlinkGoogleIdentity: m.unlinkGoogleIdentity,
  getLinkContext: m.getLinkContext,
}));

import { GET as start } from "@/app/api/auth/google/start/route";
import { GET as callback } from "@/app/api/auth/google/callback/route";
import { GET as pending } from "@/app/api/auth/google/pending/route";
import { POST as signup } from "@/app/api/auth/google/signup/route";
import { POST as linkStart } from "@/app/api/auth/google/link/start/route";
import { POST as unlink } from "@/app/api/auth/google/unlink/route";
import { oauthCookieName, pendingCookieName } from "@/lib/auth/google-http";
import { sha256Hex } from "@/lib/auth/google-oidc";

const ORIGIN = "http://localhost:3000";
const CLAIMS = { sub: "sub-1", email: "owner@example.test", name: "Ada", emailVerified: true as const };
const SESSION = {
  id: "u_1", email: "owner@example.test", firstName: "Ada", lastName: "Owner", role: "OWNER", organizationId: "org_1",
  orgName: "Institut", orgSlug: "institut", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
  mustChangePassword: false, sessionVersion: 0,
};
const STATE = "state-value-0123456789-abcdefghijklmnop";
const consumed = (over: Record<string, unknown> = {}) => ({
  id: "oas_1", intent: "login", userId: null, nonceHash: sha256Hex("n"), codeVerifier: "v", redirectAfter: null, ...over,
});

function req(path: string, init: { method?: string; headers?: Record<string, string>; cookies?: Record<string, string>; body?: unknown } = {}) {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.cookies) headers.cookie = Object.entries(init.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  return new NextRequest(`${ORIGIN}${path}`, { method: init.method ?? "GET", headers, body });
}
const postHeaders = { "content-type": "application/json", origin: ORIGIN, "sec-fetch-site": "same-origin" };
const location = (res: Response) => new URL(res.headers.get("location") ?? "http://none");

beforeEach(() => {
  vi.clearAllMocks();
  m.consume.mockResolvedValue({ allowed: true });
  m.peekOAuthState.mockResolvedValue(null);
  vi.stubEnv("AUTH_GOOGLE_ENABLED", "true");
  vi.stubEnv("GOOGLE_AUTH_CLIENT_ID", "client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_AUTH_CLIENT_SECRET", "secret-de-test");
  vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", `${ORIGIN}/api/auth/google/callback/`);
  vi.stubEnv("COOKIE_SECURE", "true");
  m.exchange.mockResolvedValue("id.token.jwt");
  m.verifyIdToken.mockResolvedValue(CLAIMS);
  m.consumeOAuthState.mockResolvedValue(consumed());
  m.findGoogleIdentity.mockResolvedValue(null);
  m.loginWithGoogleIdentity.mockResolvedValue(null);
  m.emailBelongsToAnyAccount.mockResolvedValue(false);
  m.createGooglePendingSignup.mockResolvedValue("pending-token-0123456789-0123456789-0123456789");
});
afterEach(() => vi.unstubAllEnvs());

const callbackReq = (over: { query?: string; cookie?: string | null } = {}) =>
  req(`/api/auth/google/callback/?${over.query ?? `code=abc&state=${STATE}`}`, {
    cookies: over.cookie === null ? undefined : { [oauthCookieName()]: over.cookie ?? STATE },
  });

describe("drapeau désactivé ou non configuré", () => {
  it.each([
    ["AUTH_GOOGLE_ENABLED faux", () => vi.stubEnv("AUTH_GOOGLE_ENABLED", "false")],
    ["drapeau absent", () => vi.stubEnv("AUTH_GOOGLE_ENABLED", "")],
    ["identifiants absents", () => vi.stubEnv("GOOGLE_AUTH_CLIENT_SECRET", "")],
  ])("répond 404 vide sur toutes les routes : %s", async (_label, disable) => {
    disable();
    const responses = await Promise.all([
      start(req("/api/auth/google/start/?intent=login")),
      callback(callbackReq()),
      pending(req("/api/auth/google/pending/")),
      signup(req("/api/auth/google/signup/", { method: "POST", headers: postHeaders, body: {} })),
      linkStart(req("/api/auth/google/link/start/", { method: "POST", headers: postHeaders, body: {} })),
      unlink(req("/api/auth/google/unlink/", { method: "POST", headers: postHeaders, body: {} })),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(await res.text()).toBe("");
    }
    expect(m.createOAuthState).not.toHaveBeenCalled();
    expect(m.requireAppSession).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/google/start", () => {
  it("crée l'état, pose le cookie lié au state et redirige vers Google", async () => {
    const res = await start(req("/api/auth/google/start/?intent=signup&next=/agenda/"));
    expect(res.status).toBe(302);
    const target = location(res);
    expect(target.origin + target.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(target.searchParams.get("code_challenge_method")).toBe("S256");
    expect(target.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/google/callback/`);
    const cookie = res.cookies.get("__Host-rb_oauth");
    expect(cookie).toMatchObject({ value: target.searchParams.get("state"), httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    expect(m.createOAuthState).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "signup", redirectAfter: "/agenda/", material: expect.objectContaining({ state: cookie?.value }) }),
    );
  });

  it("refuse une intention inconnue ou link (la liaison exige une session)", async () => {
    expect((await start(req("/api/auth/google/start/?intent=link"))).status).toBe(400);
    expect((await start(req("/api/auth/google/start/"))).status).toBe(400);
    expect(m.createOAuthState).not.toHaveBeenCalled();
  });

  it("en HTTP de développement, omet Secure et le préfixe __Host- sans toucher la production", async () => {
    vi.stubEnv("COOKIE_SECURE", "false");
    const res = await start(req("/api/auth/google/start/?intent=login"));
    expect(res.cookies.get("rb_oauth")).toMatchObject({ secure: false, httpOnly: true, sameSite: "lax" });
    expect(res.cookies.get("__Host-rb_oauth")).toBeUndefined();
  });

  it("renvoie vers l'hôte canonique de l'URI de retour (le cookie est propre à un hôte), sans boucle", async () => {
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "https://rappelbeauty.com/api/auth/google/callback/");
    const res = await start(req("/api/auth/google/start/?intent=login"));
    expect(res.status).toBe(307);
    expect(location(res).origin).toBe("https://rappelbeauty.com");
    expect(location(res).searchParams.get("canon")).toBe("1");
    const looped = await start(req("/api/auth/google/start/?intent=login&canon=1"));
    expect(looped.status).toBe(404);
    expect(m.createOAuthState).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/google/callback", () => {
  it("refus Google : retour au login avec un code générique, aucun échange", async () => {
    const res = await callback(callbackReq({ query: `error=access_denied&state=${STATE}` }));
    expect(res.status).toBe(303);
    expect(location(res).pathname).toBe("/connexion/");
    expect(location(res).searchParams.get("google_error")).toBe("cancelled");
    expect(m.consumeOAuthState).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
  });

  it.each([
    ["cookie manquant", { cookie: null }],
    ["cookie d'un autre state", { cookie: "autre-state-autre-state-autre-state-xx" }],
  ])("%s : refus sans consommer l'état ni appeler Google", async (_label, over) => {
    const res = await callback(callbackReq(over));
    expect(location(res).searchParams.get("google_error")).toBe("failed");
    expect(m.consumeOAuthState).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
    expect(res.cookies.get("rappel_session")).toBeUndefined();
  });

  it("état rejoué, expiré ou inconnu (consommation à usage unique) : refus, aucune session", async () => {
    m.consumeOAuthState.mockResolvedValue(null);
    const res = await callback(callbackReq());
    expect(location(res).searchParams.get("google_error")).toBe("failed");
    expect(m.exchange).not.toHaveBeenCalled();
    expect(res.cookies.get("rappel_session")).toBeUndefined();
    expect(res.cookies.get(oauthCookieName())).toMatchObject({ value: "", maxAge: 0 });
  });

  it("id_token invalide : refus, aucune session ni inscription", async () => {
    m.verifyIdToken.mockRejectedValue(new Error("ID_TOKEN_INVALID"));
    const res = await callback(callbackReq());
    expect(location(res).searchParams.get("google_error")).toBe("failed");
    expect(m.loginWithGoogleIdentity).not.toHaveBeenCalled();
    expect(m.createGooglePendingSignup).not.toHaveBeenCalled();
  });

  it("identité connue : émet la session existante et redirige vers l'espace, cookie OAuth supprimé", async () => {
    m.loginWithGoogleIdentity.mockResolvedValue(SESSION);
    const res = await callback(callbackReq());
    expect(res.status).toBe(303);
    expect(location(res).pathname).toBe("/dashboard/");
    expect(res.cookies.get("rappel_session")?.value).toBeTruthy();
    expect(res.cookies.get("__rappel_host")?.value).toBe("app");
    expect(res.cookies.get(oauthCookieName())).toMatchObject({ value: "", maxAge: 0 });
    expect(m.exchange).toHaveBeenCalledWith(expect.objectContaining({ code: "abc", codeVerifier: "v" }));
  });

  it("identité connue mais utilisateur ou institut désactivé : aucune session, refus générique", async () => {
    m.findGoogleIdentity.mockResolvedValue({ userId: "u_1", organizationId: "org_1", userStatus: "DISABLED", organizationStatus: "ACTIVE" });
    m.loginWithGoogleIdentity.mockResolvedValue(null);
    const res = await callback(callbackReq());
    expect(res.cookies.get("rappel_session")).toBeUndefined();
    expect(location(res).searchParams.get("google_error")).toBe("failed");
    expect(m.createGooglePendingSignup).not.toHaveBeenCalled();
  });

  it("e-mail déjà présent chez un User, identité inconnue : ni connexion ni fusion ni inscription, même message qu'un login sans compte", async () => {
    m.emailBelongsToAnyAccount.mockResolvedValue(true);
    m.consumeOAuthState.mockResolvedValue(consumed({ intent: "signup" }));
    const signupRes = await callback(callbackReq());
    expect(location(signupRes).searchParams.get("google_error")).toBe("no_account");
    expect(signupRes.cookies.get("rappel_session")).toBeUndefined();
    expect(signupRes.cookies.get(pendingCookieName())).toBeUndefined();
    expect(m.createGooglePendingSignup).not.toHaveBeenCalled();
    expect(m.linkGoogleIdentity).not.toHaveBeenCalled();

    m.consumeOAuthState.mockResolvedValue(consumed({ intent: "login" }));
    m.emailBelongsToAnyAccount.mockResolvedValue(false);
    const loginRes = await callback(callbackReq());
    expect(location(loginRes).toString()).toBe(location(signupRes).toString());
  });

  it("inscription, e-mail libre : crée seulement un pending (cookie 30 min) et renvoie vers le formulaire d'institut", async () => {
    m.consumeOAuthState.mockResolvedValue(consumed({ intent: "signup" }));
    const res = await callback(callbackReq());
    expect(location(res).pathname).toBe("/professionnel/");
    expect(res.cookies.get("rappel_session")).toBeUndefined();
    expect(res.cookies.get(pendingCookieName())).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 1800 });
    expect(m.createGooglePendingSignup).toHaveBeenCalledWith(CLAIMS);
    // Les seules fonctions d'écriture appelées : aucune création d'institut ni d'utilisateur à ce stade.
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
  });

  it("liaison : exige la session du compte qui a demandé l'état, jamais de fusion par e-mail", async () => {
    m.consumeOAuthState.mockResolvedValue(consumed({ intent: "link", userId: "u_1" }));
    const noSession = await callback(callbackReq());
    expect(location(noSession).searchParams.get("google_link")).toBe("failed");
    expect(m.linkGoogleIdentity).not.toHaveBeenCalled();

    m.linkGoogleIdentity.mockResolvedValue("in_use");
    const { createSessionCookie } = await import("@/lib/auth/session");
    const jwt = createSessionCookie(SESSION as never).value;
    const withSession = await callback(
      req(`/api/auth/google/callback/?code=abc&state=${STATE}`, { cookies: { [oauthCookieName()]: STATE, rappel_session: jwt } }),
    );
    expect(m.linkGoogleIdentity).toHaveBeenCalledWith(expect.objectContaining({ userId: "u_1", organizationId: "org_1", claims: CLAIMS }));
    expect(location(withSession).searchParams.get("google_link")).toBe("in_use");

    // Session d'un autre compte que celui de l'état : refus.
    m.linkGoogleIdentity.mockClear();
    m.consumeOAuthState.mockResolvedValue(consumed({ intent: "link", userId: "u_autre" }));
    const mismatch = await callback(
      req(`/api/auth/google/callback/?code=abc&state=${STATE}`, { cookies: { [oauthCookieName()]: STATE, rappel_session: jwt } }),
    );
    expect(location(mismatch).searchParams.get("google_link")).toBe("failed");
    expect(m.linkGoogleIdentity).not.toHaveBeenCalled();
  });
});

describe("callback : échec ou annulation d'une liaison (utilisateur connecté)", () => {
  const linkHint = { intent: "link", redirectAfter: null };
  const securityBack = (res: Response, code: string) => {
    expect(res.status).toBe(303);
    expect(location(res).pathname).toBe("/security/");
    expect(location(res).searchParams.get("google_link")).toBe(code);
    expect(location(res).searchParams.get("__host")).toBe("app");
    expect(location(res).searchParams.has("google_error")).toBe(false);
  };

  it("refus Google (access_denied) : retour sur /security/ avec cancelled, sans consommer l'état", async () => {
    m.peekOAuthState.mockResolvedValue(linkHint);
    const res = await callback(callbackReq({ query: `error=access_denied&state=${STATE}` }));
    securityBack(res, "cancelled");
    expect(m.consumeOAuthState).not.toHaveBeenCalled();
    expect(m.exchange).not.toHaveBeenCalled();
    m.peekOAuthState.mockResolvedValue({ intent: "link", redirectAfter: "/security/?x=1" });
    const other = await callback(callbackReq({ query: `error=server_error&state=${STATE}` }));
    expect(location(other).searchParams.get("google_link")).toBe("failed");
    expect(location(other).searchParams.get("x")).toBe("1");
  });

  it("id_token invalide ou code manquant : retour sur /security/ avec failed", async () => {
    m.consumeOAuthState.mockResolvedValue(consumed({ intent: "link", userId: "u_1", redirectAfter: "/security/" }));
    m.verifyIdToken.mockRejectedValue(new Error("ID_TOKEN_INVALID"));
    securityBack(await callback(callbackReq()), "failed");
    m.peekOAuthState.mockResolvedValue(linkHint);
    securityBack(await callback(callbackReq({ query: `state=${STATE}` })), "failed");
    expect(m.linkGoogleIdentity).not.toHaveBeenCalled();
  });

  it("état rejoué, expiré ou inconnu : même réponse externe qu'un échec de connexion (aucune indication)", async () => {
    m.peekOAuthState.mockResolvedValue(null);
    m.consumeOAuthState.mockResolvedValue(null);
    const unknown = await callback(callbackReq());
    expect(location(unknown).pathname).toBe("/connexion/");
    expect(location(unknown).searchParams.get("google_error")).toBe("failed");
    const denied = await callback(callbackReq({ query: `error=access_denied&state=${STATE}` }));
    expect(location(denied).searchParams.get("google_error")).toBe("cancelled");
  });

  it("sans cookie lié au state : aucune lecture de l'état, retour générique", async () => {
    const res = await callback(callbackReq({ query: `error=access_denied&state=${STATE}`, cookie: null }));
    expect(m.peekOAuthState).not.toHaveBeenCalled();
    expect(location(res).pathname).toBe("/connexion/");
  });

  it("la connexion réussie efface le cache du navigateur comme /api/auth/login", async () => {
    m.loginWithGoogleIdentity.mockResolvedValue(SESSION);
    const res = await callback(callbackReq());
    expect(res.headers.get("clear-site-data")).toBe('"cache"');
  });
});

describe("GET /api/auth/google/pending", () => {
  it("404 sans cookie ou sans pending ouvert, {name,email} sinon (no-store)", async () => {
    expect((await pending(req("/api/auth/google/pending/"))).status).toBe(404);
    m.getOpenGooglePending.mockResolvedValue(null);
    expect((await pending(req("/api/auth/google/pending/", { cookies: { [pendingCookieName()]: "x" } }))).status).toBe(404);
    m.getOpenGooglePending.mockResolvedValue({ name: "Ada", email: "owner@example.test" });
    const ok = await pending(req("/api/auth/google/pending/", { cookies: { [pendingCookieName()]: "x" } }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ name: "Ada", email: "owner@example.test" });
    expect(ok.headers.get("cache-control")).toBe("no-store");
  });
});

describe("POST /api/auth/google/signup", () => {
  const form = { institut: "Institut Ada", ville: "Casablanca", phone: "0612345678", localisation: "", no_website: true };
  const call = (over: { headers?: Record<string, string>; body?: unknown; cookie?: boolean } = {}) =>
    signup(
      req("/api/auth/google/signup/", {
        method: "POST",
        headers: over.headers ?? postHeaders,
        body: over.body ?? form,
        cookies: over.cookie === false ? undefined : { [pendingCookieName()]: "pending-token" },
      }),
    );
  beforeEach(() => {
    m.getGooglePendingState.mockResolvedValue({ sub: "sub-1", consumed: false, organizationId: null, expired: false, replayable: false });
    m.loadAppSessionForUser.mockResolvedValue(SESSION);
    m.loginWithGoogleIdentity.mockResolvedValue(SESSION);
  });

  it("refuse tout ce qui n'est pas du JSON de même origine, avant de toucher la base", async () => {
    expect((await call({ headers: { ...postHeaders, "content-type": "text/plain" } })).status).toBe(415);
    expect((await call({ headers: { ...postHeaders, "sec-fetch-site": "cross-site" } })).status).toBe(403);
    expect((await call({ headers: { "content-type": "application/json", origin: "https://evil.example" } })).status).toBe(403);
    expect((await call({ headers: { "content-type": "application/json" } })).status).toBe(403);
    expect(m.getGooglePendingState).not.toHaveBeenCalled();
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
  });

  it("valide le formulaire (honeypot, nom, ville, téléphone) avant toute écriture", async () => {
    for (const body of [
      { ...form, hp: "robot" },
      { ...form, institut: "x" },
      { ...form, ville: "Atlantide" },
      { ...form, phone: "12" },
      { ...form, no_website: false, website: "pas un site" },
    ]) {
      expect((await call({ body })).status).toBe(400);
    }
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
  });

  it("sans cookie d'inscription en attente : 400 générique, rien n'est créé", async () => {
    const res = await call({ cookie: false });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("PENDING_EXPIRED");
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
  });

  it("crée l'institut, émet la session, envoie le lead ; un rejeu réémet la session sans nouvel institut ni nouvel e-mail", async () => {
    m.completeGoogleSignup
      .mockResolvedValueOnce({ kind: "created", organizationId: "org_1", userId: "u_1", email: "owner@example.test", firstName: "Ada", institut: "Institut Ada", sub: "sub-1" })
      .mockResolvedValueOnce({ kind: "replay", organizationId: "org_1", sub: "sub-1" });
    const first = await call();
    const second = await call();
    for (const res of [first, second]) {
      expect(res.status).toBe(200);
      expect(res.cookies.get("rappel_session")?.value).toBeTruthy();
      expect(res.cookies.get(pendingCookieName())).toMatchObject({ value: "", maxAge: 0 });
      expect((await res.json()).user).toMatchObject({ id: "u_1", orgSlug: "institut" });
    }
    expect(m.sendEmail).toHaveBeenCalledTimes(1);
    expect(m.loginWithGoogleIdentity).toHaveBeenCalledWith("sub-1", "org_1");
    expect(m.loadAppSessionForUser).toHaveBeenCalledTimes(1);
  });

  it("téléphone déjà utilisé : 409 sans session ; échec du lead : l'inscription reste validée", async () => {
    m.completeGoogleSignup.mockRejectedValueOnce(new m.PublicSignupErrorStub("PHONE_TAKEN", "Ce numéro de téléphone possède déjà un compte."));
    const taken = await call();
    expect(taken.status).toBe(409);
    expect(taken.cookies.get("rappel_session")).toBeUndefined();

    m.completeGoogleSignup.mockResolvedValueOnce({ kind: "created", organizationId: "org_1", userId: "u_1", email: "owner@example.test", firstName: "Ada", institut: "Institut Ada", sub: "sub-1" });
    m.sendEmail.mockRejectedValueOnce(new Error("smtp down"));
    expect((await call()).status).toBe(200);
  });

  it("pending expiré ou consommé sans institut : 400 et cookie supprimé", async () => {
    m.getGooglePendingState.mockResolvedValue({ sub: "sub-1", consumed: false, organizationId: null, expired: true, replayable: false });
    const res = await call();
    expect(res.status).toBe(400);
    expect(res.cookies.get(pendingCookieName())).toMatchObject({ value: "", maxAge: 0 });
    m.getGooglePendingState.mockResolvedValue({ sub: "sub-1", consumed: false, organizationId: null, expired: false, replayable: false });
    m.completeGoogleSignup.mockResolvedValue({ kind: "invalid" });
    expect((await call()).status).toBe(400);
  });
});

describe("POST /api/auth/google/signup : quotas et fenêtre de rejeu", () => {
  const form = { institut: "Institut Ada", ville: "Casablanca", phone: "0612345678", localisation: "", no_website: true };
  const call = (body: unknown = form) =>
    signup(
      req("/api/auth/google/signup/", { method: "POST", headers: postHeaders, body, cookies: { [pendingCookieName()]: "pending-token" } }),
    );
  const created = { kind: "created", organizationId: "org_1", userId: "u_1", email: "owner@example.test", firstName: "Ada", institut: "Institut Ada", sub: "sub-1" };
  beforeEach(() => {
    m.getGooglePendingState.mockResolvedValue({ sub: "sub-1", consumed: false, organizationId: null, expired: false, replayable: false });
    m.loadAppSessionForUser.mockResolvedValue(SESSION);
    m.loginWithGoogleIdentity.mockResolvedValue(SESSION);
  });

  it("un corps invalide ne consomme aucun quota", async () => {
    expect((await call({ ...form, institut: "x" })).status).toBe(400);
    expect((await call({ ...form, hp: "robot" })).status).toBe(400);
    expect(m.consume).not.toHaveBeenCalled();
  });

  it("une inscription valide consomme le quota par IP et par identité Google, après validation", async () => {
    m.completeGoogleSignup.mockResolvedValue(created);
    expect((await call()).status).toBe(200);
    expect(m.consume).toHaveBeenCalledTimes(1);
    const keys = (m.consume.mock.calls[0][0] as { key: string }[]).map((d) => d.key);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^auth:google:signup:ip:/);
    expect(keys[1]).toMatch(/^auth:google:signup:subject:/);
  });

  it("quota dépassé : 429 sans rien créer", async () => {
    m.consume.mockResolvedValue({ allowed: false, retryAfterSec: 120 });
    const res = await call();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
  });

  it("un rejeu idempotent dans la fenêtre ne consomme aucun quota et réémet la session", async () => {
    m.getGooglePendingState.mockResolvedValue({ sub: "sub-1", consumed: true, organizationId: "org_1", expired: false, replayable: true });
    m.completeGoogleSignup.mockResolvedValue({ kind: "replay", organizationId: "org_1", sub: "sub-1" });
    m.consume.mockResolvedValue({ allowed: false });
    const res = await call();
    expect(res.status).toBe(200);
    expect(m.consume).not.toHaveBeenCalled();
    expect(m.sendEmail).not.toHaveBeenCalled();
  });

  it("un rejeu hors de la fenêtre (consommé depuis trop longtemps) : PENDING_EXPIRED, cookie supprimé, rien d'émis", async () => {
    m.getGooglePendingState.mockResolvedValue({ sub: "sub-1", consumed: true, organizationId: "org_1", expired: false, replayable: false });
    const res = await call();
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("PENDING_EXPIRED");
    expect(res.cookies.get(pendingCookieName())).toMatchObject({ value: "", maxAge: 0 });
    expect(res.cookies.get("rappel_session")).toBeUndefined();
    expect(m.completeGoogleSignup).not.toHaveBeenCalled();
    expect(m.loginWithGoogleIdentity).not.toHaveBeenCalled();
  });
});

describe("origine des POST JSON", () => {
  const post = (headers: Record<string, string>) =>
    signup(req("/api/auth/google/signup/", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: {} }));

  it("compare l'origine complète : port ou schéma différent refusé, origine exacte acceptée", async () => {
    expect((await post({ origin: "http://localhost:4000" })).status).toBe(403);
    expect((await post({ origin: "https://localhost:3000" })).status).toBe(403);
    expect((await post({ origin: "http://localhost" })).status).toBe(403);
    expect((await post({ origin: ORIGIN })).status).not.toBe(403);
  });

  it("derrière un proxy : l'origine publique (x-forwarded-proto + host) est acceptée, un autre hôte non", async () => {
    const proxied = { "x-forwarded-proto": "https", "x-forwarded-host": "rappelbeauty.com" };
    expect((await post({ ...proxied, origin: "https://rappelbeauty.com" })).status).not.toBe(403);
    expect((await post({ ...proxied, origin: "http://rappelbeauty.com" })).status).toBe(403);
    expect((await post({ ...proxied, origin: "https://app.rappelbeauty.com" })).status).toBe(403);
  });
});

describe("liaison et déliaison (session institut)", () => {
  it("la liaison démarrée depuis un autre hôte que celui du retour Google est refusée clairement (409 WRONG_HOST)", async () => {
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "https://rappelbeauty.com/api/auth/google/callback/");
    m.requireAppSession.mockResolvedValue({ ok: true, session: SESSION });
    const res = await linkStart(req("/api/auth/google/link/start/", { method: "POST", headers: postHeaders, body: { password: "x" } }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("WRONG_HOST");
    expect(data.error).toContain("rappelbeauty.com");
    expect(m.createOAuthState).not.toHaveBeenCalled();
    expect(res.cookies.get(oauthCookieName())).toBeUndefined();
  });

  const link = (password: unknown) =>
    linkStart(req("/api/auth/google/link/start/", { method: "POST", headers: postHeaders, body: { password } }));
  beforeEach(() => {
    m.requireAppSession.mockResolvedValue({ ok: true, session: SESSION });
  });

  it("exige une session valide", async () => {
    const denied = new Response(JSON.stringify({ error: "Non authentifié." }), { status: 401 });
    m.requireAppSession.mockResolvedValue({ ok: false, response: denied });
    expect((await link("x")).status).toBe(401);
    expect(m.createOAuthState).not.toHaveBeenCalled();
  });

  it("refuse sans mot de passe actuel, avec un mauvais mot de passe, ou pour un compte sans mot de passe", async () => {
    m.getLinkContext.mockResolvedValue({ passwordHash: hashPassword("bon-mot-de-passe"), linked: false });
    expect((await link("")).status).toBe(400);
    expect((await link("mauvais")).status).toBe(403);
    m.getLinkContext.mockResolvedValue({ passwordHash: null, linked: false });
    const noPassword = await link("peu-importe");
    expect(noPassword.status).toBe(400);
    expect((await noPassword.json()).code).toBe("NO_PASSWORD");
    m.getLinkContext.mockResolvedValue({ passwordHash: hashPassword("bon-mot-de-passe"), linked: true });
    expect((await link("bon-mot-de-passe")).status).toBe(409);
    expect(m.createOAuthState).not.toHaveBeenCalled();
  });

  it("avec le bon mot de passe : état lié à l'utilisateur, URL Google et cookie lié au state", async () => {
    m.getLinkContext.mockResolvedValue({ passwordHash: hashPassword("bon-mot-de-passe"), linked: false });
    const res = await link("bon-mot-de-passe");
    expect(res.status).toBe(200);
    const { url } = await res.json();
    expect(new URL(url).hostname).toBe("accounts.google.com");
    expect(m.createOAuthState).toHaveBeenCalledWith(expect.objectContaining({ intent: "link", userId: "u_1" }));
    expect(res.cookies.get(oauthCookieName())?.value).toBe(new URL(url).searchParams.get("state"));
  });

  it("déliaison : refusée quand elle supprimerait le dernier moyen de connexion", async () => {
    m.unlinkGoogleIdentity.mockResolvedValue("last_login_method");
    const refused = await unlink(req("/api/auth/google/unlink/", { method: "POST", headers: postHeaders, body: {} }));
    expect(refused.status).toBe(409);
    m.unlinkGoogleIdentity.mockResolvedValue("unlinked");
    const ok = await unlink(req("/api/auth/google/unlink/", { method: "POST", headers: postHeaders, body: {} }));
    expect(ok.status).toBe(200);
    expect(m.unlinkGoogleIdentity).toHaveBeenLastCalledWith({ userId: "u_1", organizationId: "org_1" });
  });
});
