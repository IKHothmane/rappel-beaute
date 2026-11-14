import { Pool, type PoolClient } from "pg";
import { logger } from "@/lib/logger";
import {
  currentScope,
  decideQuery,
  parseRlsSetting,
  TenantContextError,
  type QueryDecision,
  type TenantScope,
} from "@/lib/db/tenant-context";
import { rlsContextProof } from "@/lib/db/rls-proof";

/**
 * Couche posée sur chaque pool PostgreSQL :
 * - annonce à Postgres le cadre de chaque accès, avec une portée limitée à la transaction
 *   (`set_config(..., true)`) : une connexion rendue au pool ne peut pas conserver un institut ;
 * - annule toute transaction restée ouverte avant de rendre une connexion ;
 * - empêche qu'une coupure réseau arrête le processus.
 */
const SET_CONTEXT = `SELECT set_config('app.current_org', $1, true), set_config('app.rls_bypass', $2, true), set_config('app.scope', $3, true), set_config('app.scope_proof', $4, true)`;
const ROLE_CHECK = `SELECT (rolsuper OR rolbypassrls) AS privileged FROM pg_roles WHERE rolname = current_user`;
const BEGIN_RE = /^\s*(BEGIN|START\s+TRANSACTION)\b/i;
const END_RE = /^\s*(COMMIT|END|ABORT|ROLLBACK(?!\s+(WORK\s+|TRANSACTION\s+)?TO\b))\b/i;

type QueryFn = (...args: unknown[]) => Promise<unknown>;
type ContextValues = [string, string, string, string] | null;

function contextRow(scope: string, organizationId: string, bypass: "on" | "off"): ContextValues {
  return [organizationId, bypass, scope, rlsContextProof(scope, organizationId, bypass)];
}

const reported = new Set<string>();
function warnOnce(message: string): void {
  const origin = new Error().stack?.split("\n").find((l) => l.includes("/src/") && !l.includes("tenant-")) ?? "";
  const key = `${message}|${origin.trim()}`;
  if (reported.size > 200 || reported.has(key)) return;
  reported.add(key);
  logger.error(message, { route: "db/tenant-pool", origin: origin.trim() });
}

function sqlText(arg: unknown): string {
  if (typeof arg === "string") return arg;
  const text = (arg as { text?: unknown } | null | undefined)?.text;
  return typeof text === "string" ? text : "";
}

function contextValues(decision: QueryDecision): ContextValues {
  const scope = currentScope();
  if (decision.action === "passthrough") return null;
  // Un institut reste sur ses lignes. La variable app.rls_bypass n'ouvre plus ses tables.
  if (scope?.kind === "tenant" && scope.organizationId) return contextRow("tenant", scope.organizationId, "off");
  if (scope?.kind === "public" && scope.organizationId) return contextRow("tenant", scope.organizationId, "off");
  if (decision.action === "tenant") return contextRow("tenant", decision.organizationId, "off");
  if (decision.action !== "bypass") return null;
  if (scope && scope.kind !== "tenant") return contextRow(scope.kind, "", "on");
  return contextRow("unscoped", "", "on");
}

const ROLE_URLS = ["RAPPEL_PLATFORM_DATABASE_URL", "RAPPEL_PUBLIC_DATABASE_URL", "RAPPEL_JOB_DATABASE_URL"] as const;

let pilotAnnounced = false;
const PILOT_CHECK = `SELECT current_user AS role, (rolsuper OR rolbypassrls) AS privileged FROM pg_roles WHERE rolname = current_user`;

/**
 * Connexion rappel_app du seul institut pilote.
 * L'identifiant comparé est celui de la session, déjà posé sur la portée métier.
 * RLS_PILOT doit valoir on, avec l'institut et l'URL. Sinon tout reste sur la connexion de base.
 * L'URL n'est jamais journalisée.
 */
export function pilotConnectionString(scope: TenantScope | undefined): string | undefined {
  if (process.env.RLS_PILOT?.trim() !== "on") return undefined;
  const org = process.env.RLS_PILOT_ORG?.trim();
  const url = process.env.RLS_PILOT_DATABASE_URL?.trim();
  if (!org || !url) return undefined;
  if (scope?.kind !== "tenant" || scope.organizationId !== org) return undefined;
  return url;
}

