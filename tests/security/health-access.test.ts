import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Lot sécurité B1 — sondes de santé, sans base réelle :
 * - /api/health/db exige un jeton, n'ouvre aucune connexion pour un appel anonyme,
 *   réutilise une seule connexion de sonde et ne renvoie plus le rôle SQL ;
 * - /api/health reste public mais ne sert la mémoire qu'avec le jeton.
 */
const state = vi.hoisted(() => ({
  pools: [] as Array<{ options: Record<string, unknown>; query: ReturnType<typeof vi.fn> }>,
  sharedQuery: vi.fn(),
}));

vi.mock("pg", () => {
  class Pool {
    options: Record<string, unknown>;
    query = vi.fn(async () => ({ rows: [{ ready: true }] }));
    end = vi.fn(async () => undefined);
    on = vi.fn();
    constructor(options: Record<string, unknown>) {
      this.options = options;
      state.pools.push(this);
    }
  }
  return { Pool, default: { Pool } };
});

vi.mock("@/lib/db/pool", () => ({ pool: { query: state.sharedQuery } }));
vi.mock("@/lib/redis/client", () => ({
  pingRedis: vi.fn(async () => true),
  getRedis: vi.fn(async () => null),
}));

const SECRET = "health-token-for-unit-tests-0123";
const CRON = "cron-secret-for-unit-tests-012345";
const ENV_KEYS = ["HEALTH_TOKEN", "CRON_SECRET", "DATABASE_URL", "REDIS_URL", "MEMORY_DIAGNOSTICS"] as const;
const RAPPEL_URLS = ["RAPPEL_PLATFORM_DATABASE_URL", "RAPPEL_PUBLIC_DATABASE_URL", "RAPPEL_JOB_DATABASE_URL"] as const;
const saved: Record<string, string | undefined> = {};

function request(path: string, authorization?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  for (const key of [...ENV_KEYS, ...RAPPEL_URLS]) saved[key] = process.env[key];
  for (const key of [...ENV_KEYS, ...RAPPEL_URLS]) delete process.env[key];
  // Hôte injoignable : rien ne doit s'y connecter (pg est simulé).
  process.env.DATABASE_URL = "postgresql://probe:probe@127.0.0.1:1/none";
  state.pools.length = 0;
  state.sharedQuery.mockReset();
  state.sharedQuery.mockResolvedValue({ rows: [{ ok: 1 }] });
  (globalThis as { healthProbePool?: unknown }).healthProbePool = undefined;
});

