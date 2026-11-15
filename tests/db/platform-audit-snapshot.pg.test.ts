import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, Pool } from "pg";
import { runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "./role-pools";

/**
 * Migration 20261115110000 : "organizationIdSnapshot" garde l'institut d'une ligne de journal après
 * la suppression de l'institut (FK ON DELETE SET NULL). Vérifié avec les rôles applicatifs sous RLS,
 * sur une base locale jetable uniquement (rolesAdminUrl impose une adresse locale).
 */
const h = vi.hoisted(() => ({ pool: null as unknown as Pool }));
vi.mock("@/lib/db/pool", () => ({
  pool: new Proxy(
    {},
    {
      get: (_target, key) => {
        const value = (h.pool as unknown as Record<PropertyKey, unknown>)[key];
        return typeof value === "function" ? value.bind(h.pool) : value;
      },
    },
  ),
}));

import { listOrganizationPaymentHistory } from "@/lib/db/organization-payment-history";
import { listPlatformAuditLogs, writePlatformAuditLog } from "@/lib/db/platform-audit";

const adminUrl = rolesAdminUrl();
const A = "pas_org_a";
const B = "pas_org_b";
const MIGRATION = path.join(
  process.cwd(),
  "prisma/migrations/20261115110000_platform_audit_log_org_snapshot/migration.sql",
);

describe.skipIf(!adminUrl)("journal plateforme : historique retrouvable après suppression de l'institut", () => {
  let admin: Client;
  let restoreEnv: () => void;
  const asPlatform = <T,>(fn: () => Promise<T>) => runInScope({ kind: "platform", reason: "test" }, fn);
  const rows = async (where: string, values: unknown[] = []) =>
    (await admin.query(`SELECT id, "organizationId" AS org, "organizationIdSnapshot" AS snap FROM "PlatformAuditLog" WHERE ${where} ORDER BY id`, values)).rows;

  async function cleanup() {
    await admin.query(`DELETE FROM "PlatformAuditLog" WHERE "entityId" LIKE 'pas_%' OR id LIKE 'pas_%'`);
    await admin.query(`DELETE FROM "Organization" WHERE id IN ('${A}','${B}')`);
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    await admin.query(
      `INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now()),('${B}','B','${B}',now())`,
    );
    h.pool = appPool(adminUrl);
  });

  afterAll(async () => {
    await h.pool?.end().catch(() => null);
    await cleanup().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("writePlatformAuditLog copie l'institut dans le snapshot, et seulement s'il est fourni", async () => {
    await asPlatform(async () => {
      await writePlatformAuditLog({ organizationId: A, entityType: "Subscription", entityId: "pas_sub_a1", action: "SUBSCRIPTION_MARKED_PAID", after: { priceSnapshot: 799, currency: "MAD", periodStart: "2026-01-01T00:00:00.000Z", periodEnd: "2026-02-01T00:00:00.000Z" } });
      await writePlatformAuditLog({ organizationId: A, entityType: "Subscription", entityId: "pas_sub_a1", action: "SUBSCRIPTION_MARKED_UNPAID" });
      await writePlatformAuditLog({ organizationId: B, entityType: "Subscription", entityId: "pas_sub_b1", action: "SUBSCRIPTION_MARKED_PAID" });
      await writePlatformAuditLog({ entityType: "Plan", entityId: "pas_plan", action: "PLAN_UPDATED" });
    });
    expect(await rows(`"entityId" = 'pas_sub_a1'`)).toEqual([
      expect.objectContaining({ org: A, snap: A }),
      expect.objectContaining({ org: A, snap: A }),
    ]);
    expect(await rows(`"entityId" = 'pas_plan'`)).toEqual([expect.objectContaining({ org: null, snap: null })]);
  });

  it("un autre écrivain (ancien code, SQL direct) est couvert par le trigger, sans écraser une valeur explicite", async () => {
    await admin.query(
      `INSERT INTO "PlatformAuditLog"(id,"organizationId","entityType","entityId",action) VALUES ('pas_trg_1','${B}','Subscription','pas_trg','X')`,
    );
    await admin.query(
      `INSERT INTO "PlatformAuditLog"(id,"organizationId","organizationIdSnapshot","entityType","entityId",action) VALUES ('pas_trg_2','${B}','pas_explicit','Subscription','pas_trg','X')`,
    );
    expect(await rows(`"entityId" = 'pas_trg'`)).toEqual([
      expect.objectContaining({ id: "pas_trg_1", snap: B }),
      expect.objectContaining({ id: "pas_trg_2", snap: "pas_explicit" }),
    ]);
  });

  it("après suppression de l'institut : le lien FK disparaît, le snapshot reste et l'historique est relu", async () => {
    const before = await asPlatform(() => listOrganizationPaymentHistory(A));
    expect(before.map((e) => e.paid)).toEqual(expect.arrayContaining([true, false]));
    const paid = before.find((e) => e.paid)!;
    expect(paid).toMatchObject({ amount: 799, currency: "MAD", periodStart: "2026-01-01T00:00:00.000Z" });

    await admin.query(`DELETE FROM "Organization" WHERE id = $1`, [A]);

    expect(await rows(`"entityId" = 'pas_sub_a1'`)).toEqual([
      expect.objectContaining({ org: null, snap: A }),
      expect.objectContaining({ org: null, snap: A }),
    ]);
    const after = await asPlatform(() => listOrganizationPaymentHistory(A));
    expect(after).toEqual(before);

    const logs = await asPlatform(() => listPlatformAuditLogs({ organizationId: A, limit: 50 }));
    expect(logs.map((l) => l.entityId)).toEqual(["pas_sub_a1", "pas_sub_a1"]);
    expect(logs.every((l) => l.organizationName === null)).toBe(true);
  });

  it("n'expose pas l'historique d'un autre institut", async () => {
    const forB = await asPlatform(() => listOrganizationPaymentHistory(B));
    expect(forB).toHaveLength(1);
    const logsB = await asPlatform(() => listPlatformAuditLogs({ organizationId: B, limit: 50 }));
    expect(logsB.every((l) => l.organizationId === B)).toBe(true);
    expect(await asPlatform(() => listOrganizationPaymentHistory("pas_unknown"))).toEqual([]);
    const logsA = await asPlatform(() => listPlatformAuditLogs({ organizationId: A, limit: 50 }));
    expect(logsA.some((l) => l.entityId === "pas_sub_b1")).toBe(false);
  });

  it("reste append-only pour les rôles applicatifs : ni UPDATE ni DELETE, aucune politique UPDATE", async () => {
    await expect(
      asPlatform(() => h.pool.query(`UPDATE "PlatformAuditLog" SET "organizationIdSnapshot" = 'x' WHERE "entityId" = 'pas_sub_b1'`)),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asPlatform(() => h.pool.query(`DELETE FROM "PlatformAuditLog" WHERE "entityId" = 'pas_sub_b1'`)),
    ).rejects.toMatchObject({ code: "42501" });
    const { rows: policies } = await admin.query(`SELECT cmd FROM pg_policies WHERE tablename = 'PlatformAuditLog' ORDER BY cmd`);
    expect(policies.map((p) => p.cmd)).toEqual(["INSERT", "SELECT"]);
    const { rows: grants } = await admin.query(
      `SELECT DISTINCT privilege_type FROM information_schema.table_privileges
       WHERE table_name = 'PlatformAuditLog' AND grantee LIKE 'rappel\\_%' ORDER BY 1`,
    );
    expect(grants.map((g) => g.privilege_type)).toEqual(["INSERT", "SELECT"]);
  });

  it("la migration rattrape les lignes existantes et se rejoue sans effet de bord", async () => {
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now())`);
    await admin.query(`ALTER TABLE "PlatformAuditLog" DISABLE TRIGGER "PlatformAuditLog_org_snapshot_trg"`);
    try {
      await admin.query(
        `INSERT INTO "PlatformAuditLog"(id,"organizationId","entityType","entityId",action)
         VALUES ('pas_old_1','${A}','Subscription','pas_old','X'),('pas_old_2',NULL,'Subscription','pas_old','X')`,
      );
    } finally {
      await admin.query(`ALTER TABLE "PlatformAuditLog" ENABLE TRIGGER "PlatformAuditLog_org_snapshot_trg"`);
    }
    expect(await rows(`"entityId" = 'pas_old'`)).toEqual([
      expect.objectContaining({ id: "pas_old_1", snap: null }),
      expect.objectContaining({ id: "pas_old_2", snap: null }),
    ]);

    const sql = fs.readFileSync(MIGRATION, "utf8");
    await admin.query(sql);
    await admin.query(sql);

    expect(await rows(`"entityId" = 'pas_old'`)).toEqual([
      expect.objectContaining({ id: "pas_old_1", org: A, snap: A }),
      expect.objectContaining({ id: "pas_old_2", org: null, snap: null }),
    ]);
    const { rows: objects } = await admin.query(
      `SELECT (SELECT count(*) FROM pg_trigger WHERE tgname = 'PlatformAuditLog_org_snapshot_trg')::int AS triggers,
              (SELECT count(*) FROM pg_indexes WHERE indexname = 'PlatformAuditLog_organizationIdSnapshot_idx')::int AS indexes`,
    );
    expect(objects[0]).toEqual({ triggers: 1, indexes: 1 });
  });
});
