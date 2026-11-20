import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp, proxyIpHeadersTrusted } from "@/lib/http/client-ip";
import { checkAuthPostOrigin } from "@/lib/http/json-same-origin";
import { maskEmail, scrubEmails } from "@/lib/email/send";

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const get = (headers: Record<string, string>) => new Request("http://localhost/api/x", { headers });

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ORIGIN_SECRET", "");
  vi.stubEnv("TRUST_PROXY_IP_HEADERS", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("IP client : confiance dans les en-têtes de l'infrastructure", () => {
  it("origine protégée (ORIGIN_SECRET) : CF-Connecting-IP n'est cru qu'avec la preuve d'origine valide", () => {
    vi.stubEnv("ORIGIN_SECRET", "secret-origine-0123456789");
    const forged = get({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 10.0.0.1" });
    expect(proxyIpHeadersTrusted(forged.headers)).toBe(false);
    // repli sûr : dernier saut de X-Forwarded-For (posé par le proxy le plus proche), jamais l'en-tête forgé
    expect(getClientIp(forged)).toBe("10.0.0.1");
    expect(getClientIp(get({ "cf-connecting-ip": "1.2.3.4" }))).toBe("unknown");
    expect(getClientIp(get({ "cf-connecting-ip": "1.2.3.4", "x-rappel-origin": "faux" }))).toBe("unknown");

    const proven = get({ "cf-connecting-ip": "1.2.3.4", "x-rappel-origin": "secret-origine-0123456789" });
    expect(proxyIpHeadersTrusted(proven.headers)).toBe(true);
    expect(getClientIp(proven)).toBe("1.2.3.4");
  });

  it("origine non protégée (pas d'ORIGIN_SECRET) : comportement historique conservé", () => {
    expect(getClientIp(get({ "cf-connecting-ip": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(getClientIp(get({ "true-client-ip": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(getClientIp(get({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(getClientIp(get({}))).toBe("unknown");
  });

  it("TRUST_PROXY_IP_HEADERS force la confiance ou le repli", () => {
    vi.stubEnv("ORIGIN_SECRET", "secret-origine-0123456789");
    vi.stubEnv("TRUST_PROXY_IP_HEADERS", "true");
    expect(getClientIp(get({ "cf-connecting-ip": "1.2.3.4" }))).toBe("1.2.3.4");
    vi.stubEnv("ORIGIN_SECRET", "");
    vi.stubEnv("TRUST_PROXY_IP_HEADERS", "false");
    expect(getClientIp(get({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "7.7.7.7" }))).toBe("7.7.7.7");
  });

  it("développement local et tests : en-têtes crus même avec ORIGIN_SECRET (rien n'est exposé)", () => {
    vi.stubEnv("ORIGIN_SECRET", "secret-origine-0123456789");
    for (const env of ["development", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      expect(getClientIp(get({ "cf-connecting-ip": "1.2.3.4" }))).toBe("1.2.3.4");
    }
  });

  it("valeurs invalides ignorées", () => {
    expect(getClientIp(get({ "cf-connecting-ip": "<script>" }))).toBe("unknown");
    vi.stubEnv("TRUST_PROXY_IP_HEADERS", "false");
    expect(getClientIp(get({ "x-forwarded-for": "ok, pas une ip!" }))).toBe("unknown");
  });
});

describe("contrôle CSRF des POST d'authentification", () => {
  const post = (headers: Record<string, string>, url = "http://localhost:3000/api/auth/login") =>
    new NextRequest(url, { method: "POST", headers });
  const json = { "content-type": "application/json" };

  it("JSON obligatoire (sauf si requireJson=false)", () => {
    expect(checkAuthPostOrigin(post({}))?.status).toBe(415);
    expect(checkAuthPostOrigin(post({ "content-type": "application/x-www-form-urlencoded" }))?.status).toBe(415);
    expect(checkAuthPostOrigin(post({ "content-type": "application/json; charset=utf-8" }))).toBeNull();
    expect(checkAuthPostOrigin(post({}), { requireJson: false })).toBeNull();
  });

  it("clients sans Origin ni Sec-Fetch-Site (tests d'intégration, e2e) : acceptés", () => {
    expect(checkAuthPostOrigin(post(json))).toBeNull();
  });

  it("Sec-Fetch-Site doit valoir same-origin quand il est présent", () => {
    for (const site of ["cross-site", "same-site", "none"]) {
      expect(checkAuthPostOrigin(post({ ...json, "sec-fetch-site": site }))?.status).toBe(403);
    }
    expect(checkAuthPostOrigin(post({ ...json, "sec-fetch-site": "same-origin" }))).toBeNull();
  });

  it("Sec-Fetch-Site: same-origin décide : jamais de faux refus si Origin ne correspond pas aux hôtes reconstruits derrière le proxy", () => {
    const behindProxy = post(
      { ...json, "sec-fetch-site": "same-origin", origin: "https://app.rappelbeauty.com" },
      "http://10.0.0.5:8080/api/auth/login", // hôte interne, aucun en-tête x-forwarded-*
    );
    expect(checkAuthPostOrigin(behindProxy)).toBeNull();
    // sans Sec-Fetch-Site, le même Origin non reconstructible est refusé (comparaison exacte en repli)
    const legacyBrowser = post({ ...json, origin: "https://app.rappelbeauty.com" }, "http://10.0.0.5:8080/api/auth/login");
    expect(checkAuthPostOrigin(legacyBrowser)?.status).toBe(403);
    // et une valeur autre que same-origin est refusée même avec un Origin concordant
    expect(checkAuthPostOrigin(post({ ...json, "sec-fetch-site": "cross-site", origin: "http://localhost:3000" }))?.status).toBe(403);
  });

  it("Origin doit être EXACTEMENT l'origine (schéma, hôte, port), y compris derrière un proxy", () => {
    expect(checkAuthPostOrigin(post({ ...json, origin: "http://localhost:3000" }))).toBeNull();
    for (const origin of ["http://localhost:3001", "https://localhost:3000", "http://evil.example", "null", "pas une url"]) {
      expect(checkAuthPostOrigin(post({ ...json, origin }))?.status).toBe(403);
    }
    const proxied = post(
      { ...json, origin: "https://app.rappelbeauty.com", "x-forwarded-host": "app.rappelbeauty.com", "x-forwarded-proto": "https" },
      "http://localhost:8080/api/auth/login",
    );
    expect(checkAuthPostOrigin(proxied)).toBeNull();
    const wrongHost = post(
      { ...json, origin: "https://evil.example", "x-forwarded-host": "app.rappelbeauty.com", "x-forwarded-proto": "https" },
      "http://localhost:8080/api/auth/login",
    );
    expect(checkAuthPostOrigin(wrongHost)?.status).toBe(403);
  });
});

describe("journaux e-mail sans destinataire en clair", () => {
  it("maskEmail ne laisse ni le nom ni le domaine", () => {
    expect(maskEmail("sara.benani@example.com")).toBe("s***@e***.com");
    expect(maskEmail("a@b.co")).toBe("a***@b***.co");
    expect(maskEmail("sans-arobase")).toBe("***");
    expect(maskEmail("sara.benani@example.com")).not.toContain("benani");
  });

  it("scrubEmails retire toute adresse d'un message du fournisseur", () => {
    const out = scrubEmails('{"message":"The to address sara.benani@example.com is invalid, cc x@y.org"}');
    expect(out).not.toContain("@");
    expect(out).toContain("[email]");
  });
});
