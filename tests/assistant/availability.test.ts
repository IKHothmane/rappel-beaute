import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as listAvailability } from "@/app/api/public/assistant/availability/route";
import { ensurePreviewWidget, openWidgetSession } from "@/lib/db/assistant-session";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Créneaux publics de l'assistant", () => {
  let orgId: string;
  let token: string;
  const ownService = testId("svc");
  const foreignService = testId("svc");
  const date = "2026-10-05";

  beforeAll(async () => {
    resetRateLimitsForTests();
    await ensurePreviewWidget();
    orgId = await getSeedOrgId();
    const otherOrgId = await ensureSecondOrg();
    await testPool.query(
      `INSERT INTO "Service" (id, "organizationId", name, price, "durationMin", active, "updatedAt")
       VALUES ($1, $2, 'Soin créneaux widget', 180, 45, true, NOW()),
              ($3, $4, 'Soin créneaux autre institut', 180, 45, true, NOW())`,
      [ownService, orgId, foreignService, otherOrgId],
    );
    const opened = await openWidgetSession({
      publicId: "pub_preview",
      origin: "http://localhost:3000",
      ip: "203.0.113.77",
    });
    token = opened.token;
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "Service" WHERE id = ANY($1::text[])`, [
      [ownService, foreignService],
    ]);
  });

  function authed(query: string) {
    return new NextRequest(`http://localhost:3000/api/public/assistant/availability/${query}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  it("renvoie les créneaux de l'institut de la session, sans employé", async () => {
    const res = await listAvailability(authed(`?serviceId=${ownService}&date=${date}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slots: { time: string; staffId?: string }[] };
    expect(Array.isArray(body.slots)).toBe(true);
    expect(JSON.stringify(body)).not.toContain("staffId");
    expect(JSON.stringify(body)).not.toContain("employeeId");
    expect(JSON.stringify(body)).not.toContain("organizationId");
  });

  it("ne consulte pas l'agenda d'un autre institut", async () => {
    const res = await listAvailability(authed(`?serviceId=${foreignService}&date=${date}`));
    expect(res.status).toBe(404);
  });

  it("refuse organizationId, employeeId et customerId", async () => {
    for (const key of ["organizationId", "employeeId", "staffId", "customerId"]) {
      const res = await listAvailability(
        authed(`?serviceId=${ownService}&date=${date}&${key}=impose`),
      );
      expect(res.status).toBe(403);
    }
  });
});
