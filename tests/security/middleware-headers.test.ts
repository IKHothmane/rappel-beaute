import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSessionCookie } from "@/lib/auth/session";
import { COOKIE_HOST } from "@/lib/domain";

/**
 * En-têtes posés par le middleware : la politique CSP complète (et non plus seulement frame-ancestors) sur les
 * pages, redirections et API ; le cadre de l'assistant public garde une politique sans frame-ancestors (la route
 * ajoute ses domaines) ; le cookie __rappel_host est Secure en HTTPS seulement.
 */
beforeEach(() => vi.stubEnv("ORIGIN_SECRET", ""));
afterEach(() => vi.unstubAllEnvs());

function get(url: string, headers: Record<string, string> = {}) {
  const host = new URL(url).host;
  return middleware(new NextRequest(url, { headers: { host, ...headers } }));
}

function directives(csp: string | null): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of (csp ?? "").split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) map.set(name, values.join(" "));
  }
  return map;
}

function appSessionCookie() {
  const session = createSessionCookie({
    id: "u_1", email: "a@example.test", firstName: "A", lastName: "B", role: "OWNER", organizationId: "org_1",
    orgName: "I", orgSlug: "i", orgLogoUrl: null, scope: "app", accountType: "ORGANIZATION", mustChangePassword: false, sessionVersion: 0,
  } as never);
  return `${session.name}=${session.value}`;
}

function expectFullPolicy(res: Response) {
  const csp = directives(res.headers.get("content-security-policy"));
  expect(csp.get("default-src")).toBe("'self'");
  expect(csp.get("object-src")).toBe("'none'");
  expect(csp.get("base-uri")).toBe("'self'");
  expect(csp.get("form-action")).toBe("'self'");
  expect(csp.get("frame-ancestors")).toBe("'none'");
  expect(csp.get("script-src")).toContain("https://www.googletagmanager.com");
  expect(csp.get("script-src")).not.toContain("nonce-");
  expect(res.headers.get("x-frame-options")).toBe("DENY");
}

describe("Content-Security-Policy complète", () => {
  it("page vitrine", async () => {
    expectFullPolicy(await get("https://rappelbeauty.com/"));
  });

  it("page de l'espace institut (rewrite)", async () => {
    const res = await get("https://app.rappelbeauty.com/dashboard/", { cookie: appSessionCookie() });
    expect(res.headers.get("x-middleware-rewrite")).toContain("/domains/app/dashboard/");
    expectFullPolicy(res);
  });

  it("redirection vers la connexion", async () => {
    const res = await get("https://app.rappelbeauty.com/customers/");
    expect(res.status).toBe(307);
    expectFullPolicy(res);
  });

  it("espace admin", async () => {
    expectFullPolicy(await get("https://admin.rappelbeauty.com/login/"));
  });

  it("API et pages /assistant", async () => {
    expectFullPolicy(await get("https://app.rappelbeauty.com/api/customers/"));
    expectFullPolicy(await get("https://rappelbeauty.com/assistant/"));
  });

  it("cadre de l'assistant public : même politique sans frame-ancestors ni X-Frame-Options", async () => {
    for (const path of ["/api/public/assistant/frame/?publicId=pub_x", "/api/public/assistant/frame?publicId=pub_x"]) {
      const res = await get(`https://rappelbeauty.com${path}`);
      expect(res.headers.get("x-middleware-next")).toBe("1");
      const csp = directives(res.headers.get("content-security-policy"));
      expect(csp.get("object-src")).toBe("'none'");
      expect(csp.get("base-uri")).toBe("'self'");
      expect(csp.has("frame-ancestors")).toBe(false);
      expect(res.headers.get("x-frame-options")).toBeNull();
    }
  });

  it("les autres routes de l'assistant restent non encadrables", async () => {
    expectFullPolicy(await get("https://rappelbeauty.com/api/public/assistant/session/"));
  });
});

describe("cookie __rappel_host", () => {
  it("HTTPS : Secure", async () => {
    const www = await get("https://rappelbeauty.com/");
    expect(www.cookies.get(COOKIE_HOST)).toMatchObject({ value: "www", secure: true });
    const app = await get("https://app.rappelbeauty.com/dashboard/", { cookie: appSessionCookie() });
    expect(app.cookies.get(COOKIE_HOST)).toMatchObject({ value: "app", secure: true });
    const admin = await get("https://admin.rappelbeauty.com/login/");
    expect(admin.cookies.get(COOKIE_HOST)).toMatchObject({ value: "admin", secure: true });
  });

  it("HTTP derrière un proxy HTTPS (x-forwarded-proto) : Secure", async () => {
    const res = await get("http://rappelbeauty.com/", { "x-forwarded-proto": "https" });
    expect(res.cookies.get(COOKIE_HOST)?.secure).toBe(true);
  });

  it("HTTP local : pas de Secure (sinon le navigateur l'ignorerait)", async () => {
    const www = await get("http://127.0.0.1:3000/");
    expect(www.cookies.get(COOKIE_HOST)).toMatchObject({ value: "www" });
    expect(www.cookies.get(COOKIE_HOST)?.secure).toBeFalsy();
    const app = await get("http://127.0.0.1:3000/dashboard/?__host=app", { cookie: appSessionCookie() });
    expect(app.cookies.get(COOKIE_HOST)).toMatchObject({ value: "app" });
    expect(app.cookies.get(COOKIE_HOST)?.secure).toBeFalsy();
  });
});
