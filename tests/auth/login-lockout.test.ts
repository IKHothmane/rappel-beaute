import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Verrouillage ciblé, avec le VRAI limiteur (repli mémoire) : une seule IP ne peut pas bloquer le propriétaire d'un
 * compte. Les limites « sensibles » du repli mémoire sont divisées par 3 (voir rate-limit/index.ts).
 */
const m = vi.hoisted(() => ({ authenticateUser: vi.fn(), authenticatePlatformUser: vi.fn() }));

vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T,>(h: T) => h }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock("@/lib/db/users", () => ({ authenticateUser: m.authenticateUser }));
vi.mock("@/lib/db/platform-users", () => ({ authenticatePlatformUser: m.authenticatePlatformUser }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn(async () => undefined) }));
vi.mock("@/lib/auth/api-guard", () => ({ stripOrganizationId: <T,>(b: T) => b }));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as platformLogin } from "@/app/api/auth/platform/login/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

function attempt(handler: typeof login, ip: string, identifier: string, url: string) {
  return handler(
    new NextRequest(`http://localhost${url}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ identifier, email: identifier, password: "mauvais-mdp-1" }),
    }),
  );
}

beforeEach(() => {
  // Pas de Redis (le .env local peut en désigner un) : repli mémoire déterministe ; IP lue dans X-Forwarded-For.
  vi.stubEnv("REDIS_URL", "");
  vi.stubEnv("TRUST_PROXY_IP_HEADERS", "false");
  resetRateLimitsForTests();
  m.authenticateUser.mockReset();
  m.authenticatePlatformUser.mockReset();
  m.authenticateUser.mockResolvedValue(null);
  m.authenticatePlatformUser.mockResolvedValue(null);
});
afterEach(() => {
  resetRateLimitsForTests();
  vi.unstubAllEnvs();
});

describe.each([
  ["/api/auth/login", login],
  ["/api/auth/platform/login", platformLogin],
] as const)("%s : une IP ne peut pas verrouiller le compte d'un tiers", (url, handler) => {
  it("après 429 sur l'IP de l'attaquant, la même identité depuis une autre IP reste acceptée (401, pas 429)", async () => {
    const victim = "proprietaire@t.test";
    let blocked = 0;
    // L'attaquant martèle bien au-delà de n'importe quel plafond de compte.
    for (let i = 0; i < 300; i += 1) {
      const res = await attempt(handler, "198.51.100.7", victim, url);
      if (res.status === 429) blocked += 1;
    }
    expect(blocked).toBeGreaterThan(250);

    // Le propriétaire, depuis son IP : traité normalement (mauvais mot de passe => 401), jamais 429.
    expect((await attempt(handler, "203.0.113.20", victim, url)).status).toBe(401);
    expect((await attempt(handler, "203.0.113.21", victim, url)).status).toBe(401);
  });

  it("la protection contre le brute-force subsiste : le couple IP+compte est limité", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 15; i += 1) statuses.push((await attempt(handler, "198.51.100.8", "cible@t.test", url)).status);
    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses).toContain(429);
    // les tentatives refusées n'atteignent jamais la vérification des mots de passe
    const verified = m.authenticateUser.mock.calls.length + m.authenticatePlatformUser.mock.calls.length;
    expect(verified).toBeLessThan(15);
  });

  it("attaque répartie : le plafond du compte seul finit par s'appliquer (borne le brute-force multi-IP)", async () => {
    let limited = false;
    for (let i = 0; i < 60 && !limited; i += 1) {
      // une IP différente à chaque essai : ni l'IP ni le couple ne se remplissent
      limited = (await attempt(handler, `192.0.2.${(i % 250) + 1}`, "visee@t.test", url)).status === 429;
    }
    expect(limited).toBe(true);
  });
});
