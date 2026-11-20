import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Suites de la revue de sécurité de l'authentification : corps lus en flux avec plafond, contrôles avant lecture
 * du corps, forme d'e-mail, salutation d'e-mail, chemin de redirection, politique de mot de passe à l'activation,
 * écrivains PlatformUser alignés sur l'unicité globale. Doubles uniquement : aucune base, aucun envoi.
 */
const m = vi.hoisted(() => ({
  consume: vi.fn(),
  activate: vi.fn(),
  getPending: vi.fn(),
  complete: vi.fn(),
  poolQuery: vi.fn(),
  clientQuery: vi.fn(),
  sql: [] as string[],
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h, tenantRoute: <T,>(h: T) => h }));
vi.mock("@/lib/logger", () => ({ logger: m.logger }));
vi.mock("@/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/rate-limit")>()),
  consumeDimensions: (...args: unknown[]) => m.consume(...args),
}));
vi.mock("@/lib/db/activation", () => ({ activateAccount: m.activate, issuePasswordResetToken: vi.fn() }));
vi.mock("@/lib/db/email-signup", () => ({ getEmailPendingState: m.getPending, completeEmailSignup: m.complete }));
vi.mock("@/lib/db/institute-create", () => ({ PublicSignupError: class extends Error {} }));
vi.mock("@/lib/db/auth-identities", () => ({ loadAppSessionForUser: vi.fn() }));
vi.mock("@/lib/db/users", () => ({ MAX_PASSWORD_LENGTH: 200 }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/pool", () => ({
  pool: {
    query: (...a: unknown[]) => m.poolQuery(...a),
    connect: async () => ({
      query: async (sql: string, params?: unknown[]) => {
        m.sql.push(String(sql));
        return m.clientQuery(String(sql), params);
      },
      release: () => undefined,
    }),
  },
}));

import { POST as activate } from "@/app/api/auth/activate/route";
import { POST as complete } from "@/app/api/auth/signup/email/complete/route";
import { parseEmailInput, readBodyBytesCapped, readJsonObject } from "@/lib/auth/auth-route-utils";
import { readSignupRequest, SIGNUP_BODY_MAX_BYTES } from "@/lib/auth/signup-form";
import { signupVerificationEmail } from "@/lib/email/auth-emails";
import { safeInternalPath } from "@/components/auth/auth-ui";
import { createPlatformAdmin } from "@/lib/db/admin-users";
import { updatePlatformProfile } from "@/lib/db/platform-settings";
import { pendingCookieName } from "@/lib/auth/google-http";

const ORIGIN = "http://localhost:3000";
const SAME = { origin: ORIGIN, "sec-fetch-site": "same-origin" };

/** Flux de `count` blocs de `size` octets SANS Content-Length ; `pulled` compte les blocs réellement lus. */
function chunkedStream(count: number, size: number) {
  const state = { pulled: 0 };
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i++ >= count) return controller.close();
      state.pulled++;
      controller.enqueue(new Uint8Array(size).fill(97));
    },
  });
  return { stream, state };
}
const streamRequest = (path: string, stream: ReadableStream<Uint8Array>, headers: Record<string, string>) =>
  new NextRequest(`${ORIGIN}${path}`, { method: "POST", headers, body: stream, duplex: "half" } as RequestInit);

beforeEach(() => {
  vi.clearAllMocks();
  m.sql.length = 0;
  m.consume.mockResolvedValue({ allowed: true });
  m.clientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  vi.stubEnv("COOKIE_SECURE", "false");
});

