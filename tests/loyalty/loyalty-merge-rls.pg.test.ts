import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { bindOrganization, runInScope } from "@/lib/db/tenant-context";
import { prepareRoles, rolesAdminUrl } from "../db/role-pools";

// Les accès de la fusion passent par le pool applicatif : ici, le rôle rappel_app sous RLS (RLS_ENFORCE=all).
vi.mock("@/lib/db/pool", async () => {
  const { appPool, rolesAdminUrl: adminUrl } = await import("../db/role-pools");
  const url = adminUrl();
  return { pool: appPool(url || "postgresql://invalid@127.0.0.1:1/none") };
});

import { mergeCustomers, previewMerge } from "@/lib/loyalty/merge";

/** Fusion de fiches sous le rôle rappel_app et RLS : base locale jetable uniquement (rolesAdminUrl). */
const adminUrl = rolesAdminUrl();
const A = "lmrls_org_a";
const B = "lmrls_org_b";
const ACTOR = { id: "user_rls_test", name: "Gestionnaire RLS" };

describe.skipIf(!adminUrl)("fusion de fiches : rôle rappel_app sous RLS", () => {
  let admin: Client;
  let restoreEnv: () => void;

  const tenant = <T,>(org: string, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });

  async function cleanup() {
    await admin.query(`DELETE FROM "LoyaltyCard" WHERE "organizationId" = ANY($1) AND status = 'MERGED'`, [[A, B]]);
    await admin.query(`DELETE FROM "Organization" WHERE id = ANY($1)`, [[A, B]]);
  }

  async function person(org: string, id: string, phone: string) {
    await admin.query(
      `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, "updatedAt") VALUES ($1, $2, 'x', 'y', $3, now())`,
      [id, org, phone],
    );
    await admin.query(
      `INSERT INTO "LoyaltyCard" (id, "organizationId", "customerId", "publicToken", status, "updatedAt") VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
      [`card_${id}`, org, id, `RBLOY_${id.toUpperCase().replace(/[^A-Z2-9]/g, "").padEnd(12, "K").slice(0, 12)}`],
    );
    for (let index = 0; index < 2; index += 1) {
      await admin.query(
        `INSERT INTO "LoyaltyEvent" (id, "organizationId", "customerId", "loyaltyCardId", type, amount, points) VALUES ($1, $2, $3, $4, 'VISIT', 0, 1)`,
        [`evt_${id}_${index}`, org, id, `card_${id}`],
      );
    }
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    for (const org of [A, B]) {
      await admin.query(`INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $1, $1, now())`, [org]);
    }
    await person(A, "lmrls_s", "WLaaaa1111");
    await person(A, "lmrls_t", "0611223344");
    await person(B, "lmrls_b_s", "WLbbbb2222");
    await person(B, "lmrls_b_t", "0699887766");
  });

  afterAll(async () => {
    await cleanup().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("fusionne dans son institut sous rappel_app et ne voit rien de l'autre institut", async () => {
    const shown = await tenant(A, () => previewMerge(A, { sourceCustomerId: "lmrls_s", phone: "06 11 22 33 44" }));
    expect(shown.mode).toBe("merge");
    if (shown.mode !== "merge") return;
    expect(shown.result.totalVisits).toBe(4);

    // Fiches de l'institut B : invisibles pour une session de l'institut A.
    await expect(tenant(A, () => previewMerge(A, { sourceCustomerId: "lmrls_b_s", phone: "0611223344" }))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      tenant(A, () =>
        mergeCustomers(A, ACTOR, {
          sourceCustomerId: "lmrls_s",
          targetCustomerId: "lmrls_b_t",
          idempotencyKey: `key_${randomUUID()}`,
          previewVersion: shown.previewVersion,
          identityConfirmed: true,
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Une session de l'institut B ne peut pas fusionner les fiches de A.
    await expect(
      tenant(B, () =>
        mergeCustomers(B, ACTOR, {
          sourceCustomerId: "lmrls_s",
          targetCustomerId: "lmrls_t",
          idempotencyKey: `key_${randomUUID()}`,
          previewVersion: shown.previewVersion,
          identityConfirmed: true,
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const result = await tenant(A, () =>
      mergeCustomers(A, ACTOR, {
        sourceCustomerId: "lmrls_s",
        targetCustomerId: "lmrls_t",
        idempotencyKey: `key_${randomUUID()}`,
        previewVersion: shown.previewVersion,
        identityConfirmed: true,
      }),
    );
    expect(result).toMatchObject({ cardMode: "ALIAS", totalVisits: 4 });
    const journal = await admin.query(`SELECT "organizationId" FROM "CustomerMerge" WHERE id = $1`, [result.mergeId]);
    expect(journal.rows[0].organizationId).toBe(A);
    const left = await admin.query(`SELECT COUNT(*)::int AS n FROM "LoyaltyEvent" WHERE "customerId" = 'lmrls_s'`);
    expect(left.rows[0].n).toBe(0);
    const untouched = await admin.query(`SELECT COUNT(*)::int AS n FROM "Customer" WHERE id IN ('lmrls_b_s', 'lmrls_b_t') AND "mergedIntoCustomerId" IS NOT NULL`);
    expect(untouched.rows[0].n).toBe(0);
  });
});
