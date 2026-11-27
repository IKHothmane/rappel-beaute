import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, Pool } from "pg";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl, roleUrl } from "../db/role-pools";

/**
 * Table "Prospect" (migration 20261126090000_platform_prospects) avec les rôles applicatifs réels :
 * - les fonctions passent par la portée plateforme (connexion rappel_platform) ;
 * - rappel_app, rappel_public et rappel_job n'ont aucun accès ;
 * - les imports ne remplacent jamais statut ni notes, ni une valeur existante par un champ vide ;
 * - une seule synchronisation à la fois (verrou consultatif), verrou rendu après succès comme après échec.
 * Base locale jetable uniquement (rolesAdminUrl impose 127.0.0.1 / localhost). Données inventées.
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

import {
  createManualProspect,
  importCsvProspects,
  listProspects,
  ProspectDuplicateError,
  ProspectSyncBusyError,
  syncOsmProspects,
  updateProspectTracking,
} from "@/lib/db/prospects";
import { planCsvImport } from "@/lib/prospects/csv";
import { OverpassError } from "@/lib/prospects/osm";
import type { ProspectUpsertRow } from "@/lib/prospects/types";

const adminUrl = rolesAdminUrl();
const ACTOR: PlatformSessionUser = {
  id: "padm_prs_pgtest",
  email: "admin-prospects@exemple.test",
  firstName: "Test",
  lastName: "Prospects",
  role: "SUPER_ADMIN",
  scope: "platform",
  accountType: "PLATFORM",
};
const LOCK_KEY = "rappel:prospects:osm-sync";

const osmRow = (over: Partial<ProspectUpsertRow> & { sourceRef: string }): ProspectUpsertRow => ({
  name: "PGTEST Salon",
  category: "hairdresser",
  city: null,
  address: null,
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  website: null,
  ...over,
});

describe.skipIf(!adminUrl)("prospects : base PostgreSQL et rôles", () => {
  let admin: Client;
  let restoreEnv: () => void;
  const asPlatform = <T,>(fn: () => Promise<T>) => runInScope({ kind: "platform", reason: "test" }, fn);
  const sync = (rows: ProspectUpsertRow[]) => asPlatform(() => syncOsmProspects(ACTOR, async () => ({ rows, stats: { unnamed: 0, places: 0 } })));
  const prospect = async (source: string, ref: string) =>
    (await admin.query(`SELECT * FROM "Prospect" WHERE source = $1 AND "sourceRef" = $2`, [source, ref])).rows[0];
  const advisoryLocks = async () =>
    Number((await admin.query(`SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND pid <> pg_backend_pid()`)).rows[0].count);

  async function cleanup() {
    await admin.query(`DELETE FROM "PlatformAuditLog" WHERE "platformUserId" = $1`, [ACTOR.id]);
    await admin.query(`DELETE FROM "Prospect" WHERE name LIKE 'PGTEST%'`);
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    const table = await admin.query(`SELECT to_regclass('public."Prospect"') AS t`);
    if (!table.rows[0].t) throw new Error("Migration 20261126090000_platform_prospects absente de la base de test.");
    restoreEnv = await prepareRoles(admin, adminUrl);
    await admin.query(
      `INSERT INTO "PlatformUser"(id, email, "firstName", "lastName", "updatedAt") VALUES ($1, $2, 'Test', 'Prospects', now())
       ON CONFLICT (id) DO NOTHING`,
      [ACTOR.id, ACTOR.email],
    );
    await cleanup();
    h.pool = appPool(adminUrl);
  });

  afterAll(async () => {
    await h.pool?.end().catch(() => null);
    await cleanup().catch(() => null);
    await admin?.query(`DELETE FROM "PlatformUser" WHERE id = $1`, [ACTOR.id]).catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  beforeEach(async () => {
    await cleanup();
  });

  it("synchro OSM : insère, puis met à jour sans toucher statut ni notes ni vider un champ", async () => {
    const first = await sync([
      osmRow({ sourceRef: "node/990001", name: "PGTEST Salon A", city: "Ville Alpha", phone: "+212600009901", email: "a@salon-test.example", website: "https://salon-test.example/", latitude: 33.01, longitude: -7.01 }),
      osmRow({ sourceRef: "node/990002", name: "PGTEST Salon B", category: "beauty" }),
      // Doublon dans le même lot : retiré avant l'envoi (sinon « cannot affect row a second time »).
      osmRow({ sourceRef: "node/990002", name: "PGTEST Salon B", category: "beauty" }),
    ]);
    expect(first).toMatchObject({ inserted: 2, updated: 0, unchanged: 0, total: 2 });

    const a = await prospect("OSM", "node/990001");
    expect(a).toMatchObject({ status: "TO_CONTACT", notes: null, phone: "+212600009901" });
    expect(a.lastSyncedAt).toBeInstanceOf(Date);
    const tracked = await asPlatform(() => updateProspectTracking(ACTOR, a.id, { status: "CONTACTED", notes: "PGTEST rappeler lundi" }));
    expect(tracked).toMatchObject({ status: "CONTACTED", notes: "PGTEST rappeler lundi" });
    const bBefore = await prospect("OSM", "node/990002");

    const second = await sync([
      osmRow({ sourceRef: "node/990001", name: "PGTEST Salon A renommé", city: "Ville Nouvelle", phone: null, email: null, website: null, category: "other" }),
      osmRow({ sourceRef: "node/990002", name: "PGTEST Salon B", category: "beauty" }),
    ]);
    expect(second).toMatchObject({ inserted: 0, updated: 2, unchanged: 1, total: 2 });

    const after = await prospect("OSM", "node/990001");
    expect(after).toMatchObject({
      id: a.id,
      status: "CONTACTED",
      notes: "PGTEST rappeler lundi",
      name: "PGTEST Salon A renommé",
      city: "Ville Nouvelle",
      category: "hairdresser",
      phone: "+212600009901",
      email: "a@salon-test.example",
      website: "https://salon-test.example/",
      latitude: 33.01,
      longitude: -7.01,
    });
    expect(after.lastSyncedAt.getTime()).toBeGreaterThan(a.lastSyncedAt.getTime());
    const bAfter = await prospect("OSM", "node/990002");
    expect(bAfter.updatedAt.getTime()).toBe(bBefore.updatedAt.getTime());
    expect(bAfter.lastSyncedAt.getTime()).toBeGreaterThan(bBefore.lastSyncedAt.getTime());

    const audit = await admin.query(
      `SELECT action, "entityId", "before", "after" FROM "PlatformAuditLog" WHERE "platformUserId" = $1 ORDER BY "createdAt", id`,
      [ACTOR.id],
    );
    const actions = audit.rows.map((row) => row.action);
    expect(actions.filter((x) => x === "PROSPECTS_OSM_SYNCED")).toHaveLength(2);
    const statusLog = audit.rows.find((row) => row.action === "PROSPECT_STATUS_CHANGED");
    expect(statusLog).toMatchObject({ entityId: a.id, before: { status: "TO_CONTACT" }, after: { status: "CONTACTED", notesChanged: true } });
    // Jamais le texte des notes ni les coordonnées d'un commerce dans le journal.
    expect(JSON.stringify(audit.rows)).not.toMatch(/rappeler lundi|600009901|salon-test\.example/);
  });

  it("une seule synchro à la fois : verrou tenu ailleurs → refus sans appel Overpass ; verrou rendu après succès et échec", async () => {
    await admin.query(`SELECT pg_advisory_lock(hashtextextended($1, 0))`, [LOCK_KEY]);
    const load = vi.fn(async () => ({ rows: [] as ProspectUpsertRow[] }));
    await expect(asPlatform(() => syncOsmProspects(ACTOR, load))).rejects.toBeInstanceOf(ProspectSyncBusyError);
    expect(load).not.toHaveBeenCalled();
    await admin.query(`SELECT pg_advisory_unlock(hashtextextended($1, 0))`, [LOCK_KEY]);

    // Deux demandes simultanées dans le même processus : la seconde est refusée tout de suite.
    let release!: () => void;
    let loading!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const started = new Promise<void>((resolve) => (loading = resolve));
    const running = asPlatform(() =>
      syncOsmProspects(ACTOR, async () => {
        loading();
        await gate;
        return { rows: [osmRow({ sourceRef: "node/990010", name: "PGTEST Salon C" })] };
      }),
    );
    await started;
    await expect(sync([])).rejects.toBeInstanceOf(ProspectSyncBusyError);
    // Pendant l'appel Overpass, le verrou de session est bien tenu en base : une autre instance serait refusée.
    expect(await advisoryLocks()).toBe(1);
    expect((await admin.query(`SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS ok`, [LOCK_KEY])).rows[0].ok).toBe(false);
    release();
    await expect(running).resolves.toMatchObject({ inserted: 1 });
    expect(await advisoryLocks()).toBe(0);

    // Échec Overpass : rien n'est écrit, le verrou est rendu, la synchro suivante passe.
    await expect(
      asPlatform(() =>
        syncOsmProspects(ACTOR, async () => {
          throw new OverpassError("Overpass a répondu 504.", "http", 504);
        }),
      ),
    ).rejects.toBeInstanceOf(OverpassError);
    expect(await advisoryLocks()).toBe(0);
    await expect(sync([osmRow({ sourceRef: "node/990011", name: "PGTEST Salon D" })])).resolves.toMatchObject({ inserted: 1 });
  });

  it("import CSV : dédoublonnage par téléphone, statut et notes conservés au réimport, journal d'audit", async () => {
    const plan = planCsvImport("nom;ville;telephone;email\nPGTEST Institut E;Ville Beta;06 00 00 99 05;\nPGTEST Institut F;Ville Beta;;\n");
    const first = await asPlatform(() => importCsvProspects(ACTOR, plan.rows, { skipped: 0, errorCount: 0 }));
    expect(first).toEqual({ inserted: 2, updated: 0, unchanged: 0 });

    const e = await prospect("CSV", "phone:+212600009905");
    await asPlatform(() => updateProspectTracking(ACTOR, e.id, { status: "DECLINED", notes: "PGTEST pas intéressée" }));

    const again = planCsvImport("nom;ville;telephone;email\nPGTEST Institut E;Ville Beta;+212600009905;e@institut-test.example\n");
    const second = await asPlatform(() => importCsvProspects(ACTOR, again.rows, { skipped: 0, errorCount: 0 }));
    expect(second).toEqual({ inserted: 0, updated: 1, unchanged: 0 });
    expect(await prospect("CSV", "phone:+212600009905")).toMatchObject({
      id: e.id, status: "DECLINED", notes: "PGTEST pas intéressée", email: "e@institut-test.example", "lastSyncedAt": null,
    });
    const logs = await admin.query(`SELECT "after" FROM "PlatformAuditLog" WHERE "platformUserId" = $1 AND action = 'PROSPECTS_CSV_IMPORTED'`, [ACTOR.id]);
    expect(logs.rows.map((row) => row.after)).toEqual(
      expect.arrayContaining([expect.objectContaining({ inserted: 2 }), expect.objectContaining({ updated: 1 })]),
    );
  });

  it("création manuelle, refus d'un téléphone déjà présent, filtres et compteurs de la liste", async () => {
    await sync([osmRow({ sourceRef: "node/990020", name: "PGTEST Barbier G", category: "barber", city: "Ville Gamma", phone: "+212600009920" })]);
    const created = await asPlatform(() =>
      createManualProspect(ACTOR, { name: "PGTEST Spa H", category: "spa", city: "ville gamma", address: null, phone: "+212600009921", email: null, website: null }),
    );
    expect(created).toMatchObject({ source: "MANUAL", sourceRef: null, status: "TO_CONTACT" });
    await expect(
      asPlatform(() =>
        createManualProspect(ACTOR, { name: "PGTEST Doublon", category: "spa", city: null, address: null, phone: "+212600009920", email: null, website: null }),
      ),
    ).rejects.toBeInstanceOf(ProspectDuplicateError);

    const list = await asPlatform(() => listProspects({ search: "06 00 00 99 21", page: 1, pageSize: 50, sort: "name" }));
    expect(list.items.map((item) => item.name)).toEqual(["PGTEST Spa H"]);
    const byCity = await asPlatform(() => listProspects({ city: "VILLE GAMMA", has: "phone", page: 1, pageSize: 1, sort: "city" }));
    expect(byCity.total).toBe(2);
    expect(byCity.items).toHaveLength(1);
    expect(byCity.cities).toEqual(expect.arrayContaining([expect.objectContaining({ count: 2 })]));
    expect(Object.keys(byCity.stats.byStatus).sort()).toEqual(["CONTACTED", "CUSTOMER", "DECLINED", "TO_CONTACT"]);
    expect(byCity.lastSyncedAt).not.toBeNull();
    const like = await asPlatform(() => listProspects({ search: "%", page: 1, pageSize: 50, sort: "name" }));
    expect(like.total).toBe(0);
  });

  it("rappel_app, rappel_public et rappel_job n'ont aucun accès à la table", async () => {
    for (const role of ["rappel_app", "rappel_public", "rappel_job"]) {
      const client = new Client({ connectionString: roleUrl(adminUrl, role) });
      await client.connect();
      try {
        await expect(client.query(`SELECT count(*) FROM "Prospect"`)).rejects.toMatchObject({ code: "42501" });
        await expect(
          client.query(`INSERT INTO "Prospect"(id, source, "sourceRef", name, category) VALUES ('prsp_x', 'CSV', 'x', 'PGTEST x', 'other')`),
        ).rejects.toMatchObject({ code: "42501" });
      } finally {
        await client.end();
      }
    }
    // Une route institut (portée tenant, connexion rappel_app) ne lit pas les prospects.
    await expect(
      runInScope({ kind: "tenant", organizationId: "org_prs_pgtest" }, () => h.pool.query(`SELECT count(*) FROM "Prospect"`)),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
