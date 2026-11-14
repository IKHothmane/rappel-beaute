import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import {
  bindOrganization,
  bindPublicInstitute,
  decideQuery,
  parseRlsSetting,
  runInScope,
  TenantContextError,
  type TenantScope,
} from "@/lib/db/tenant-context";
import { pilotConnectionString, withTenantIsolation } from "@/lib/db/tenant-pool";
import { rlsContextProof } from "@/lib/db/rls-proof";
import { publicRoute, tenantRoute } from "@/lib/http/route-scope";

const root = path.resolve(__dirname, "../..");
const flush = () => new Promise((r) => setTimeout(r, 5));
const tenantScope = (organizationId: string | null): TenantScope => ({ kind: "tenant", organizationId });
const publicScope: TenantScope = { kind: "public", reason: "test" };

function fakePool(privileged = false, connectionString?: string) {
  const calls: string[] = [];
  const params: unknown[][] = [];
  const listeners = new Set<(e: Error) => void>();
  const client = {
    query: vi.fn(async (sql: unknown, values?: unknown[]) => {
      const text = String(typeof sql === "string" ? sql : (sql as { text: string }).text);
      calls.push(text.includes("set_config") ? "SET" : text.split(" ")[0]);
      if (values) params.push(values);
      return { rows: [] };
    }),
    release: vi.fn((destroy?: unknown) => {
      calls.push(destroy ? "DESTROY" : "RELEASE");
    }),
    on: (_: string, fn: (e: Error) => void) => listeners.add(fn),
    removeListener: (_: string, fn: (e: Error) => void) => listeners.delete(fn),
  };
  const rawConnect = vi.fn(async () => client);
  const raw = {
    connect: rawConnect,
    options: connectionString ? { connectionString } : undefined,
    on: vi.fn(),
    query: vi.fn(async (sql: string) => {
      if (sql.includes("pg_roles")) return { rows: [{ privileged }] };
      calls.push("DIRECT");
      return { rows: [] };
    }),
  };
  const pool = withTenantIsolation(raw as unknown as Pool);
  return { pool, raw, rawConnect, client, calls, params, listeners };
}

describe("décision d'accès à la base", () => {
  const off = parseRlsSetting("");
  const all = parseRlsSetting("all");
  const list = parseRlsSetting("org_a, org_b");

  it("isolation inactive : direct pour un superutilisateur, autorisation annoncée pour le rôle limité", () => {
    expect(decideQuery({ scope: tenantScope("org_a"), setting: off, limitedRole: false }).action).toBe("passthrough");
    expect(decideQuery({ scope: undefined, setting: off, limitedRole: true }).action).toBe("bypass");
    expect(decideQuery({ scope: tenantScope(null), setting: off, limitedRole: true }).action).toBe("bypass");
  });

  it("refuse une route métier sans institut dès que l'isolation est active", () => {
    for (const setting of [all, list]) {
      for (const limitedRole of [true, false]) {
        expect(decideQuery({ scope: tenantScope(null), setting, limitedRole }).action).toBe("refuse");
      }
    }
  });

  it("refuse un accès sans portée en mode all, le signale en mode liste", () => {
    expect(decideQuery({ scope: undefined, setting: all, limitedRole: true }).action).toBe("refuse");
    expect(decideQuery({ scope: undefined, setting: all, limitedRole: false }).action).toBe("refuse");
    expect(decideQuery({ scope: undefined, setting: list, limitedRole: true })).toMatchObject({ action: "bypass", warn: expect.any(String) });
  });

  it("filtre uniquement les instituts concernés", () => {
    expect(decideQuery({ scope: tenantScope("org_a"), setting: list, limitedRole: true })).toEqual({ action: "tenant", organizationId: "org_a" });
    expect(decideQuery({ scope: tenantScope("org_c"), setting: list, limitedRole: true }).action).toBe("bypass");
    expect(decideQuery({ scope: tenantScope("org_c"), setting: all, limitedRole: true }).action).toBe("tenant");
  });

  it("garde les accès explicites ouverts", () => {
    expect(decideQuery({ scope: publicScope, setting: all, limitedRole: true }).action).toBe("bypass");
    expect(decideQuery({ scope: { kind: "platform", reason: "t" }, setting: all, limitedRole: true }).action).toBe("bypass");
    expect(decideQuery({ scope: { kind: "job", reason: "t" }, setting: all, limitedRole: true }).action).toBe("bypass");
  });

  it("signale l'isolation active sur un rôle qui ignore les règles", () => {
    expect(decideQuery({ scope: tenantScope("org_a"), setting: all, limitedRole: false })).toMatchObject({ action: "passthrough", warn: expect.any(String) });
  });
});

