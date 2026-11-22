import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, type Pool } from "pg";
import { bindOrganization, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "../db/role-pools";

/**
 * "UserTutorialState" avec le rôle applicatif réel (rappel_app, RLS active) sur une base locale jetable uniquement
 * (rolesAdminUrl impose 127.0.0.1 / localhost ; ignoré sinon, ainsi que si la migration n'est pas appliquée).
 * Garanties : éligibilité (ancien compte jamais éligible, aucune ligne créée), avancement filtré par institut,
 * isolation entre instituts et entre utilisateurs, transitions persistées avec leurs dates, concurrence.
 */
const adminUrl = rolesAdminUrl();

const holder = vi.hoisted(() => ({ pool: undefined as unknown }));
vi.mock("@/lib/db/pool", async () => {
  const { appPool: build, rolesAdminUrl: url } = await import("../db/role-pools");
  const admin = url();
  holder.pool = admin ? build(admin, 8) : undefined;
  return { pool: holder.pool };
});

import { applyTutorialAction, getTutorialState, type TutorialAction, type TutorialStep } from "@/lib/db/tutorial-state";

const A = "tut_org_a"; // institut vide : le propriétaire est éligible
const B = "tut_org_b"; // institut vide, autre institut
const L = "tut_org_legacy"; // ancien institut actif : services et rendez-vous existants
const E = "tut_org_legacy_empty";
const P = "tut_org_progress"; // institut pour les compteurs d'avancement

const U = {
  ownerA: ["tut_u_owner_a", A, "OWNER"],
  owner2A: ["tut_u_owner2_a", A, "OWNER"],
  staffA: ["tut_u_staff_a", A, "STAFF"],
  ownerB: ["tut_u_owner_b", B, "OWNER"],
  ownerL: ["tut_u_owner_l", L, "OWNER"],
  ownerE: ["tut_u_owner_e", E, "OWNER"],
  ownerP: ["tut_u_owner_p", P, "OWNER"],
} as const;

describe.skipIf(!adminUrl)("tutoriel : état persisté, éligibilité, avancement, isolation (rappel_app, RLS)", () => {
  let admin: Client;
  let pool: Pool;
  let restoreEnv: () => void;
  let tableReady = false;

  const tenant = <T,>(org: string, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });
  const get = (u: readonly [string, string, string]) => tenant(u[1], () => getTutorialState({ userId: u[0], organizationId: u[1], isOwner: u[2] === "OWNER" }));
  const act = (u: readonly [string, string, string], action: TutorialAction, step?: TutorialStep) =>
    tenant(u[1], () => applyTutorialAction({ userId: u[0], organizationId: u[1], action, step }));
  const rows = async (userId: string) =>
    (await admin.query(`SELECT * FROM "UserTutorialState" WHERE "userId" = $1`, [userId])).rows as Array<Record<string, unknown>>;

  async function cleanup() {
    await admin.query(`DELETE FROM "Organization" WHERE id LIKE 'tut_org_%'`); // cascade : User, Service, Staff, Resource, Appointment, UserTutorialState
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    tableReady = Boolean((await admin.query(`SELECT to_regclass('"UserTutorialState"') AS t`)).rows[0]?.t);
    if (!tableReady) return;
    restoreEnv = await prepareRoles(admin, adminUrl);
    pool = holder.pool as Pool;
    await cleanup();
    for (const org of [A, B, L, P]) {
      await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ($1,$1,$1,now())`, [org]);
    }
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt","tutorialAutoEligible") VALUES ($1,$1,$1,now(),false)`, [E]);
    for (const [id, org, role] of Object.values(U)) {
      await admin.query(
        `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName",role,"updatedAt") VALUES ($1,$2,$3,'F','L',$4::"UserRole",now())`,
        [id, org, `${id}@example.test`, role],
      );
    }
    // Ancien institut : un service et un rendez-vous existent déjà.
    await admin.query(`INSERT INTO "Service"(id,"organizationId",name,price,"durationMin","updatedAt") VALUES ('tut_svc_l',$1,'Soin',10,30,now())`, [L]);
    await admin.query(`INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ('tut_cus_l',$1,'C','C','+21200000001',now())`, [L]);
    await admin.query(
      `INSERT INTO "Appointment"(id,"organizationId","customerId","serviceId","startAt","endAt",price,status,"updatedAt")
       VALUES ('tut_apt_l',$1,'tut_cus_l','tut_svc_l', now() + interval '3 day', now() + interval '3 day 1 hour', 10, 'CONFIRMED', now())`,
      [L],
    );
  });

  afterAll(async () => {
    if (tableReady) {
      await pool?.end().catch(() => null);
      await cleanup().catch(() => null);
    }
    await admin?.end();
    restoreEnv?.();
  });

  const needsTable = (name: string, fn: () => Promise<void>) =>
    it(name, async (ctx) => {
      if (!tableReady) return ctx.skip();
      await fn();
    });

  needsTable("institut vide : la première lecture crée NOT_STARTED, la seconde ne duplique rien", async () => {
    const first = await get(U.ownerA);
    expect(first).toMatchObject({ tutorial: { status: "NOT_STARTED", lastStep: null, version: 1 }, eligible: true });
    expect(first.progress).toEqual({ services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0 });
    expect(await get(U.ownerA)).toEqual(first);
    expect(await rows(U.ownerA[0])).toHaveLength(1);
  });

  needsTable("lectures simultanées d'un nouveau propriétaire : une seule ligne, aucune erreur", async () => {
    const outs = await Promise.all(Array.from({ length: 6 }, () => get(U.owner2A)));
    for (const out of outs) expect(out).toMatchObject({ tutorial: { status: "NOT_STARTED" }, eligible: true });
    expect(await rows(U.owner2A[0])).toHaveLength(1);
  });

  needsTable("ancien compte actif (services et rendez-vous) : jamais éligible, aucune ligne créée", async () => {
    const out = await get(U.ownerL);
    expect(out).toMatchObject({ tutorial: null, eligible: false, progress: { services: 1, appointments: 1 } });
    expect(await rows(U.ownerL[0])).toHaveLength(0);
    expect(await get(U.ownerL)).toEqual(out);
    expect(await rows(U.ownerL[0])).toHaveLength(0);
  });

  needsTable("ancien institut vide : inscription refusée automatiquement et relance explicite autorisée", async () => {
    expect(await get(U.ownerE)).toMatchObject({ tutorial: null, eligible: false });
    expect(await act(U.ownerE, "start")).toEqual({ kind: "invalid_transition", status: null });
    expect(await rows(U.ownerE[0])).toHaveLength(0);
    expect(await act(U.ownerE, "reset")).toMatchObject({ kind: "ok", tutorial: { status: "IN_PROGRESS" } });
  });

  needsTable("non-propriétaire : rien d'éligible, aucune ligne, même dans un institut vide", async () => {
    expect(await get(U.staffA)).toMatchObject({ tutorial: null, eligible: false });
    expect(await rows(U.staffA[0])).toHaveLength(0);
  });

  needsTable("ancien compte : une action autre que « reset » est refusée sans créer de ligne ; « reset » (Revoir le tutoriel) crée la ligne", async () => {
    expect(await act(U.ownerL, "start")).toEqual({ kind: "invalid_transition", status: null });
    expect(await act(U.ownerL, "skip")).toEqual({ kind: "invalid_transition", status: null });
    expect(await rows(U.ownerL[0])).toHaveLength(0);

    const reset = await act(U.ownerL, "reset");
    expect(reset).toMatchObject({ kind: "ok", tutorial: { status: "IN_PROGRESS", lastStep: null }, eligible: true });
    const [row] = await rows(U.ownerL[0]);
    expect(row).toMatchObject({ organizationId: L, status: "IN_PROGRESS", lastStep: null, completedAt: null, skippedAt: null });
    expect(row.startedAt).toBeInstanceOf(Date);
    expect(await get(U.ownerL)).toMatchObject({ tutorial: { status: "IN_PROGRESS" }, eligible: true });
  });

  needsTable("parcours : start, step, pause, complete, puis seul reset rouvre ; dates et étapes persistées", async () => {
    const o = U.ownerA;
    expect(await act(o, "start")).toMatchObject({ kind: "ok", tutorial: { status: "IN_PROGRESS" } });
    const started = (await rows(o[0]))[0].startedAt as Date;
    expect(started).toBeInstanceOf(Date);
    expect(await act(o, "start")).toMatchObject({ kind: "ok" });
    expect((await rows(o[0]))[0].startedAt).toEqual(started); // startedAt n'est posé qu'une fois

    expect(await act(o, "step", "services")).toMatchObject({ tutorial: { status: "IN_PROGRESS", lastStep: "services" } });
    expect(await act(o, "pause")).toMatchObject({ tutorial: { status: "IN_PROGRESS", lastStep: "services" } });
    expect(await act(o, "pause", "planning")).toMatchObject({ tutorial: { lastStep: "planning" } });

    const done = await act(o, "complete");
    expect(done).toMatchObject({ kind: "ok", tutorial: { status: "COMPLETED", lastStep: "planning" }, eligible: false });
    const [completed] = await rows(o[0]);
    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(completed.skippedAt).toBeNull();

    // Fin de parcours : plus aucune autre action que reset.
    for (const action of ["start", "pause", "skip"] as const) expect(await act(o, action)).toEqual({ kind: "invalid_transition", status: "COMPLETED" });
    expect(await act(o, "step", "agenda")).toEqual({ kind: "invalid_transition", status: "COMPLETED" });
    expect(await act(o, "complete")).toMatchObject({ kind: "ok", tutorial: { status: "COMPLETED" } }); // idempotent
    expect((await rows(o[0]))[0].completedAt).toEqual(completed.completedAt);

    const reopened = await act(o, "reset");
    expect(reopened).toMatchObject({ kind: "ok", tutorial: { status: "IN_PROGRESS", lastStep: null }, eligible: true });
    expect(await rows(o[0])).toMatchObject([{ completedAt: null, skippedAt: null }]);

    const skipped = await act(o, "skip");
    expect(skipped).toMatchObject({ tutorial: { status: "SKIPPED" }, eligible: false });
    expect((await rows(o[0]))[0].skippedAt).toBeInstanceOf(Date);
    expect(await act(o, "complete")).toEqual({ kind: "invalid_transition", status: "SKIPPED" });
  });

  needsTable("isolation entre utilisateurs et entre instituts : l'action d'un propriétaire ne touche pas les autres", async () => {
    await act(U.ownerB, "start");
    const before = await rows(U.owner2A[0]);
    await act(U.ownerA, "reset");
    await act(U.ownerA, "step", "staff");
    expect(await rows(U.owner2A[0])).toEqual(before);
    expect(await rows(U.ownerB[0])).toMatchObject([{ organizationId: B, status: "IN_PROGRESS" }]);

    // Sous la RLS de B, la ligne de A est invisible et ne peut être ni lue ni modifiée.
    const seen = await tenant(B, () => pool.query(`SELECT "userId" FROM "UserTutorialState"`));
    expect(seen.rows.map((r: { userId: string }) => r.userId)).toEqual([U.ownerB[0]]);
    const crossUpdate = await tenant(B, () => pool.query(`UPDATE "UserTutorialState" SET status = 'SKIPPED' WHERE "userId" = $1`, [U.ownerA[0]]));
    expect(crossUpdate.rowCount).toBe(0);
    // Une session B ne peut pas écrire une ligne portant l'institut A.
    await expect(
      tenant(B, () => pool.query(`INSERT INTO "UserTutorialState"("userId","organizationId") VALUES ('tut_u_staff_a', $1)`, [A])),
    ).rejects.toMatchObject({ code: "42501" });
  });

  needsTable("avancement : filtré par institut, sans supprimés ni archivés ni annulés, personnel avec horaire distinct", async () => {
    const x = async (sql: string, ...v: unknown[]) => admin.query(sql, v);
    for (const [id, status, deleted] of [
      ["tut_st_ok1", "ACTIVE", null],
      ["tut_st_ok2", "ON_LEAVE", null],
      ["tut_st_arch", "ARCHIVED", null],
      ["tut_st_del", "ACTIVE", new Date()],
    ] as const) {
      await x(`INSERT INTO "Staff"(id,"organizationId","firstName","lastName",status,"deletedAt","updatedAt") VALUES ($1,$2,'S','S',$3::"StaffStatus",$4,now())`, id, P, status, deleted);
    }
    // Horaires : ok1 deux jours actifs (compté une fois), ok2 inactif seulement, archivé et supprimé ignorés.
    const sched = [
      ["tut_ss_1", "tut_st_ok1", 1, true],
      ["tut_ss_2", "tut_st_ok1", 2, true],
      ["tut_ss_3", "tut_st_ok2", 1, false],
      ["tut_ss_4", "tut_st_arch", 1, true],
      ["tut_ss_5", "tut_st_del", 1, true],
    ] as const;
    for (const [id, staffId, day, active] of sched) {
      await x(`INSERT INTO "StaffSchedule"(id,"staffId","dayOfWeek","startTime","endTime",active) VALUES ($1,$2,$3,'09:00','17:00',$4)`, id, staffId, day, active);
    }
    await x(`INSERT INTO "Service"(id,"organizationId",name,price,"durationMin","updatedAt",active)
      VALUES ('tut_svc_p1',$1,'A',1,10,now(),true),('tut_svc_p2',$1,'B',1,10,now(),true),('tut_svc_p3',$1,'C',1,10,now(),false)`, P);
    await x(`INSERT INTO "Resource"(id,"organizationId",name,"updatedAt","deletedAt",active)
      VALUES ('tut_res_1',$1,'R1',now(),NULL,true),('tut_res_2',$1,'R2',now(),now(),true),('tut_res_3',$1,'R3',now(),NULL,false)`, P);
    await x(`INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ('tut_cus_p',$1,'C','C','+21200000002',now())`, P);
    await x(
      `INSERT INTO "Appointment"(id,"organizationId","customerId","startAt","endAt",price,status,"updatedAt") VALUES
         ('tut_apt_p1',$1,'tut_cus_p', now() + interval '5 day', now() + interval '5 day 1 hour', 1, 'CONFIRMED', now()),
         ('tut_apt_p2',$1,'tut_cus_p', now() + interval '6 day', now() + interval '6 day 1 hour', 1, 'CANCELLED', now())`,
      P,
    );

    const out = await get(U.ownerP);
    expect(out.progress).toEqual({ services: 2, staff: 2, staffWithSchedule: 1, resources: 1, appointments: 1 });
    // Les données des autres instituts (L : 1 service, 1 rendez-vous) n'entrent dans aucun compteur ; ici l'institut a des services : pas de ligne.
    expect(out).toMatchObject({ tutorial: null, eligible: false });
    expect((await get(U.ownerA)).progress.services).toBe(0);
  });

  needsTable("actions simultanées skip / complete : une gagne, l'autre est refusée, l'état final est celui de la gagnante", async () => {
    await act(U.ownerA, "reset");
    const [a, b] = await Promise.all([act(U.ownerA, "skip"), act(U.ownerA, "complete")]);
    const results = [a, b];
    expect(results.filter((r) => r.kind === "ok")).toHaveLength(1);
    expect(results.filter((r) => r.kind === "invalid_transition")).toHaveLength(1);
    const winner = a.kind === "ok" ? "SKIPPED" : "COMPLETED";
    const [row] = await rows(U.ownerA[0]);
    expect(row.status).toBe(winner);
    // Une seule date de fin posée, cohérente avec l'état final.
    expect([row.skippedAt, row.completedAt].filter(Boolean)).toHaveLength(1);
  });

  needsTable("reset simultanés : une seule ligne, état valide", async () => {
    const outs = await Promise.all(Array.from({ length: 5 }, () => act(U.ownerL, "reset")));
    for (const out of outs) expect(out).toMatchObject({ kind: "ok", tutorial: { status: "IN_PROGRESS", lastStep: null } });
    expect(await rows(U.ownerL[0])).toHaveLength(1);
  });

  needsTable("contraintes de la table : statut et étape bornés, userId et institut non modifiables par rappel_app", async () => {
    await expect(admin.query(`UPDATE "UserTutorialState" SET status = 'DONE' WHERE "userId" = $1`, [U.ownerA[0]])).rejects.toMatchObject({ code: "23514" });
    await expect(admin.query(`UPDATE "UserTutorialState" SET "lastStep" = $2 WHERE "userId" = $1`, [U.ownerA[0], "x".repeat(41)])).rejects.toMatchObject({ code: "23514" });
    await expect(tenant(A, () => pool.query(`UPDATE "UserTutorialState" SET "organizationId" = $2 WHERE "userId" = $1`, [U.ownerA[0], B]))).rejects.toMatchObject({ code: "42501" });
    await expect(tenant(A, () => pool.query(`DELETE FROM "UserTutorialState" WHERE "userId" = $1`, [U.ownerA[0]]))).rejects.toMatchObject({ code: "42501" });
  });
});