describe("lecture bornée du corps (N2)", () => {
  it("un flux sans Content-Length est interrompu dès le plafond, pas lu en entier", async () => {
    const { stream, state } = chunkedStream(1000, 1024);
    const bytes = await readBodyBytesCapped(streamRequest("/x", stream, { "content-type": "application/json" }), 4 * 1024);
    expect(bytes).toBeNull();
    expect(state.pulled).toBeLessThan(20);
  });

  it("JSON : Content-Length excessif refusé sans lecture ; corps valide accepté", async () => {
    const big = new NextRequest(`${ORIGIN}/x`, { method: "POST", headers: { "content-length": "999999" }, body: "{}" });
    expect(await readJsonObject(big)).toBeNull();
    expect(big.bodyUsed).toBe(false);
    const ok = new NextRequest(`${ORIGIN}/x`, { method: "POST", body: JSON.stringify({ a: "é" }) });
    expect(await readJsonObject(ok)).toEqual({ a: "é" });
  });

  it("inscription JSON en flux trop volumineux : refus 400 sans tout lire", async () => {
    const { stream, state } = chunkedStream(1000, 1024);
    const res = await readSignupRequest(streamRequest("/x", stream, { "content-type": "application/json" }));
    expect(res).toMatchObject({ ok: false, status: 400 });
    expect(state.pulled).toBeLessThan((SIGNUP_BODY_MAX_BYTES / 1024) * 2 + 4);
  });

  it("multipart sans Content-Length valide : 411 ; Content-Length excessif : 413 ; octets réels excessifs : 413", async () => {
    const ct = "multipart/form-data; boundary=zzz";
    const none = await readSignupRequest(streamRequest("/x", chunkedStream(2, 10).stream, { "content-type": ct }));
    expect(none).toMatchObject({ ok: false, status: 411 });
    const junk = await readSignupRequest(streamRequest("/x", chunkedStream(2, 10).stream, { "content-type": ct, "content-length": "abc" }));
    expect(junk).toMatchObject({ ok: false, status: 411 });
    const declared = await readSignupRequest(streamRequest("/x", chunkedStream(2, 10).stream, { "content-type": ct, "content-length": String(5 * 1024 * 1024) }));
    expect(declared).toMatchObject({ ok: false, status: 413 });
    // Content-Length menteur (petit) mais flux réel énorme.
    const lying = chunkedStream(200, 32 * 1024);
    const real = await readSignupRequest(streamRequest("/x", lying.stream, { "content-type": ct, "content-length": "100" }));
    expect(real).toMatchObject({ ok: false, status: 413 });
    expect(lying.state.pulled).toBeLessThan(80);
  });

  it("multipart valide avec Content-Length : champs et logo lus", async () => {
    const form = new FormData();
    form.set("institut", "Institut");
    form.set("logo", new File([new Uint8Array([1, 2, 3])], "l.png", { type: "image/png" }));
    const encoded = new Response(form);
    const buf = new Uint8Array(await encoded.arrayBuffer());
    const req = new NextRequest(`${ORIGIN}/x`, {
      method: "POST",
      headers: { "content-type": encoded.headers.get("content-type") as string, "content-length": String(buf.length) },
      body: buf,
    });
    const res = await readSignupRequest(req);
    expect(res).toMatchObject({ ok: true, fields: { institut: "Institut" } });
    expect(res.ok && res.logoFile?.size).toBe(3);
  });

  it("complete : cookie absent -> 400 sans lire le corps ni consommer le quota", async () => {
    const req = new NextRequest(`${ORIGIN}/api/auth/signup/email/complete/`, {
      method: "POST",
      headers: { ...SAME, "content-type": "application/json" },
      body: JSON.stringify({ password: "x" }),
    });
    const res = await complete(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "PENDING_EXPIRED" });
    expect(req.bodyUsed).toBe(false);
    expect(m.consume).not.toHaveBeenCalled();
  });

  it("complete : quota IP épuisé -> 429 sans lire le corps ni interroger l'inscription", async () => {
    m.consume.mockResolvedValue({ allowed: false, retryAfterSec: 42 });
    const req = new NextRequest(`${ORIGIN}/api/auth/signup/email/complete/`, {
      method: "POST",
      headers: { ...SAME, "content-type": "application/json", cookie: `${pendingCookieName()}=tok` },
      body: JSON.stringify({ password: "x" }),
    });
    const res = await complete(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(req.bodyUsed).toBe(false);
    expect(m.getPending).not.toHaveBeenCalled();
  });
});