/**
 * URL du rôle demandé. Tant que les trois sont absentes, l'appelant reste sur DATABASE_URL.
 * Dès qu'une est posée, les trois sont exigées : une route ne retombe pas sur la connexion de base.
 * L'erreur ne contient jamais l'URL.
 */
export function connectionStringFor(kind: "platform" | "public" | "job" | "tenant" | undefined): string | undefined {
  const present = ROLE_URLS.filter((name) => process.env[name]);
  if (present.length === 0) return undefined;
  if (present.length !== ROLE_URLS.length) {
    throw new TenantContextError("Les connexions plateforme, publique et tâche doivent être définies ensemble.");
  }
  if (kind === "platform") return process.env.RAPPEL_PLATFORM_DATABASE_URL;
  if (kind === "public") return process.env.RAPPEL_PUBLIC_DATABASE_URL;
  if (kind === "job") return process.env.RAPPEL_JOB_DATABASE_URL;
  return undefined;
}

/** Sur place, pour la durée d'un emprunt : le client retrouve son état d'origine au retour au pool. */
function guardClient(client: PoolClient, context: ContextValues): PoolClient {
  const original = client.query as unknown as QueryFn;
  const release = client.release.bind(client);
  const call = (args: unknown[]) => original.apply(client, args);
  let inTransaction = false;
  let broken = false;
  let released = false;

  const onError = (error: Error) => {
    broken = true;
    logger.warn("connexion PostgreSQL perdue pendant un emprunt", {
      route: "db/tenant-pool",
      detail: error.message,
    });
  };
  client.on("error", onError);

  // File par connexion : une séquence BEGIN / contexte / requête / COMMIT ne peut pas être entrecoupée.
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const run = tail.then(operation);
    tail = run.catch(() => undefined);
    return run;
  };

  const guarded = (...args: unknown[]): Promise<unknown> => {
    if (typeof args[args.length - 1] === "function") return call(args);
    const sql = sqlText(args[0]);

    if (BEGIN_RE.test(sql)) {
      inTransaction = true;
      return enqueue(async () => {
        const result = await call(args);
        if (context) await call([SET_CONTEXT, context]);
        return result;
      });
    }
    if (inTransaction) {
      if (END_RE.test(sql)) inTransaction = false;
      return enqueue(() => call(args));
    }
    if (!context) return enqueue(() => call(args));

    return enqueue(async () => {
      await call(["BEGIN"]);
      try {
        await call([SET_CONTEXT, context]);
        const result = await call(args);
        await call(["COMMIT"]);
        return result;
      } catch (error) {
        await call(["ROLLBACK"]).catch(() => {
          broken = true;
        });
        throw error;
      }
    });
  };
  (client as unknown as { query: unknown }).query = guarded;

  client.release = (destroy?: boolean | Error) => {
    if (released) return;
    released = true;
    const finish = (value?: boolean | Error) => {
      client.removeListener("error", onError);
      delete (client as unknown as { query?: unknown }).query;
      release(value);
    };
    if (destroy || broken) {
      finish(destroy || true);
      return;
    }
    // Après les commandes encore en file, pour ne jamais rendre une connexion occupée.
    void tail.then(() => {
      if (broken) {
        finish(true);
        return;
      }
      if (!inTransaction) {
        finish();
        return;
      }
      logger.warn("transaction encore ouverte au retour de connexion : annulée", { route: "db/tenant-pool" });
      call(["ROLLBACK"]).then(
        () => finish(),
        () => finish(true),
      );
    });
  };
  return client;
}

