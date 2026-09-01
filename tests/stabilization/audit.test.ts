import { describe, expect, it, afterAll } from "vitest";
import { writeAuditLog } from "@/lib/db/audit";
import { getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Audit — QUI / QUOI / QUAND / ORG / AVANT / APRÈS", () => {
  let orgId: string;
  let auditId: string;

  afterAll(async () => {
    if (auditId) {
      await testPool.query(`DELETE FROM "AuditLog" WHERE id = $1`, [auditId]);
    }
  });

  it("writeAuditLog persiste actor, entity, before/after JSONB", async () => {
    orgId = await getSeedOrgId();
    const entityId = testId("test_svc_audit");

    await writeAuditLog({
      organizationId: orgId,
      actorId: "u_owner",
      actorName: "Nadia Bennani",
      entityType: "Service",
      entityId,
      action: "PRICE_CHANGE",
      before: { price: 400, serviceName: "Hydrafacial" },
      after: { price: 450, serviceName: "Hydrafacial" },
    });

    const { rows } = await testPool.query<{
      id: string;
      organizationId: string;
      actorId: string;
      actorName: string;
      entityType: string;
      entityId: string;
      action: string;
      before: { price: number };
      after: { price: number };
      createdAt: Date;
    }>(
      `SELECT id, "organizationId", "actorId", "actorName", "entityType", "entityId",
              action, "before", "after", "createdAt"
       FROM "AuditLog"
       WHERE "entityId" = $1 AND action = 'PRICE_CHANGE'
       ORDER BY "createdAt" DESC LIMIT 1`,
      [entityId],
    );

    expect(rows[0]).toBeDefined();
    auditId = rows[0].id;
    expect(rows[0].organizationId).toBe(orgId);
    expect(rows[0].actorId).toBe("u_owner");
    expect(rows[0].actorName).toContain("Nadia");
    expect(rows[0].entityType).toBe("Service");
    expect(rows[0].before.price).toBe(400);
    expect(rows[0].after.price).toBe(450);
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });
});
