import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as dbGet } from "@/app/api/health/db/route";
import { GET as redisGet } from "@/app/api/health/redis/route";

const run = process.env.DATABASE_URL ? describe : describe.skip;

// Contrat (lot sécurité B1) : /api/health reste public mais minimal ; la mémoire, l'environnement
// et la sonde /api/health/db exigent `Authorization: Bearer <HEALTH_TOKEN|CRON_SECRET>`.
const TOKEN = "health-integration-token-0123456789";

function request(path: string, token?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

run("Health checks", () => {
  const saved = { health: process.env.HEALTH_TOKEN, cron: process.env.CRON_SECRET };

  beforeEach(() => {
    process.env.HEALTH_TOKEN = TOKEN;
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (saved.health === undefined) delete process.env.HEALTH_TOKEN;
    else process.env.HEALTH_TOKEN = saved.health;
    if (saved.cron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved.cron;
  });

  it("GET /api/health → database ok, sans détail interne", async () => {
    const res = await healthGet(request("/api/health/"));
    const body = await res.json();
    expect(body.database).toBe("ok");
    expect(["ok", "degraded"]).toContain(body.status);
    expect(Object.keys(body).sort()).toEqual(["database", "redis", "status", "version"]);
  });

  it("GET /api/health avec jeton → mémoire du processus", async () => {
    const res = await healthGet(request("/api/health/", TOKEN));
    const body = await res.json();
    expect(body.database).toBe("ok");
    expect(body.memory?.rssMb).toEqual(expect.any(Number));
  });

  it("GET /api/health/db sans jeton → 401", async () => {
    const res = await dbGet(request("/api/health/db/"));
    expect(res.status).toBe(401);
  });

  it("GET /api/health/db avec jeton → ok, sans rôle SQL", async () => {
    const res = await dbGet(request("/api/health/db/", TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body).not.toHaveProperty("role");
  });

  it("GET /api/health/redis → skipped ou ok", async () => {
    const res = await redisGet();
    const body = await res.json();
    if (process.env.REDIS_URL) {
      expect(body.status).toBe("ok");
    } else {
      expect(body.status).toBe("skipped");
    }
  });
});