/** Ajoute la couche à un pool, sans changer ses appels ni sa taille. */
export function withTenantIsolation<P extends Pool>(pool: P): P {
  const rawConnect = pool.connect.bind(pool) as unknown as (cb?: unknown) => Promise<PoolClient>;
  const rawQuery = pool.query.bind(pool) as unknown as QueryFn;
  const rawEnd = typeof pool.end === "function" ? pool.end.bind(pool) : null;
  const owned = new Map<string, Pool>();
  const limited = new WeakMap<Pool, boolean>();
  const pilotVerified = new WeakSet<Pool>();

  pool.on?.("error", (error: Error) => {
    logger.warn("connexion PostgreSQL inactive perdue", { route: "db/tenant-pool", detail: error.message });
  });

  function target(): Pool {
    const scope = currentScope();
    const pilot = pilotConnectionString(scope);
    if (pilot && pilot === pool.options?.connectionString) {
      throw new TenantContextError("La connexion pilote est la connexion de base.");
    }
    const url = pilot ?? connectionStringFor(scope?.kind);
    if (!url || url === pool.options?.connectionString) return pool;
    const existing = owned.get(url);
    if (existing) return existing;
    const extra = new Pool({
      connectionString: url,
      max: pool.options?.max ?? 5,
      idleTimeoutMillis: pool.options?.idleTimeoutMillis ?? 30_000,
      connectionTimeoutMillis: pool.options?.connectionTimeoutMillis ?? 8_000,
    });
    extra.on("error", (error: Error) => {
      logger.warn("connexion PostgreSQL inactive perdue", { route: "db/tenant-pool", detail: error.message });
    });
    owned.set(url, extra);
    return extra;
  }

  function rawOf(current: Pool): { connect: (cb?: unknown) => Promise<PoolClient>; query: QueryFn } {
    if (current === pool) return { connect: rawConnect, query: rawQuery };
    return {
      connect: current.connect.bind(current) as (cb?: unknown) => Promise<PoolClient>,
      query: current.query.bind(current) as QueryFn,
    };
  }

  async function assertPilotRole(current: Pool): Promise<void> {
    const expected = pilotConnectionString(currentScope());
    if (!expected || current.options?.connectionString !== expected || pilotVerified.has(current)) return;
    const result = (await rawOf(current).query(PILOT_CHECK)) as { rows: { role: string; privileged: boolean }[] };
    const row = result.rows[0];
    if (row?.role !== "rappel_app" || row.privileged === true) {
      throw new TenantContextError("La connexion pilote n'est pas le rôle rappel_app.");
    }
    pilotVerified.add(current);
    if (!pilotAnnounced) {
      pilotAnnounced = true;
      logger.info("pilote RLS vérifié : la session de l'institut configuré est connectée avec rappel_app", {
        route: "db/tenant-pool",
      });
    }
  }

  async function isLimitedRole(current: Pool): Promise<boolean> {
    const known = limited.get(current);
    if (known !== undefined) return known;
    try {
      const result = (await rawOf(current).query(ROLE_CHECK)) as { rows: { privileged: boolean }[] };
      const value = result.rows[0]?.privileged !== true;
      limited.set(current, value);
      return value;
    } catch {
      // Incertain : annoncer le cadre est sans effet sur un superutilisateur, l'inverse donnerait 0 ligne.
      return true;
    }
  }

  async function resolveDecision(current: Pool): Promise<QueryDecision> {
    const decision = decideQuery({
      scope: currentScope(),
      setting: parseRlsSetting(),
      limitedRole: await isLimitedRole(current),
    });
    if (decision.action === "refuse") throw new TenantContextError(decision.message);
    if ("warn" in decision && decision.warn) warnOnce(decision.warn);
    return decision;
  }

  const patched = pool as unknown as {
    connect: (cb?: unknown) => unknown;
    query: (...args: unknown[]) => unknown;
    end: Pool["end"];
  };

  // pg appelle connect avec un callback depuis pool.query : ce chemin interne reste inchangé.
  patched.connect = (cb?: unknown) => {
    if (typeof cb === "function") return rawConnect(cb);
    return (async () => {
      const current = target();
      await assertPilotRole(current);
      const decision = await resolveDecision(current);
      return guardClient(await rawOf(current).connect(), contextValues(decision));
    })();
  };

  patched.query = (...args: unknown[]) => {
    if (typeof args[args.length - 1] === "function") return rawQuery(...args);
    return (async () => {
      const current = target();
      await assertPilotRole(current);
      const raw = rawOf(current);
      const decision = await resolveDecision(current);
      const context = contextValues(decision);
      if (!context) return raw.query(...args);
      const client = guardClient(await raw.connect(), context);
      try {
        return await (client.query as unknown as QueryFn)(...args);
      } finally {
        client.release();
      }
    })();
  };

  if (rawEnd) {
    patched.end = (cb?: (err: Error) => void) => {
      const closing = Promise.all([...owned.values()].map((extra) => extra.end())).then(() => rawEnd());
      if (cb) closing.then(() => cb(undefined as unknown as Error), cb);
      return closing;
    };
  }

  return pool;
}
