import { describe, expect, it } from "vitest";
import { jobsStatusFromCounts } from "@/lib/jobs/health";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as dbGet } from "@/app/api/health/db/route";
import { GET as redisGet } from "@/app/api/health/redis/route";
import { GET as jobsGet } from "@/app/api/health/jobs/route";

describe("Statut des files BullMQ", () => {
  it("reste opérationnel sans échec ni file en attente", () => {
    expect(
      jobsStatusFromCounts(
        { waiting: 0, active: 0, completed: 3, failed: 0, delayed: 0 },
        0,
      ),
    ).toBe("ok");
  });

  it("passe en dégradé s'il y a des échecs ou une attente sans worker", () => {
    expect(
      jobsStatusFromCounts(
        { waiting: 0, active: 0, completed: 0, failed: 2, delayed: 0 },
        1,
      ),
    ).toBe("degraded");
    expect(
      jobsStatusFromCounts(
        { waiting: 4, active: 0, completed: 0, failed: 0, delayed: 0 },
        0,
      ),
    ).toBe("degraded");
  });
});

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

  it("GET /api/health/jobs → skipped sans Redis, compteurs sinon", async () => {
    const res = await jobsGet();
    const body = await res.json();
    if (!process.env.REDIS_URL) {
      expect(res.status).toBe(200);
      expect(body.status).toBe("skipped");
      expect(body.counts).toBeNull();
      return;
    }
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.counts).toEqual(
      expect.objectContaining({
        waiting: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        delayed: expect.any(Number),
      }),
    );
  });
});