describe("portée de requête", () => {
  it("rend l'institut visible après un contrôle async", async () => {
    const guard = async () => {
      await flush();
      bindOrganization("org_a");
    };
    const scope = tenantScope(null);
    await runInScope(scope, guard);
    expect(scope).toMatchObject({ kind: "tenant", organizationId: "org_a" });
  });

  it("refuse deux instituts différents dans une même requête", () => {
    runInScope(tenantScope("org_a"), () => {
      expect(() => bindOrganization("org_b")).toThrow(TenantContextError);
    });
  });

  it("traite un institut vide comme absent", () => {
    const scope = tenantScope(null);
    runInScope(scope, () => bindOrganization("   "));
    expect(decideQuery({ scope, setting: parseRlsSetting("all"), limitedRole: true }).action).toBe("refuse");
  });

  it("ne laisse pas un institut devenir une session plateforme", () => {
    const scope = tenantScope("org_a");
    runInScope(scope, () => bindOrganization("org_a"));
    expect(scope).toMatchObject({ kind: "tenant", organizationId: "org_a" });
    expect(decideQuery({ scope, setting: parseRlsSetting("all"), limitedRole: true }).action).toBe("tenant");
  });

  it("ne garde aucune portée entre deux requêtes", async () => {
    const seen = await Promise.all(
      ["org_a", "org_b"].map((org) =>
        runInScope(tenantScope(null), async () => {
          await flush();
          bindOrganization(org);
          await flush();
          return decideQuery({ scope: (await import("@/lib/db/tenant-context")).currentScope(), setting: parseRlsSetting("all"), limitedRole: true });
        }),
      ),
    );
    expect(seen).toEqual([{ action: "tenant", organizationId: "org_a" }, { action: "tenant", organizationId: "org_b" }]);
  });
});

describe("wrappers de route", () => {
  const original = process.env.RLS_ENFORCE;
  afterEach(() => {
    if (original === undefined) delete process.env.RLS_ENFORCE;
    else process.env.RLS_ENFORCE = original;
  });

  it("répond 403 quand une route métier interroge la base sans institut", async () => {
    process.env.RLS_ENFORCE = "all";
    const { pool } = fakePool();
    const route = tenantRoute(async () => {
      await pool.query("SELECT 1");
      return new Response("ok");
    });
    const response = await route();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "TENANT_CONTEXT_MISSING" });
  });

  it("laisse passer une route publique", async () => {
    process.env.RLS_ENFORCE = "all";
    const { pool } = fakePool();
    const route = publicRoute(async () => {
      await pool.query("SELECT 1");
      return new Response("ok");
    });
    expect((await route()).status).toBe(200);
  });
});