afterEach(() => {
  for (const key of [...ENV_KEYS, ...RAPPEL_URLS]) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("healthTokenAuthorized", () => {
  it("refuse tout quand aucun secret n'est configuré", async () => {
    const { healthTokenAuthorized } = await import("@/app/api/health/_lib/access");
    expect(healthTokenAuthorized(request("/api/health/", "Bearer "))).toBe(false);
    expect(healthTokenAuthorized(request("/api/health/", "Bearer anything-at-all-123456"))).toBe(false);
    expect(healthTokenAuthorized(undefined)).toBe(false);
  });

  it("accepte HEALTH_TOKEN, refuse un jeton faux, de longueur différente ou mal formé", async () => {
    process.env.HEALTH_TOKEN = SECRET;
    const { healthTokenAuthorized } = await import("@/app/api/health/_lib/access");
    expect(healthTokenAuthorized(request("/api/health/", `Bearer ${SECRET}`))).toBe(true);
    expect(healthTokenAuthorized(request("/api/health/", `bearer ${SECRET}`))).toBe(true);
    expect(healthTokenAuthorized(request("/api/health/", `Bearer ${SECRET.slice(0, -1)}x`))).toBe(false);
    expect(healthTokenAuthorized(request("/api/health/", `Bearer ${SECRET}0`))).toBe(false);
    expect(healthTokenAuthorized(request("/api/health/", SECRET))).toBe(false);
    expect(healthTokenAuthorized(request("/api/health/", `Basic ${SECRET}`))).toBe(false);
    expect(healthTokenAuthorized(request("/api/health/"))).toBe(false);
  });

  it("HEALTH_TOKEN prime sur CRON_SECRET ; CRON_SECRET sert seulement à défaut", async () => {
    const { healthTokenAuthorized } = await import("@/app/api/health/_lib/access");
    process.env.CRON_SECRET = CRON;
    expect(healthTokenAuthorized(request("/api/health/", `Bearer ${CRON}`))).toBe(true);
    process.env.HEALTH_TOKEN = SECRET;
    expect(healthTokenAuthorized(request("/api/health/", `Bearer ${CRON}`))).toBe(false);
    expect(healthTokenAuthorized(request("/api/health/", `Bearer ${SECRET}`))).toBe(true);
  });

  it("un secret trop court est refusé, sans repli sur CRON_SECRET", async () => {
    const { healthTokenAuthorized } = await import("@/app/api/health/_lib/access");
    process.env.HEALTH_TOKEN = "short";
    process.env.CRON_SECRET = CRON;
    expect(healthTokenAuthorized(request("/api/health/", "Bearer short"))).toBe(false);
    expect(healthTokenAuthorized(request("/api/health/", `Bearer ${CRON}`))).toBe(false);
    delete process.env.HEALTH_TOKEN;
    process.env.CRON_SECRET = "tooshort";
    expect(healthTokenAuthorized(request("/api/health/", "Bearer tooshort"))).toBe(false);
  });
});

describe("GET /api/health/db", () => {
  it("401 sans jeton, sans créer de connexion", async () => {
    process.env.HEALTH_TOKEN = SECRET;
    const { GET } = await import("@/app/api/health/db/route");
    const res = await GET(request("/api/health/db/"));
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const wrong = await GET(request("/api/health/db/", "Bearer wrong-token-0123456789abcdef"));
    expect(wrong.status).toBe(401);
    expect(state.pools).toHaveLength(0);
  });

  it("401 quand aucun secret n'est configuré, même avec un en-tête", async () => {
    const { GET } = await import("@/app/api/health/db/route");
    const res = await GET(request("/api/health/db/", `Bearer ${SECRET}`));
    expect(res.status).toBe(401);
    expect(state.pools).toHaveLength(0);
  });

  it("avec jeton : une seule connexion de sonde pour une rafale, sans rôle SQL", async () => {
    process.env.HEALTH_TOKEN = SECRET;
    const { GET } = await import("@/app/api/health/db/route");
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => GET(request("/api/health/db/", `Bearer ${SECRET}`))),
    );
    for (const res of responses) {
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ status: "ok", latencyMs: expect.any(Number), schema: "ready" });
    }
    expect(state.pools).toHaveLength(1);
    expect(state.pools[0]!.options).toMatchObject({ max: 1 });
    expect(state.pools[0]!.query).toHaveBeenCalledTimes(5);
    expect(String(state.pools[0]!.query.mock.calls[0]![0])).not.toContain("current_user");
  });

  it("CRON_SECRET suffit quand HEALTH_TOKEN est absent", async () => {
    process.env.CRON_SECRET = CRON;
    const { GET } = await import("@/app/api/health/db/route");
    const res = await GET(request("/api/health/db/", `Bearer ${CRON}`));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/health", () => {
  it("public : état minimal, sans mémoire ni environnement", async () => {
    process.env.HEALTH_TOKEN = SECRET;
    process.env.MEMORY_DIAGNOSTICS = "1";
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(request("/api/health/"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["database", "redis", "status", "version"]);
    expect(body).toMatchObject({ status: "ok", database: "ok", redis: "skipped" });
    // Le contrôle de déploiement (production.yml) cherche ce fragment exact.
    expect(JSON.stringify(body)).toContain('"database":"ok"');
  });

  it("avec jeton valide : mémoire, environnement et horodatage", async () => {
    process.env.HEALTH_TOKEN = SECRET;
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(request("/api/health/", `Bearer ${SECRET}`));
    const body = await res.json();
    expect(body.memory).toMatchObject({ rssMb: expect.any(Number), heapUsedMb: expect.any(Number) });
    expect(typeof body.app).toBe("string");
    expect(typeof body.timestamp).toBe("string");
  });

  it("jeton invalide : aucun détail", async () => {
    process.env.HEALTH_TOKEN = SECRET;
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(request("/api/health/", "Bearer not-the-right-token-123456"));
    const body = await res.json();
    expect(body).not.toHaveProperty("memory");
    expect(body).not.toHaveProperty("app");
  });

  it("base en échec : 503 et database=error", async () => {
    state.sharedQuery.mockRejectedValue(new Error("down"));
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(request("/api/health/"));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "degraded", database: "error" });
  });

  it("une rafale simultanée ne fait qu'un aller-retour base", async () => {
    let release: (value: unknown) => void = () => undefined;
    state.sharedQuery.mockImplementation(() => new Promise((resolve) => (release = resolve)));
    const { GET } = await import("@/app/api/health/route");
    const pending = Array.from({ length: 10 }, () => GET(request("/api/health/")));
    await vi.waitFor(() => expect(state.sharedQuery).toHaveBeenCalledTimes(1));
    release({ rows: [{ ok: 1 }] });
    const responses = await Promise.all(pending);
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(state.sharedQuery).toHaveBeenCalledTimes(1);
  });
});