describe("forme d'e-mail (L2)", () => {
  it("refuse virgule, point-virgule, chevrons, guillemets, parenthèses, crochets, antislash et espaces", () => {
    for (const bad of ["a,b@x.com", "a;b@x.com", "<a>@x.com", '"a"@x.com', "a(b)@x.com", "a[b]@x.com", "a\\b@x.com", "a b@x.com", "a@x,y.com", "a@x.com,b@y.com", "a@[1.2.3.4].fr", "a@x.c(m", "a@@x.com"]) {
      expect(parseEmailInput(bad), bad).toBeNull();
    }
  });
  it("garde les adresses courantes (+ . - _, sous-domaines, IDN en ASCII)", () => {
    expect(parseEmailInput(" Jean.Dupont+rb@Sub.Example.fr ")).toBe("jean.dupont+rb@sub.example.fr");
    expect(parseEmailInput("a_b-c@xn--exmple-cua.fr")).toBe("a_b-c@xn--exmple-cua.fr");
  });
});

describe("salutation des e-mails (N5)", () => {
  const text = (name: string) => signupVerificationEmail({ name, link: "https://app.example.test/v" }).text + signupVerificationEmail({ name, link: "https://app.example.test/v" }).html;
  it("reprend un prénom fait de lettres, apostrophes et traits d'union", () => {
    expect(text("Anne-Marie Dupont")).toContain("Bonjour Anne-Marie,");
    expect(text("Zoë Martin")).toContain("Bonjour Zoë,");
    expect(text("D'Artagnan")).toContain("Bonjour D'Artagnan,");
  });
  it("sinon « Bonjour, » : jamais de balise, d'URL ni de chiffre du nom saisi", () => {
    for (const bad of ["<img/src=x>", "Ada<script>", "http://evil.test", "Ada123", "a&b", ""]) {
      const out = text(bad);
      expect(out, bad).toContain("Bonjour,");
      expect(out, bad).not.toContain(`Bonjour ${bad.split(/\s+/)[0]}`);
    }
  });
});

describe("safeInternalPath (N8)", () => {
  it("refuse //, /\\, antislash et schémas ; garde les chemins internes", () => {
    for (const bad of ["//evil.test", "/\\evil.test", "/a\\b", "https://evil.test", "javascript:alert(1)", "/%2f/evil.test", "/api/auth/logout", ""]) {
      expect(safeInternalPath(bad, "/fallback"), bad).toBe("/fallback");
    }
    expect(safeInternalPath("/dashboard/?__host=app&auth=1", "/fallback")).toBe("/dashboard/?__host=app&auth=1");
    expect(safeInternalPath(undefined, "/fallback")).toBe("/fallback");
  });
});

describe("POST /api/auth/activate : politique des nouveaux mots de passe (N6)", () => {
  const call = (password: string) =>
    activate(new NextRequest(`${ORIGIN}/api/auth/activate/`, { method: "POST", headers: { ...SAME, "content-type": "application/json" }, body: JSON.stringify({ token: "t".repeat(64), password }) }));

  it("refuse trop court (9), trop courant et motif trivial avec un code stable ; n'active rien", async () => {
    const short = await call("Abcdef-12");
    expect(short.status).toBe(400);
    expect(await short.json()).toMatchObject({ code: "PASSWORD_TOO_SHORT" });
    expect(await (await call("motdepasse1")).json()).toMatchObject({ code: "PASSWORD_TOO_COMMON" });
    expect(await (await call("aaaaaaaaaaaa")).json()).toMatchObject({ code: "PASSWORD_TOO_COMMON" });
    expect(m.activate).not.toHaveBeenCalled();
  });

  it("accepte un mot de passe conforme", async () => {
    m.activate.mockResolvedValue({ email: "u@example.test" });
    const res = await call("Un-bon-secret-9371!");
    expect(res.status).toBe(200);
    expect(m.activate).toHaveBeenCalledWith("t".repeat(64), "Un-bon-secret-9371!");
  });
});

