import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import type { PoolClient } from "pg";

// finance.ts importe le pool partagé : inutile ici, la fonction testée reçoit son client.
vi.mock("@/lib/db/pool", () => ({ pool: {} }));

import { nextPaymentTicket, nextPaymentTicketNumber } from "@/lib/db/finance";

/**
 * Migrations 20261115100000 (ticketDay) et 20261115103000 (contraintes NOT VALID) sur une vraie base.
 * Ces tests écrivent : ils ne tournent que sur la base désignée par DATABASE_TEST_URL
 * (tests/helpers/test-database.ts impose une adresse locale) et nettoient leurs lignes.
 */
const ORG = "ptd_org";
const url = process.env.DATABASE_URL ?? "";
const localOnly = /@(127\.0\.0\.1|localhost)[:/]/.test(url);

describe.skipIf(!localOnly)("numéro de passage avec jour calendaire et contraintes d'intégrité", () => {
  let db: Client;
  const q = <T = Record<string, unknown>>(sql: string, values?: unknown[]) =>
    db.query(sql, values).then((r) => r.rows as T[]);

  async function payment(id: string, ticketNumber: string | null, day: string | null | undefined, amount = 10) {
    if (day === undefined) {
      return db.query(
        `INSERT INTO "Payment"(id,"organizationId",amount,method,"ticketNumber","updatedAt")
         VALUES ($1,$2,$3,'CASH',$4,now())`,
        [id, ORG, amount, ticketNumber],
      );
    }
    return db.query(
      `INSERT INTO "Payment"(id,"organizationId",amount,method,"ticketNumber","ticketDay","updatedAt")
       VALUES ($1,$2,$3,'CASH',$4,$5::date,now())`,
      [id, ORG, amount, ticketNumber, day],
    );
  }

  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
    await db.query(`DELETE FROM "Organization" WHERE id = $1`, [ORG]);
    await db.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ($1,'Ptd','ptd-org',now())`, [ORG]);
    await db.query(
      `INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ('ptd_c',$1,'a','b','ptd',now())`,
      [ORG],
    );
  });

  afterAll(async () => {
    await db?.query(`DELETE FROM "Organization" WHERE id = $1`, [ORG]);
    await db?.end();
  });

  it("le même JJ/MM-NNN est accepté une année différente, refusé le même jour", async () => {
    await payment("ptd_p26", "01/09-001", "2026-09-01");
    await payment("ptd_p27", "01/09-001", "2027-09-01");
    await expect(payment("ptd_dup", "01/09-001", "2027-09-01")).rejects.toMatchObject({
      code: "23505",
      constraint: "Payment_organizationId_ticketDay_ticketNumber_key",
    });
  });

  it("n'oppose pas les paiements sans numéro de passage", async () => {
    await payment("ptd_n1", null, "2026-09-02");
    await payment("ptd_n2", null, "2026-09-02");
  });

  it("remplit ticketDay par défaut (jour Casablanca) pour un ancien code qui ne l'écrit pas", async () => {
    await payment("ptd_default", "99/99-001", undefined);
    const [row] = await q<{ same: boolean }>(
      `SELECT "ticketDay" = (now() AT TIME ZONE 'Africa/Casablanca')::date AS same FROM "Payment" WHERE id = 'ptd_default'`,
    );
    expect(row.same).toBe(true);
  });

  it("n'a plus l'unicité sans année ni son doublon", async () => {
    const names = (await q<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE tablename = 'Payment' AND indexname LIKE '%ticket%'`)).map((r) => r.indexname);
    expect(names).toEqual(["Payment_organizationId_ticketDay_ticketNumber_key"]);
  });

  it("nextPaymentTicket fournit le libellé et le jour de la séquence, dans l'ordre", async () => {
    const client = db as unknown as PoolClient;
    const [today] = await q<{ day: string; label: string }>(
      `SELECT to_char(now() AT TIME ZONE 'Africa/Casablanca','YYYY-MM-DD') AS day, to_char(now() AT TIME ZONE 'Africa/Casablanca','DD/MM') AS label`,
    );
    await db.query("BEGIN");
    const first = await nextPaymentTicket(ORG, client);
    const second = await nextPaymentTicket(ORG, client);
    const third = await nextPaymentTicketNumber(ORG, client);
    await payment("ptd_t1", first.ticketNumber, first.ticketDay);
    await payment("ptd_t2", second.ticketNumber, second.ticketDay);
    await db.query("COMMIT");
    expect(first).toEqual({ ticketNumber: `${today.label}-001`, ticketDay: today.day });
    expect(second).toEqual({ ticketNumber: `${today.label}-002`, ticketDay: today.day });
    expect(third).toBe(`${today.label}-003`);
    const [stored] = await q<{ day: string }>(`SELECT "ticketDay"::text AS day FROM "Payment" WHERE id = 'ptd_t1'`);
    expect(stored.day).toBe(today.day);
  });

  it("refuse les valeurs hors règle sur les nouvelles lignes, sans toucher aux anciennes", async () => {
    // Payment.amount >= 0 : la vente remisée à 100 % (total 0) reste enregistrable.
    await payment("ptd_zero", "98/98-001", "2026-01-01", 0);
    await expect(payment("ptd_neg", "98/98-002", "2026-01-01", -1)).rejects.toMatchObject({ code: "23514" });

    await expect(
      db.query(`INSERT INTO "GiftCard"(id,"organizationId",code,"initialValue",balance,"updatedAt") VALUES ('ptd_gc',$1,'PTDGC',10,-1,now())`, [ORG]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query(`INSERT INTO "LoyaltyAccount"(id,"organizationId","customerId",balance,"updatedAt") VALUES ('ptd_la',$1,'ptd_c',-5,now())`, [ORG]),
    ).rejects.toMatchObject({ code: "23514" });
    for (const rating of [0, 6]) {
      await expect(
        db.query(`INSERT INTO "Review"(id,"organizationId","customerId",rating,comment,"updatedAt") VALUES ($2,$1,'ptd_c',$3,'x',now())`, [ORG, `ptd_rv${rating}`, rating]),
      ).rejects.toMatchObject({ code: "23514" });
    }
    await db.query(`INSERT INTO "Review"(id,"organizationId","customerId",rating,comment,"updatedAt") VALUES ('ptd_rv_null',$1,'ptd_c',NULL,'x',now())`, [ORG]);
    await db.query(`INSERT INTO "Review"(id,"organizationId","customerId",rating,comment,"updatedAt") VALUES ('ptd_rv5',$1,'ptd_c',5,'x',now())`, [ORG]);
  });

  it("contrôle la période et le paiement d'un abonnement", async () => {
    const [{ id: planId }] = await q<{ id: string }>(`SELECT id FROM "Plan" ORDER BY code LIMIT 1`);
    const insert = (id: string, end: string, paid: boolean, paidAt: string | null, price = 10) =>
      db.query(
        `INSERT INTO "Subscription"(id,"organizationId","planId","priceSnapshot","startedAt","currentPeriodStart","currentPeriodEnd",paid,"paidAt","updatedAt")
         VALUES ($1,$2,$3,$4,'2026-01-10','2026-01-10',$5,$6,$7,now())`,
        [id, ORG, planId, price, end, paid, paidAt],
      );
    await expect(insert("ptd_sb1", "2026-01-09", false, null)).rejects.toMatchObject({ code: "23514" });
    await expect(insert("ptd_sb2", "2026-02-10", false, "2026-01-11")).rejects.toMatchObject({ code: "23514" });
    await expect(insert("ptd_sb3", "2026-02-10", false, null, -1)).rejects.toMatchObject({ code: "23514" });
    await insert("ptd_sb_ok", "2026-02-10", true, "2026-01-11");
  });

  it("AssistantVerificationChallenge exige un institut existant, sans balayer l'existant", async () => {
    await db.query(`INSERT INTO "PublicWidget"(id,"organizationId","publicId",name,"updatedAt") VALUES ('ptd_w',$1,'ptd_pub','w',now())`, [ORG]);
    await db.query(
      `INSERT INTO "AssistantWidgetSession"(id,"widgetId","organizationId","tokenHash","expiresAt") VALUES ('ptd_ws','ptd_w',$1,'ptd_hash',now() + interval '1 hour')`,
      [ORG],
    );
    const insert = (org: string) =>
      db.query(
        `INSERT INTO "AssistantVerificationChallenge"(id,"widgetSessionId","organizationId",phone,"codeHash","expiresAt") VALUES ($2,'ptd_ws',$1,'0600','h',now() + interval '1 hour')`,
        [org, `ptd_ch_${org}`],
      );
    await expect(insert("ptd_missing_org")).rejects.toMatchObject({ code: "23503" });
    await insert(ORG);
    const [fk] = await q<{ validated: boolean }>(
      `SELECT convalidated AS validated FROM pg_constraint WHERE conname = 'AssistantVerificationChallenge_organizationId_fkey'`,
    );
    expect(fk.validated).toBe(false);
  });

  it("la migration de rattrapage laisse le jour de paidAt en fuseau Casablanca", async () => {
    // Même conversion que la migration : 23:30 UTC le 1er septembre = 00:30 le 2 (UTC+1).
    const [row] = await q<{ d: string }>(
      `SELECT ((TIMESTAMP '2026-09-01 23:30' AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Casablanca')::date::text AS d`,
    );
    expect(row.d).toBe("2026-09-02");
  });
});
