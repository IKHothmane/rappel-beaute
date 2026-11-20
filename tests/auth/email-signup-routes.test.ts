import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyPassword } from "@/lib/auth/crypto";

/**
 * Routes d'inscription par e-mail vérifié et de « Sécuriser mon compte » : aucune base ni aucun envoi réel (accès base,
 * Resend, stockage sont des doubles). Garanties : réponse générique identique (adresse nouvelle, existante,
 * administrateur plateforme), aucun mot de passe en clair ni PIN dans une réponse, liens sur le bon hôte, cookie
 * `__Host-rb_pending` posé par la vérification, finalisation idempotente, logo traité après la création.
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
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    sendEmail: vi.fn(),
    startEmailSignup: vi.fn(),
    resendEmailSignup: vi.fn(),
    verifyEmailSignup: vi.fn(),
    getOpenEmailPending: vi.fn(),
    getEmailPendingState: vi.fn(),
    completeEmailSignup: vi.fn(),
    loadAppSessionForUser: vi.fn(),
    getLinkContext: vi.fn(),
    requireAppSession: vi.fn(),
    requestEmailChange: vi.fn(),
    verifyEmailChange: vi.fn(),
    getAccountSecurity: vi.fn(),
    setInitialPassword: vi.fn(),
    changeOwnPassword: vi.fn(),
    storagePut: vi.fn(),
    setLogo: vi.fn(),
  };
});

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h, tenantRoute: <T,>(h: T) => h }));
vi.mock("@/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/rate-limit")>()),
  consumeDimensions: (...args: unknown[]) => m.consume(...args),
}));
vi.mock("@/lib/logger", () => ({ logger: m.logger }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("@/lib/email/send", async (original) => ({
  ...(await original<typeof import("@/lib/email/send")>()),
  isEmailConfigured: () => true,
  sendTransactionalEmail: m.sendEmail,
}));
vi.mock("@/lib/db/institute-create", () => ({ PublicSignupError: m.PublicSignupErrorStub }));
vi.mock("@/lib/db/email-signup", () => ({
  startEmailSignup: m.startEmailSignup,
  resendEmailSignup: m.resendEmailSignup,
  verifyEmailSignup: m.verifyEmailSignup,
  getOpenEmailPending: m.getOpenEmailPending,
  getEmailPendingState: m.getEmailPendingState,
  completeEmailSignup: m.completeEmailSignup,
}));
vi.mock("@/lib/db/account-security", () => ({
  requestEmailChange: m.requestEmailChange,
  verifyEmailChange: m.verifyEmailChange,
  getAccountSecurity: m.getAccountSecurity,
  setInitialPassword: m.setInitialPassword,
  getEmailSetupRequired: vi.fn(),
}));
vi.mock("@/lib/db/auth-identities", () => ({ loadAppSessionForUser: m.loadAppSessionForUser, getLinkContext: m.getLinkContext }));
vi.mock("@/lib/db/users", () => ({ MAX_PASSWORD_LENGTH: 200, changeOwnPassword: m.changeOwnPassword }));
vi.mock("@/lib/auth/api-guard", () => ({ requireAppSession: m.requireAppSession }));
vi.mock("@/lib/storage", () => ({ getStorageService: () => ({ put: m.storagePut }) }));
vi.mock("@/lib/db/organization", () => ({ setOrganizationLogoUrl: m.setLogo }));

import { POST as signup } from "@/app/api/auth/signup/email/route";
import { POST as resend } from "@/app/api/auth/signup/email/resend/route";
import { POST as verify } from "@/app/api/auth/signup/email/verify/route";
import { GET as pendingGet } from "@/app/api/auth/signup/email/pending/route";
import { POST as complete } from "@/app/api/auth/signup/email/complete/route";
import { GET as accountGet } from "@/app/api/auth/account-security/route";
import { POST as accountEmail } from "@/app/api/auth/account-security/email/route";
import { POST as accountPassword } from "@/app/api/auth/account-security/password/route";
import { POST as verifyChange } from "@/app/api/auth/email/verify-change/route";
import { GET as authConfig } from "@/app/api/auth/config/route";
import { flushAuthEmailTasks } from "@/lib/auth/email-auth-tasks";
import { pendingCookieName } from "@/lib/auth/google-http";
import { checkPasswordPolicy } from "@/lib/auth/password-policy";
import { isRecentlyAuthenticated } from "@/lib/auth/reauth";
import { isUserEmailUniqueViolation } from "@/lib/db/email-uniqueness";

const ORIGIN = "http://localhost:3000";
const STRONG = "Un-bon-secret-9371!";
const SESSION = {
  id: "u_1", email: "owner@example.test", firstName: "Ada", lastName: "Owner", role: "OWNER", organizationId: "org_1",
  orgName: "Institut", orgSlug: "institut", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION",
  mustChangePassword: false, sessionVersion: 3, jti: "jti-0123456789abcdef", authAt: Math.floor(Date.now() / 1000) - 30,
};
const postHeaders = { "content-type": "application/json", origin: ORIGIN, "sec-fetch-site": "same-origin" };

function req(path: string, init: { method?: string; headers?: Record<string, string>; cookies?: Record<string, string>; body?: unknown; raw?: BodyInit; url?: string } = {}) {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.cookies) headers.cookie = Object.entries(init.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  const body = init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body));
  return new NextRequest(`${init.url ?? ORIGIN}${path}`, { method: init.method ?? "GET", headers, body });
}
const post = (path: string, body: unknown, extra: Record<string, string> = {}, cookies?: Record<string, string>) =>
  req(path, { method: "POST", headers: { ...postHeaders, ...extra }, body, cookies });
const responseText = async (res: Response) => `${res.status} ${JSON.stringify(await res.clone().json().catch(() => null))}`;

beforeEach(() => {
  vi.resetAllMocks();
  m.consume.mockResolvedValue({ allowed: true });
  m.sendEmail.mockResolvedValue({ messageId: "id" });
  m.requireAppSession.mockResolvedValue({ ok: true, session: SESSION });
  vi.stubEnv("COOKIE_SECURE", "true");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/signup/email/ : réponse générique et aucune création", () => {
  const valid = { email: "Nouvelle@Example.test ", password: STRONG, name: "Ada Lovelace", hp: "" };

  it("même statut et même corps que l'adresse soit nouvelle, déjà un compte ou un administrateur plateforme", async () => {
    const outcomes = [{ kind: "created", token: "tok-new" }, { kind: "existing" }, { kind: "ignored" }];
    const seen: string[] = [];
    for (const outcome of outcomes) {
      m.startEmailSignup.mockResolvedValueOnce(outcome);
      const res = await signup(post("/api/auth/signup/email/", valid));
      await flushAuthEmailTasks();
      seen.push(await responseText(res));
    }
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).toContain("200");
    for (const text of seen) {
      expect(text).not.toMatch(/password|temporaryPassword|credentials|pin/i);
      expect(text).not.toContain(STRONG);
    }
  });

  it("transmet un haché scrypt (jamais le mot de passe en clair) et l'adresse normalisée", async () => {
    m.startEmailSignup.mockResolvedValue({ kind: "ignored" });
    await signup(post("/api/auth/signup/email/", valid));
    await flushAuthEmailTasks();
    const arg = m.startEmailSignup.mock.calls[0][0];
    expect(arg.email).toBe("nouvelle@example.test");
    expect(arg.passwordHash).not.toContain(STRONG);
    expect(verifyPassword(STRONG, arg.passwordHash)).toBe(true);
    expect(JSON.stringify(arg)).not.toContain(STRONG);
  });

  it("adresse nouvelle : e-mail de vérification avec un lien sur l'hôte canonique ; compte existant : e-mail « déjà un compte » sans jeton ; plateforme : rien", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.rappelbeauty.com");
    m.startEmailSignup.mockResolvedValueOnce({ kind: "created", token: "tok-abc_123" });
    await signup(post("/api/auth/signup/email/", valid));
    await flushAuthEmailTasks();
    expect(m.sendEmail).toHaveBeenCalledTimes(1);
    const verification = m.sendEmail.mock.calls[0][0];
    expect(verification.to).toBe("nouvelle@example.test");
    // Le cookie d'inscription est propre à l'hôte : le lien vise l'apex qui sert /professionnel/, jamais app.*.
    expect(verification.text).toContain("https://rappelbeauty.com/verify-email/?token=tok-abc_123");
    expect(verification.html).toContain("https://rappelbeauty.com/verify-email/?token=tok-abc_123");
    expect(verification.text).not.toContain(STRONG);

    m.sendEmail.mockClear();
    m.startEmailSignup.mockResolvedValueOnce({ kind: "existing" });
    await signup(post("/api/auth/signup/email/", valid));
    await flushAuthEmailTasks();
    expect(m.sendEmail).toHaveBeenCalledTimes(1);
    expect(m.sendEmail.mock.calls[0][0].subject).toMatch(/déjà un compte/);
    expect(m.sendEmail.mock.calls[0][0].text).not.toMatch(/token=/);
    expect(m.sendEmail.mock.calls[0][0].text).toContain("https://rappelbeauty.com/connexion/");

    m.sendEmail.mockClear();
    m.startEmailSignup.mockResolvedValueOnce({ kind: "ignored" });
    await signup(post("/api/auth/signup/email/", valid));
    await flushAuthEmailTasks();
    expect(m.sendEmail).not.toHaveBeenCalled();
  });

  it("une panne d'envoi ou de base après la réponse ne change pas la réponse et ne fuit rien", async () => {
    m.startEmailSignup.mockRejectedValueOnce(new Error("db down"));
    const res = await signup(post("/api/auth/signup/email/", valid));
    await flushAuthEmailTasks();
    expect(res.status).toBe(200);
    expect(m.logger.error).toHaveBeenCalled();
    expect(JSON.stringify(m.logger.error.mock.calls)).not.toContain("nouvelle@example.test");
  });

  it.each([
    ["adresse invalide", { ...valid, email: "pas-un-mail" }],
    ["nom trop court", { ...valid, name: "A" }],
    ["mot de passe trop court", { ...valid, password: "Court1!" }],
    ["mot de passe courant", { ...valid, password: "motdepasse123" }],
    ["mot de passe = adresse e-mail", { ...valid, email: "unique.adresse@example.test", password: "unique.adresse@example.test" }],
    ["mot de passe trop long", { ...valid, password: "x".repeat(201) }],
  ])("%s : 400 sans aucune écriture", async (_label, body) => {
    const res = await signup(post("/api/auth/signup/email/", body));
    await flushAuthEmailTasks();
    expect(res.status).toBe(400);
    expect(m.startEmailSignup).not.toHaveBeenCalled();
    expect(m.sendEmail).not.toHaveBeenCalled();
  });

  it("le champ leurre rempli reçoit la réponse générique sans rien faire", async () => {
    const normal = await responseText(await signup(post("/api/auth/signup/email/", valid)));
    await flushAuthEmailTasks();
    m.startEmailSignup.mockClear();
    const decoy = await signup(post("/api/auth/signup/email/", { ...valid, hp: "http://spam" }));
    await flushAuthEmailTasks();
    expect(await responseText(decoy)).toBe(normal);
    expect(m.startEmailSignup).not.toHaveBeenCalled();
  });

  it("origine et JSON : 415 hors JSON, 403 inter-sites, 403 sans Origin ni Sec-Fetch-Site", async () => {
    expect((await signup(req("/api/auth/signup/email/", { method: "POST", headers: { ...postHeaders, "content-type": "text/plain" }, body: valid }))).status).toBe(415);
    expect((await signup(post("/api/auth/signup/email/", valid, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await signup(req("/api/auth/signup/email/", { method: "POST", headers: { "content-type": "application/json" }, body: valid }))).status).toBe(403);
    expect(m.startEmailSignup).not.toHaveBeenCalled();
  });

  it("limites de débit par IP ET par adresse hachée ; 429 sans écriture", async () => {
    m.consume.mockResolvedValueOnce({ allowed: false, retryAfterSec: 120 });
    const res = await signup(post("/api/auth/signup/email/", valid));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    const dims = (m.consume.mock.calls[0][0] as Array<{ key: string }>).map((d) => d.key);
    expect(dims.some((k) => k.startsWith("auth:signup-email:ip:"))).toBe(true);
    expect(dims.some((k) => k.startsWith("auth:signup-email:email:"))).toBe(true);
    expect(dims.join(" ")).not.toContain("example.test");
    await flushAuthEmailTasks();
    expect(m.startEmailSignup).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/signup/email/resend/", () => {
  it("même réponse que l'adresse ait une inscription ouverte, un compte ou rien ; renvoie un nouveau lien seulement si une inscription existe", async () => {
    const seen: string[] = [];
    for (const outcome of [{ kind: "created", token: "tok-2", name: "Ada" }, { kind: "none" }, { kind: "existing" }, { kind: "ignored" }]) {
      m.resendEmailSignup.mockResolvedValueOnce(outcome);
      seen.push(await responseText(await resend(post("/api/auth/signup/email/resend/", { email: "a@example.test" }))));
      await flushAuthEmailTasks();
    }
    expect(new Set(seen).size).toBe(1);
    // created + existing envoient un e-mail ; none et ignored aucun.
    expect(m.sendEmail).toHaveBeenCalledTimes(2);
    expect(m.sendEmail.mock.calls[0][0].text).toContain("/verify-email/?token=tok-2");
  });

  it("limites strictes par IP et par adresse ; 400 sur adresse invalide", async () => {
    expect((await resend(post("/api/auth/signup/email/resend/", { email: "nope" }))).status).toBe(400);
    m.consume.mockResolvedValueOnce({ allowed: false });
    expect((await resend(post("/api/auth/signup/email/resend/", { email: "a@example.test" }))).status).toBe(429);
    await flushAuthEmailTasks();
    expect(m.resendEmailSignup).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/signup/email/verify/", () => {
  it("jeton valide : pose __Host-rb_pending (HttpOnly, Secure, Lax), renvoie l'état vérifié, aucune organisation créée", async () => {
    m.verifyEmailSignup.mockResolvedValue({ kind: "verified", cookieToken: "cookie-token-123", email: "ada@example.test", name: "Ada" });
    const res = await verify(post("/api/auth/signup/email/verify/", { token: "tok" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, verified: true, email: "ada@example.test", redirect: "/professionnel/?email=1" });
    const cookie = res.cookies.get(pendingCookieName());
    expect(pendingCookieName()).toBe("__Host-rb_pending");
    expect(cookie).toMatchObject({ value: "cookie-token-123", httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(cookie?.maxAge).toBe(30 * 60);
    expect(res.cookies.get("rappel_session")).toBeUndefined();
    expect(m.completeEmailSignup).not.toHaveBeenCalled();
  });

  it("jeton inconnu, expiré ou déjà utilisé : même 400 TOKEN_INVALID, sans cookie", async () => {
    m.verifyEmailSignup.mockResolvedValue({ kind: "invalid" });
    const res = await verify(post("/api/auth/signup/email/verify/", { token: "tok" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "TOKEN_INVALID" });
    expect(res.cookies.get(pendingCookieName())).toBeUndefined();
    expect((await verify(post("/api/auth/signup/email/verify/", {}))).status).toBe(400);
    expect((await verify(post("/api/auth/signup/email/verify/", { token: "x".repeat(300) }))).status).toBe(400);
  });

  it("double clic : jeton déjà consommé mais cookie encore valable = même état vérifié, sans rien consommer", async () => {
    m.verifyEmailSignup.mockResolvedValue({ kind: "invalid" });
    m.getOpenEmailPending.mockResolvedValue({ name: "Ada", email: "ada@example.test" });
    const res = await verify(post("/api/auth/signup/email/verify/", { token: "tok" }, {}, { [pendingCookieName()]: "cookie-token-123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ verified: true, email: "ada@example.test" });
    expect(res.cookies.get(pendingCookieName())).toBeUndefined();
  });

  it("requête reçue sur le mauvais hôte (app.*) : 409 WRONG_HOST avec l'hôte à ouvrir, jeton non consommé", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.rappelbeauty.com");
    const res = await verify(
      req("/api/auth/signup/email/verify/", {
        method: "POST",
        url: "https://app.rappelbeauty.com",
        headers: { ...postHeaders, origin: "https://app.rappelbeauty.com" },
        body: { token: "tok" },
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data).toMatchObject({ code: "WRONG_HOST", host: "rappelbeauty.com", origin: "https://rappelbeauty.com" });
    expect(data.error).toContain("rappelbeauty.com");
    expect(m.verifyEmailSignup).not.toHaveBeenCalled();
  });

  it("limites de débit par IP et par jeton haché", async () => {
    m.consume.mockResolvedValueOnce({ allowed: false });
    expect((await verify(post("/api/auth/signup/email/verify/", { token: "tok" }))).status).toBe(429);
    const dims = (m.consume.mock.calls[0][0] as Array<{ key: string }>).map((d) => d.key);
    expect(dims.some((k) => k.includes(":token:"))).toBe(true);
    expect(dims.join(" ")).not.toContain("tok\"");
  });
});

describe("GET /api/auth/signup/email/pending/", () => {
  it("préremplit nom et e-mail quand le cookie désigne une inscription vérifiée ; 404 sinon", async () => {
    m.getOpenEmailPending.mockResolvedValueOnce({ name: "Ada", email: "ada@example.test" });
    const ok = await pendingGet(req("/api/auth/signup/email/pending/", { cookies: { [pendingCookieName()]: "c" } }));
    expect(await ok.json()).toEqual({ name: "Ada", email: "ada@example.test" });
    expect((await pendingGet(req("/api/auth/signup/email/pending/"))).status).toBe(404);
    m.getOpenEmailPending.mockResolvedValueOnce(null);
    expect((await pendingGet(req("/api/auth/signup/email/pending/", { cookies: { [pendingCookieName()]: "c" } }))).status).toBe(404);
  });
});

describe("POST /api/auth/signup/email/complete/", () => {
  const fields = { password: STRONG, institut: "Institut Ada", ville: "Casablanca", phone: "0612345678", localisation: "", website: "", hp: "" };
  let cookies: Record<string, string> = {};
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const open = { consumed: false, organizationId: null, expired: false, replayable: false };
  const createdResult = { kind: "created", organizationId: "org_1", userId: "u_1", email: "ada@example.test", firstName: "Ada", institut: "Institut Ada" };

  const multipart = (extra: Record<string, string | Blob> = {}) => {
    const form = new FormData();
    for (const [k, v] of Object.entries({ ...fields, ...extra })) form.set(k, v as string);
    return new NextRequest(`${ORIGIN}/api/auth/signup/email/complete/`, {
      method: "POST",
      headers: { origin: ORIGIN, "sec-fetch-site": "same-origin", cookie: `${pendingCookieName()}=cookie-token-123` },
      body: form,
    });
  };

  beforeEach(() => {
    // Nom évalué après vi.stubEnv("COOKIE_SECURE") : __Host-rb_pending.
    cookies = { [pendingCookieName()]: "cookie-token-123" };
    m.getEmailPendingState.mockResolvedValue(open);
    m.completeEmailSignup.mockResolvedValue(createdResult);
    m.loadAppSessionForUser.mockResolvedValue({ ...SESSION, sessionVersion: 0 });
  });

  it("parcours complet : organisation créée une fois, session émise, cookies pending effacé, aucune clé password dans la réponse", async () => {
    const res = await complete(post("/api/auth/signup/email/complete/", fields, {}, cookies));
    expect(res.status).toBe(200);
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/"(password|temporaryPassword|passwordHash|credentials|pin)"/i);
    expect(text).not.toContain(STRONG);
    expect(res.cookies.get("rappel_session")?.value).toBeTruthy();
    expect(res.cookies.get(pendingCookieName())?.maxAge).toBe(0);
    expect(m.completeEmailSignup).toHaveBeenCalledTimes(1);
    expect(m.completeEmailSignup.mock.calls[0][0]).toMatchObject({ token: "cookie-token-123", institut: "Institut Ada", phone: "0612345678" });
  });

  it("rejeu / double clic : la session est réémise sans second institut, sans logo ni e-mail de lead", async () => {
    m.completeEmailSignup.mockResolvedValue({ kind: "replay", organizationId: "org_1", userId: "u_1" });
    const res = await complete(multipart({ logo: new File([PNG], "logo.png", { type: "image/png" }) }));
    expect(res.status).toBe(200);
    expect(res.cookies.get("rappel_session")?.value).toBeTruthy();
    expect(m.storagePut).not.toHaveBeenCalled();
    expect(m.sendEmail).not.toHaveBeenCalled();
  });

  it("logo (multipart) : validé avant la création, stocké APRÈS, catégorie logos, échec toléré", async () => {
    m.storagePut.mockResolvedValue({ url: "/uploads/logos/org_1/logo.png" });
    const order: string[] = [];
    m.completeEmailSignup.mockImplementation(async () => (order.push("create"), createdResult));
    m.storagePut.mockImplementation(async () => (order.push("logo"), { url: "/uploads/logos/org_1/logo.png" }));
    const res = await complete(multipart({ logo: new File([PNG], "logo.png", { type: "image/png" }) }));
    expect(res.status).toBe(200);
    expect(order).toEqual(["create", "logo"]);
    expect(m.storagePut).toHaveBeenCalledWith(expect.objectContaining({ category: "logos", organizationId: "org_1", filename: "logo.png", contentType: "image/png" }));
    expect(m.setLogo).toHaveBeenCalledWith("org_1", "/uploads/logos/org_1/logo.png");

    m.storagePut.mockRejectedValueOnce(new Error("disk full"));
    const tolerated = await complete(multipart({ logo: new File([PNG], "logo.png", { type: "image/png" }) }));
    expect(tolerated.status).toBe(200);
  });

  it("logo invalide (type, octets magiques, taille) : 400 AVANT toute création", async () => {
    const wrongType = await complete(multipart({ logo: new File([PNG], "x.gif", { type: "image/gif" }) }));
    expect(wrongType.status).toBe(400);
    const wrongBytes = await complete(multipart({ logo: new File([new Uint8Array([1, 2, 3, 4])], "x.png", { type: "image/png" }) }));
    expect(wrongBytes.status).toBe(400);
    const big = await complete(multipart({ logo: new File([new Uint8Array(2 * 1024 * 1024 + 1)], "x.png", { type: "image/png" }) }));
    expect(big.status).toBe(400);
    expect(m.completeEmailSignup).not.toHaveBeenCalled();
  });

  it("mot de passe d'inscription incorrect : 403 PASSWORD_MISMATCH, aucune session ; mot de passe absent : 400", async () => {
    m.completeEmailSignup.mockResolvedValueOnce({ kind: "bad_password" });
    const res = await complete(post("/api/auth/signup/email/complete/", fields, {}, cookies));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "PASSWORD_MISMATCH" });
    expect(res.cookies.get("rappel_session")).toBeUndefined();
    const missing = await complete(post("/api/auth/signup/email/complete/", { ...fields, password: "" }, {}, cookies));
    expect(missing.status).toBe(400);
  });

  it("cookie absent, inconnu ou périmé : 400 PENDING_EXPIRED ; jamais de création ; cookie effacé", async () => {
    expect((await complete(post("/api/auth/signup/email/complete/", fields))).status).toBe(400);
    m.getEmailPendingState.mockResolvedValueOnce(null);
    const unknown = await complete(post("/api/auth/signup/email/complete/", fields, {}, cookies));
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toMatchObject({ code: "PENDING_EXPIRED" });
    m.getEmailPendingState.mockResolvedValueOnce({ ...open, expired: true });
    expect((await complete(post("/api/auth/signup/email/complete/", fields, {}, cookies))).status).toBe(400);
    expect(m.completeEmailSignup).not.toHaveBeenCalled();
  });

  it("champs invalides, leurre rempli : 400 sans création", async () => {
    for (const body of [{ ...fields, institut: "" }, { ...fields, phone: "12" }, { ...fields, ville: "Atlantide" }, { ...fields, hp: "x" }]) {
      expect((await complete(post("/api/auth/signup/email/complete/", body, {}, cookies))).status).toBe(400);
    }
    expect(m.completeEmailSignup).not.toHaveBeenCalled();
  });

  it("e-mail devenu indisponible ou téléphone pris : 409 génériques", async () => {
    m.completeEmailSignup.mockRejectedValueOnce(new m.PublicSignupErrorStub("EMAIL_TAKEN", "x"));
    const taken = await complete(post("/api/auth/signup/email/complete/", fields, {}, cookies));
    expect(taken.status).toBe(409);
    expect(await taken.json()).toMatchObject({ code: "NOT_AVAILABLE" });
    m.completeEmailSignup.mockRejectedValueOnce(new m.PublicSignupErrorStub("PHONE_TAKEN", "Ce numéro de téléphone possède déjà un compte."));
    expect((await complete(post("/api/auth/signup/email/complete/", fields, {}, cookies))).status).toBe(409);
  });

  it("limites de débit par IP et par inscription ; mauvais hôte : 409 WRONG_HOST", async () => {
    m.consume.mockResolvedValueOnce({ allowed: false });
    expect((await complete(post("/api/auth/signup/email/complete/", fields, {}, cookies))).status).toBe(429);
    expect(m.completeEmailSignup).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.rappelbeauty.com");
    const res = await complete(
      req("/api/auth/signup/email/complete/", { method: "POST", url: "https://app.rappelbeauty.com", headers: { ...postHeaders, origin: "https://app.rappelbeauty.com" }, body: fields, cookies }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("WRONG_HOST");
  });
});

describe("GET /api/auth/config/", () => {
  it("expose {googleEnabled, phoneLoginEnabled} sans secret, avec un cache court", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "off");
    vi.stubEnv("AUTH_GOOGLE_ENABLED", "false");
    const res = await authConfig();
    expect(await res.json()).toEqual({ googleEnabled: false, phoneLoginEnabled: false });
    expect(res.headers.get("cache-control")).toMatch(/max-age=60/);
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "");
    expect(await (await authConfig()).json()).toMatchObject({ phoneLoginEnabled: true });
  });
});

describe("sécuriser mon compte (utilisateur connecté)", () => {
  it("GET : l'état du compte, 401 sans compte", async () => {
    m.getAccountSecurity.mockResolvedValueOnce({ email: null, emailVerified: false, hasPassword: true, googleLinked: false, emailSetupRequired: true });
    const res = await accountGet(req("/api/auth/account-security/"));
    expect(await res.json()).toEqual({ email: null, emailVerified: false, hasPassword: true, googleLinked: false, emailSetupRequired: true });
    m.getAccountSecurity.mockResolvedValueOnce(null);
    expect((await accountGet(req("/api/auth/account-security/"))).status).toBe(401);
    m.requireAppSession.mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await accountGet(req("/api/auth/account-security/"))).status).toBe(401);
  });

  describe("POST email", () => {
    const body = { email: "Nouvelle@Example.test", password: "ancien-mot-de-passe" };
    beforeEach(() => {
      m.getLinkContext.mockResolvedValue({ passwordHash: "scrypt-placeholder", linked: false });
    });

    it("mot de passe actuel incorrect : 403, aucune demande", async () => {
      const res = await accountEmail(post("/api/auth/account-security/email/", body));
      expect(res.status).toBe(403);
      await flushAuthEmailTasks();
      expect(m.requestEmailChange).not.toHaveBeenCalled();
    });

    it("réponse générique identique : adresse libre, déjà prise, déjà vérifiée ; lien envoyé à la NOUVELLE adresse seulement", async () => {
      const { hashPassword } = await import("@/lib/auth/crypto");
      m.getLinkContext.mockResolvedValue({ passwordHash: hashPassword("ancien-mot-de-passe"), linked: false });
      const texts: string[] = [];
      for (const outcome of [{ kind: "created", token: "chg-tok", firstName: "Ada", sameAddress: false }, { kind: "unavailable" }, { kind: "noop" }]) {
        m.requestEmailChange.mockResolvedValueOnce(outcome);
        texts.push(await responseText(await accountEmail(post("/api/auth/account-security/email/", body))));
        await flushAuthEmailTasks();
      }
      expect(new Set(texts).size).toBe(1);
      expect(m.sendEmail).toHaveBeenCalledTimes(1);
      const mail = m.sendEmail.mock.calls[0][0];
      expect(mail.to).toBe("nouvelle@example.test");
      expect(mail.text).toContain("/verify-email/?token=chg-tok&type=change");
      expect(m.requestEmailChange).toHaveBeenCalledWith({ userId: "u_1", organizationId: "org_1", email: "nouvelle@example.test" });
    });

    it("compte sans mot de passe (Google) : authentification récente exigée, sinon 401 REAUTH_REQUIRED", async () => {
      m.getLinkContext.mockResolvedValue({ passwordHash: null, linked: true });
      m.requireAppSession.mockResolvedValueOnce({ ok: true, session: { ...SESSION, authAt: Math.floor(Date.now() / 1000) - 3600 } });
      const stale = await accountEmail(post("/api/auth/account-security/email/", { email: "a@example.test" }));
      expect(stale.status).toBe(401);
      expect(await stale.json()).toMatchObject({ code: "REAUTH_REQUIRED" });
      m.requireAppSession.mockResolvedValueOnce({ ok: true, session: { ...SESSION, authAt: undefined } });
      expect((await accountEmail(post("/api/auth/account-security/email/", { email: "a@example.test" }))).status).toBe(401);
      await flushAuthEmailTasks();
      expect(m.requestEmailChange).not.toHaveBeenCalled();
      m.requestEmailChange.mockResolvedValueOnce({ kind: "noop" });
      expect((await accountEmail(post("/api/auth/account-security/email/", { email: "a@example.test" }))).status).toBe(200);
    });

    it("limites par utilisateur, IP et adresse visée (hachée)", async () => {
      m.consume.mockResolvedValueOnce({ allowed: false });
      expect((await accountEmail(post("/api/auth/account-security/email/", body))).status).toBe(429);
      const dims = (m.consume.mock.calls[0][0] as Array<{ key: string }>).map((d) => d.key);
      expect(dims.filter((k) => k.startsWith("auth:acct-email:"))).toHaveLength(3);
      expect(dims.join(" ")).not.toContain("example.test");
    });
  });

  describe("POST password", () => {
    const body = { newPassword: STRONG };
    it("compte Google : session récente + e-mail vérifié = mot de passe défini, session courante ré-émise (jti et authAt conservés)", async () => {
      m.getLinkContext.mockResolvedValue({ passwordHash: null, linked: true });
      m.setInitialPassword.mockResolvedValue({ ...SESSION, sessionVersion: 4 });
      const res = await accountPassword(post("/api/auth/account-security/password/", body));
      expect(res.status).toBe(200);
      expect(JSON.stringify(await res.json())).not.toContain(STRONG);
      const cookie = res.cookies.get("rappel_session");
      expect(cookie?.value).toBeTruthy();
      const { parseSessionToken } = await import("@/lib/auth/session");
      expect(parseSessionToken(cookie?.value as string)).toMatchObject({ jti: SESSION.jti, authAt: SESSION.authAt, sessionVersion: 4 });
      expect(m.changeOwnPassword).not.toHaveBeenCalled();
    });

    it("compte Google sans authentification récente : 401 REAUTH_REQUIRED, rien n'est écrit", async () => {
      m.getLinkContext.mockResolvedValue({ passwordHash: null, linked: true });
      m.requireAppSession.mockResolvedValueOnce({ ok: true, session: { ...SESSION, authAt: Math.floor(Date.now() / 1000) - 11 * 60 } });
      const res = await accountPassword(post("/api/auth/account-security/password/", body));
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ code: "REAUTH_REQUIRED" });
      expect(m.setInitialPassword).not.toHaveBeenCalled();
    });

    it("e-mail non vérifié : 403 EMAIL_NOT_VERIFIED ; mot de passe déjà défini en concurrence : 409", async () => {
      m.getLinkContext.mockResolvedValue({ passwordHash: null, linked: true });
      m.setInitialPassword.mockRejectedValueOnce(new Error("EMAIL_NOT_VERIFIED"));
      const unverified = await accountPassword(post("/api/auth/account-security/password/", body));
      expect(unverified.status).toBe(403);
      expect(await unverified.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
      m.setInitialPassword.mockRejectedValueOnce(new Error("PASSWORD_ALREADY_SET"));
      expect((await accountPassword(post("/api/auth/account-security/password/", body))).status).toBe(409);
    });

    it("compte avec mot de passe : changement via changeOwnPassword (mot de passe actuel exigé, autres sessions révoquées)", async () => {
      m.getLinkContext.mockResolvedValue({ passwordHash: "x", linked: false });
      m.changeOwnPassword.mockResolvedValue({ ...SESSION, sessionVersion: 4 });
      const res = await accountPassword(post("/api/auth/account-security/password/", { newPassword: STRONG, currentPassword: "ancien" }));
      expect(res.status).toBe(200);
      expect(m.changeOwnPassword).toHaveBeenCalledWith({ userId: "u_1", organizationId: "org_1", newPassword: STRONG, currentPassword: "ancien" });
      m.changeOwnPassword.mockRejectedValueOnce(new Error("CURRENT_PASSWORD_INVALID"));
      expect((await accountPassword(post("/api/auth/account-security/password/", { newPassword: STRONG, currentPassword: "faux" }))).status).toBe(400);
    });

    it("politique : trop court, courant, égal à l'e-mail du compte = 400 avant tout accès base", async () => {
      for (const newPassword of ["Court1!", "motdepasse123", "owner@example.test"]) {
        expect((await accountPassword(post("/api/auth/account-security/password/", { newPassword }))).status).toBe(400);
      }
      expect(m.getLinkContext).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/email/verify-change/ (public)", () => {
    it("lien valide : adresse confirmée, aucun cookie posé ni session touchée", async () => {
      m.verifyEmailChange.mockResolvedValue({ kind: "verified", email: "nouvelle@example.test", changed: true });
      const res = await verifyChange(post("/api/auth/email/verify-change/", { token: "tok" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, verified: true, email: "nouvelle@example.test" });
      expect(res.headers.get("set-cookie")).toBeNull();
    });
    it("jeton inconnu, expiré, utilisé ou adresse reprise : 400 TOKEN_INVALID identique", async () => {
      m.verifyEmailChange.mockResolvedValue({ kind: "invalid" });
      const res = await verifyChange(post("/api/auth/email/verify-change/", { token: "tok" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "TOKEN_INVALID" });
      expect((await verifyChange(post("/api/auth/email/verify-change/", {}))).status).toBe(400);
    });
  });
});

describe("politique de mot de passe et authentification récente", () => {
  it("refuse court, courant, motifs triviaux et l'adresse e-mail ; accepte un secret raisonnable", () => {
    expect(checkPasswordPolicy("abc")).toBe("PASSWORD_TOO_SHORT");
    expect(checkPasswordPolicy("x".repeat(201))).toBe("PASSWORD_TOO_LONG");
    for (const weak of ["Motdepasse123", "AZERTYUIOP", "1234567890", "aaaaaaaaaaaa", "abababababab", "Password-123"]) {
      expect(checkPasswordPolicy(weak), weak).toBe("PASSWORD_TOO_COMMON");
    }
    expect(checkPasswordPolicy("jeanne.dupont@example.com", { email: "Jeanne.Dupont@example.com" })).toBe("PASSWORD_SAME_AS_EMAIL");
    expect(checkPasswordPolicy("jeannedupont-2026", { email: "jeannedupont@example.com" })).toBeNull();
    expect(checkPasswordPolicy(STRONG)).toBeNull();
  });

  it("authAt : récent moins de 10 minutes seulement ; absent ou futur lointain refusé", () => {
    const now = 1_800_000_000;
    expect(isRecentlyAuthenticated(now - 599, now)).toBe(true);
    expect(isRecentlyAuthenticated(now - 600, now)).toBe(false);
    expect(isRecentlyAuthenticated(undefined, now)).toBe(false);
    expect(isRecentlyAuthenticated(now + 3600, now)).toBe(false);
  });

  it("reconnaît l'index d'unicité global et l'index historique, jamais une autre contrainte", () => {
    expect(isUserEmailUniqueViolation({ code: "23505", constraint: "User_email_lower_unique" })).toBe(true);
    expect(isUserEmailUniqueViolation({ code: "23505", constraint: "User_organizationId_email_key" })).toBe(true);
    expect(isUserEmailUniqueViolation({ code: "23505", constraint: "User_loginPhone_key" })).toBe(false);
    expect(isUserEmailUniqueViolation({ code: "23503", constraint: "User_email_lower_unique" })).toBe(false);
    expect(isUserEmailUniqueViolation(null)).toBe(false);
  });
});
