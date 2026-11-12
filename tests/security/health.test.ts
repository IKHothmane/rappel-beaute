import { describe, expect, it } from "vitest";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as dbGet } from "@/app/api/health/db/route";
import { GET as redisGet } from "@/app/api/health/redis/route";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Health checks", () => {
  it("GET /api/health → database ok", async () => {
    const res = await healthGet();
    const body = await res.json();
    expect(body.database).toBe("ok");
    expect(["ok", "degraded"]).toContain(body.status);
  });

  it("GET /api/health/db → ok", async () => {
    const res = await dbGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
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