describe("couche de connexion", () => {
  const original = process.env.RLS_ENFORCE;
  const originalKey = process.env.RLS_CONTEXT_KEY;
  const roleEnv = [
    "RAPPEL_PLATFORM_DATABASE_URL",
    "RAPPEL_PUBLIC_DATABASE_URL",
    "RAPPEL_JOB_DATABASE_URL",
    "RLS_PILOT",
    "RLS_PILOT_ORG",
    "RLS_PILOT_DATABASE_URL",
  ] as const;
  const originalRoles = Object.fromEntries(roleEnv.map((name) => [name, process.env[name]]));
  const inA = <T,>(fn: () => Promise<T>) => runInScope(tenantScope("org_a"), fn);
  beforeEach(() => {
    process.env.RLS_ENFORCE = "all";
    process.env.RLS_CONTEXT_KEY = "unit-test-rls-context-key";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.RLS_ENFORCE;
    else process.env.RLS_ENFORCE = original;
    if (originalKey === undefined) delete process.env.RLS_CONTEXT_KEY;
    else process.env.RLS_CONTEXT_KEY = originalKey;
    for (const name of roleEnv) {
      const value = originalRoles[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("limite le contexte à une transaction autour de chaque requête", async () => {
    const { pool, calls, params } = fakePool();
    await inA(() => pool.query("SELECT 1"));
    await flush();
    expect(calls).toEqual(["BEGIN", "SET", "SELECT", "COMMIT", "RELEASE"]);
    expect(params[0]).toEqual(["org_a", "off", "tenant", rlsContextProof("tenant", "org_a", "off")]);
  });

  it("garde un institut sur ses lignes même si le réglage d'application est vide", async () => {
    process.env.RLS_ENFORCE = "";
    const { pool, params } = fakePool();
    await inA(() => pool.query("SELECT 1"));
    expect(params[0].slice(0, 3)).toEqual(["org_a", "off", "tenant"]);
  });

  it("signe l'institut d'une route publique sans lui ouvrir la session", async () => {
    const { pool, params } = fakePool();
    await runInScope({ kind: "public", reason: "réservation" }, async () => {
      bindPublicInstitute("org_a");
      await pool.query("SELECT 1");
    });
    expect(params[0].slice(0, 3)).toEqual(["org_a", "off", "tenant"]);
    expect(params[0][3]).toBe(rlsContextProof("tenant", "org_a", "off"));
  });

  it("ne donne pas à un institut la preuve d'une session plateforme", async () => {
    const { pool, params } = fakePool();
    await runInScope({ kind: "platform", reason: "t" }, () => pool.query("SELECT 1"));
    expect(params[0].slice(0, 3)).toEqual(["", "on", "platform"]);
    expect(params[0][3]).toBe(rlsContextProof("platform", "", "on"));
    expect(params[0][3]).not.toBe(rlsContextProof("tenant", "org_a", "off"));
  });

  it("annule la transaction implicite si la requête échoue", async () => {
    const { pool, calls, client } = fakePool();
    const base = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: unknown, v?: unknown[]) => {
      if (sql === "SELECT 1/0") throw new Error("division");
      return base(sql, v);
    });
    await expect(inA(() => pool.query("SELECT 1/0"))).rejects.toThrow("division");
    await flush();
    expect(calls).toEqual(["BEGIN", "SET", "ROLLBACK", "RELEASE"]);
  });

  it("place le contexte juste après un BEGIN explicite, une seule fois", async () => {
    const { pool, calls } = fakePool();
    await inA(async () => {
      const c = await pool.connect();
      await c.query("BEGIN");
      await c.query("SELECT 1");
      await c.query("COMMIT");
      c.release();
    });
    await flush();
    expect(calls).toEqual(["BEGIN", "SET", "SELECT", "COMMIT", "RELEASE"]);
  });

  it("n'exécute jamais une requête lancée sans attendre avant son contexte", async () => {
    const { pool, calls } = fakePool();
    await inA(async () => {
      const c = await pool.connect();
      await Promise.all([c.query("BEGIN"), c.query("SELECT 1")]);
      await c.query("COMMIT");
      c.release();
    });
    await flush();
    expect(calls.slice(0, 3)).toEqual(["BEGIN", "SET", "SELECT"]);
  });

  it("annule une transaction restée ouverte avant de rendre la connexion", async () => {
    const { pool, calls } = fakePool();
    await inA(async () => {
      const c = await pool.connect();
      await c.query("BEGIN");
      c.release();
    });
    await flush();
    expect(calls.slice(-2)).toEqual(["ROLLBACK", "RELEASE"]);
  });

  it("garde ROLLBACK sans fin de transaction sur un point de sauvegarde", async () => {
    const { pool, calls } = fakePool();
    await inA(async () => {
      const c = await pool.connect();
      await c.query("BEGIN");
      await c.query("ROLLBACK TO SAVEPOINT s");
      c.release();
    });
    await flush();
    expect(calls.slice(-2)).toEqual(["ROLLBACK", "RELEASE"]);
  });

  it("détruit la connexion si l'annulation échoue", async () => {
    const { pool, client, calls } = fakePool();
    const spy = client.query;
    await inA(async () => {
      const c = await pool.connect();
      await c.query("BEGIN");
      spy.mockRejectedValueOnce(new Error("perdue"));
      c.release();
    });
    await flush();
    expect(calls[calls.length - 1]).toBe("DESTROY");
  });

  it("absorbe une coupure pendant un emprunt puis détruit la connexion", async () => {
    const { pool, calls, listeners } = fakePool();
    await inA(async () => {
      const c = await pool.connect();
      expect(listeners.size).toBe(1);
      [...listeners].forEach((fn) => fn(new Error("Connection terminated unexpectedly")));
      c.release();
    });
    await flush();
    expect(calls[calls.length - 1]).toBe("DESTROY");
    expect(listeners.size).toBe(0);
  });

  it("protège aussi les emprunts quand l'isolation est inactive", async () => {
    process.env.RLS_ENFORCE = "";
    const { pool, calls, listeners } = fakePool(true);
    const c = await pool.connect();
    expect(listeners.size).toBe(1);
    await c.query("BEGIN");
    c.release();
    await flush();
    expect(calls).toEqual(["BEGIN", "ROLLBACK", "RELEASE"]);
  });

  it("écoute les erreurs des connexions inactives", () => {
    const { raw } = fakePool();
    expect(raw.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("ignore un double release", async () => {
    const { pool, calls } = fakePool();
    await inA(async () => {
      const c = await pool.connect();
      c.release();
      c.release();
    });
    await flush();
    expect(calls.filter((x) => x === "RELEASE")).toHaveLength(1);
  });

  it("isolation inactive et superutilisateur : requête directe, rien d'ajouté", async () => {
    process.env.RLS_ENFORCE = "";
    const { pool, calls, rawConnect } = fakePool(true);
    await inA(() => pool.query("SELECT 1"));
    expect(calls).toEqual(["DIRECT"]);
    expect(rawConnect).not.toHaveBeenCalled();
  });

  it("n'envoie vers la connexion limitée que la session de l'institut pilote", () => {
    const pilot = "postgresql://rappel_app:unit@127.0.0.1/db";
    process.env.RLS_PILOT = "on";
    process.env.RLS_PILOT_ORG = "org_demo";
    process.env.RLS_PILOT_DATABASE_URL = pilot;
    expect(pilotConnectionString({ kind: "tenant", organizationId: "org_demo" })).toBe(pilot);
    expect(pilotConnectionString({ kind: "tenant", organizationId: "org_autre" })).toBeUndefined();
    expect(pilotConnectionString({ kind: "public", reason: "page", organizationId: "org_demo" })).toBeUndefined();
    expect(pilotConnectionString({ kind: "job", reason: "relance" })).toBeUndefined();
    expect(pilotConnectionString({ kind: "platform", reason: "back-office" })).toBeUndefined();
    process.env.RLS_PILOT = "off";
    expect(pilotConnectionString({ kind: "tenant", organizationId: "org_demo" })).toBeUndefined();
  });

  it("refuse un pilote qui réutilise la connexion de base", async () => {
    const url = "postgresql://rappel_app:unit@127.0.0.1/db";
    process.env.RLS_PILOT = "on";
    process.env.RLS_PILOT_ORG = "org_a";
    process.env.RLS_PILOT_DATABASE_URL = url;
    const { pool, rawConnect } = fakePool(false, url);
    await expect(inA(() => pool.query("SELECT 1"))).rejects.toThrow("connexion de base");
    expect(rawConnect).not.toHaveBeenCalled();
  });

  it("refuse une connexion de rôle incomplète au lieu de revenir à la base", async () => {
    process.env.RAPPEL_PUBLIC_DATABASE_URL = "postgresql://rappel_public:secret@127.0.0.1/db";
    const { pool, rawConnect } = fakePool();
    await expect(
      runInScope(publicScope, () => pool.query("SELECT 1")),
    ).rejects.toThrow("doivent être définies ensemble");
    expect(rawConnect).not.toHaveBeenCalled();
    expect(String(rawConnect.mock.calls)).not.toContain("secret");
  });

  it("n'ouvre aucune connexion pour un accès refusé", async () => {
    const { pool, rawConnect } = fakePool();
    await expect(runInScope(tenantScope(null), () => pool.query("SELECT 1"))).rejects.toBeInstanceOf(TenantContextError);
    await expect(pool.connect()).rejects.toBeInstanceOf(TenantContextError);
    expect(rawConnect).not.toHaveBeenCalled();
  });

  it("laisse intact l'appel interne de pg avec callback", () => {
    const { pool, rawConnect } = fakePool();
    const cb = vi.fn();
    (pool as unknown as { connect: (c: unknown) => void }).connect(cb);
    expect(rawConnect).toHaveBeenCalledWith(cb);
  });
});

describe("garanties du code source", () => {
  const walk = (dir: string, match: (f: string) => boolean, out: string[] = []): string[] => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, match, out);
      else if (match(e.name)) out.push(p);
    }
    return out;
  };

  it("chaque handler de route déclare sa portée", () => {
    const bare = walk(path.join(root, "src/app"), (f) => f === "route.ts").filter((f) =>
      /^export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/m.test(fs.readFileSync(f, "utf8")),
    );
    expect(bare).toEqual([]);
  });

  it("chaque pool applicatif passe par la couche d'isolation", () => {
    const bare = walk(path.join(root, "src"), (f) => /\.tsx?$/.test(f)).filter((f) => {
      if (f.split(path.sep).join("/").endsWith("api/health/db/route.ts")) return false;
      if (f.endsWith("tenant-pool.ts")) return false;
      const src = fs.readFileSync(f, "utf8");
      return /new Pool\(/.test(src) && !/withTenantIsolation\(/.test(src);
    });
    expect(bare).toEqual([]);
  });

  it("seul le contrôle de session fixe l'institut d'une route métier", () => {
    const callers = walk(path.join(root, "src"), (f) => /\.tsx?$/.test(f)).filter((f) => {
      if (f.endsWith(`${path.sep}tenant-context.ts`)) return false;
      return fs.readFileSync(f, "utf8").includes("bindOrganization(");
    });
    expect(callers.map((f) => path.basename(f))).toEqual(["api-guard.ts"]);
  });

  it("la sonde de base suit la connexion publique", () => {
    const src = fs.readFileSync(path.join(root, "src/app/api/health/db/route.ts"), "utf8");
    expect(src).toContain('connectionStringFor("public")');
    expect(src).not.toContain("DATABASE_URL not configured");
  });

  it("n'utilise plus de module interne de Next", () => {
    const uses = walk(path.join(root, "src"), (f) => /\.tsx?$/.test(f)).filter((f) =>
      fs.readFileSync(f, "utf8").includes("request-async-storage"),
    );
    expect(uses).toEqual([]);
  });

  it("chaque table portant organizationId a une politique qui refuse par défaut", () => {
    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
    const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
      .filter((m) => /^\s+organizationId\s+String\b/m.test(m[2]))
      .map((m) => m[1]);
    const dir = path.join(root, "prisma/migrations");
    const sql = fs
      .readdirSync(dir)
      .filter((d) => fs.existsSync(path.join(dir, d, "migration.sql")))
      .map((d) => fs.readFileSync(path.join(dir, d, "migration.sql"), "utf8"))
      .join("\n");
    const missing = models.filter(
      (t) => !sql.includes(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`),
    );
    expect(missing).toEqual([]);
    const bypasses = [...sql.matchAll(/CREATE OR REPLACE FUNCTION app_rls_bypass\(\) RETURNS boolean[\s\S]*?AS \$\$[\s\S]*?\$\$/g)];
    expect(bypasses.at(-1)?.[0]).toContain("current_user IN ('rappel_platform', 'rappel_job')");
    expect(bypasses.at(-1)?.[0]).not.toContain("rappel_public");
    expect(bypasses.at(-1)?.[0]).not.toContain("current_setting('app.rls_bypass'");
    const reads = [...sql.matchAll(/CREATE POLICY platform_audit_read ON "PlatformAuditLog" FOR SELECT USING \(([^;]+)\)/g)];
    const inserts = [...sql.matchAll(/CREATE POLICY platform_audit_insert ON "PlatformAuditLog" FOR INSERT WITH CHECK \(([^;]+)\)/g)];
    expect(reads.at(-1)?.[1]).toBe("current_user = 'rappel_platform'");
    expect(inserts.at(-1)?.[1]).toBe("current_user IN ('rappel_platform', 'rappel_public')");
    expect(sql).not.toMatch(/CREATE POLICY \w+ ON "PlatformAuditLog" FOR (UPDATE|DELETE)/);
    expect(sql).not.toMatch(/CREATE POLICY \w+ ON "PlatformAuditLog" USING \(app_rls_bypass\(\)/);
    expect(sql).not.toContain("app_current_org() IS NULL OR");
  });
});