describe("écrivains PlatformUser et unicité globale d'e-mail (N3)", () => {
  const actor = { id: "pu_1", firstName: "Root", lastName: "Admin" } as never;

  /** Simule emailOwner : `owner` = "user" | "platform" | "free". */
  function owners(owner: "user" | "platform" | "free") {
    m.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "User" WHERE LOWER(BTRIM(email))')) return { rows: owner === "user" ? [{}] : [], rowCount: owner === "user" ? 1 : 0 };
      if (sql.includes('FROM "PlatformUser" WHERE LOWER(BTRIM(email))')) return { rows: owner === "platform" ? [{}] : [], rowCount: owner === "platform" ? 1 : 0 };
      return { rows: [], rowCount: 1 };
    });
  }

  it("createPlatformAdmin : verrou d'adresse AVANT le contrôle, e-mail d'institut ou de plateforme -> EMAIL_TAKEN sans INSERT, ROLLBACK", async () => {
    for (const owner of ["user", "platform"] as const) {
      m.sql.length = 0;
      owners(owner);
      await expect(createPlatformAdmin(actor, { email: " Admin@Example.test ", password: "motdepasse-long", firstName: "A", lastName: "B" })).rejects.toThrow("EMAIL_TAKEN");
      expect(m.sql.some((s) => s.includes("INSERT INTO"))).toBe(false);
      expect(m.sql.at(-1)).toBe("ROLLBACK");
      expect(m.sql.findIndex((s) => s.includes("pg_advisory_xact_lock"))).toBeLessThan(m.sql.findIndex((s) => s.includes('FROM "User"')));
    }
  });

  it("createPlatformAdmin : adresse libre -> INSERT + COMMIT dans la même transaction", async () => {
    owners("free");
    const created = await createPlatformAdmin(actor, { email: "new@example.test", password: "motdepasse-long", firstName: "A", lastName: "B" });
    expect(created.email).toBe("new@example.test");
    expect(m.sql[0]).toBe("BEGIN");
    expect(m.sql.some((s) => s.includes('INSERT INTO "PlatformUser"'))).toBe(true);
    expect(m.sql.at(-1)).toBe("COMMIT");
  });

  const profileRow = { id: "pu_1", email: "me@example.test", firstName: "Me", lastName: "Self", phone: null, locale: "fr", timezone: "Africa/Casablanca", role: "SUPER_ADMIN" };

  it("updatePlatformProfile : nouvelle adresse déjà utilisée par un institut -> EMAIL_TAKEN, aucune mise à jour", async () => {
    m.poolQuery.mockResolvedValue({ rows: [profileRow] });
    owners("user");
    await expect(updatePlatformProfile({ id: "pu_1", email: "Taken@Example.test", platformUserName: "Me" })).rejects.toThrow("EMAIL_TAKEN");
    expect(m.sql.some((s) => s.includes("UPDATE"))).toBe(false);
    expect(m.sql.at(-1)).toBe("ROLLBACK");
    expect(m.sql.some((s) => s.includes("pg_advisory_xact_lock"))).toBe(true);
  });

  it("updatePlatformProfile : adresse inchangée -> pas de contrôle d'unicité ; adresse libre -> mise à jour validée", async () => {
    m.poolQuery.mockResolvedValue({ rows: [profileRow] });
    owners("platform"); // son propre e-mail ne doit pas être traité comme pris
    await updatePlatformProfile({ id: "pu_1", firstName: "Nouveau", platformUserName: "Me" });
    expect(m.sql.some((s) => s.includes("pg_advisory_xact_lock"))).toBe(false);
    expect(m.sql.some((s) => s.includes("UPDATE"))).toBe(true);
    m.sql.length = 0;
    owners("free");
    await updatePlatformProfile({ id: "pu_1", email: "other@example.test", platformUserName: "Me" });
    expect(m.sql.some((s) => s.includes("pg_advisory_xact_lock"))).toBe(true);
    expect(m.sql.at(-1)).toBe("COMMIT");
  });
});
