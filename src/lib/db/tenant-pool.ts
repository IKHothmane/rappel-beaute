import type { Pool, PoolClient } from "pg";
import { logger } from "@/lib/logger";
import {
  currentScope,
  decideQuery,
  parseRlsSetting,
  TenantContextError,
  type QueryDecision,
} from "@/lib/db/tenant-context";

/**
 * Couche posée sur chaque pool PostgreSQL :
 * - annonce à Postgres le cadre de chaque accès, avec une portée limitée à la transaction
 *   (`set_config(..., true)`) : une connexion rendue au pool ne peut pas conserver un institut ;
 * - annule toute transaction restée ouverte avant de rendre une connexion ;
 * - empêche qu'une coupure réseau arrête le processus.
 */
const SET_CONTEXT = `SELECT set_config('app.current_org', $1, true), set_config('app.rls_bypass', $2, true)`;
const ROLE_CHECK = `SELECT (rolsuper OR rolbypassrls) AS privileged FROM pg_roles WHERE rolname = current_user`;
const BEGIN_RE = /^\s*(BEGIN|START\s+TRANSACTION)\b/i;
const END_RE = /^\s*(COMMIT|END|ABORT|ROLLBACK(?!\s+(WORK\s+|TRANSACTION\s+)?TO\b))\b/i;

type QueryFn = (...args: unknown[]) => Promise<unknown>;
type ContextValues = [string, string] | null;

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
  if (decision.action === "tenant") return [decision.organizationId, "off"];
  if (decision.action === "bypass") return ["", "on"];
  return null;
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
  let limitedRole: boolean | null = null;

  pool.on?.("error", (error: Error) => {
    logger.warn("connexion PostgreSQL inactive perdue", { route: "db/tenant-pool", detail: error.message });
  });

  async function isLimitedRole(): Promise<boolean> {
    if (limitedRole !== null) return limitedRole;
    try {
      const result = (await rawQuery(ROLE_CHECK)) as { rows: { privileged: boolean }[] };
      limitedRole = result.rows[0]?.privileged !== true;
      return limitedRole;
    } catch {
      // Incertain : annoncer le cadre est sans effet sur un superutilisateur, l'inverse donnerait 0 ligne.
      return true;
    }
  }

  async function resolveDecision(): Promise<QueryDecision> {
    const decision = decideQuery({
      scope: currentScope(),
      setting: parseRlsSetting(),
      limitedRole: await isLimitedRole(),
    });
    if (decision.action === "refuse") throw new TenantContextError(decision.message);
    if ("warn" in decision && decision.warn) warnOnce(decision.warn);
    return decision;
  }

  const patched = pool as unknown as {
    connect: (cb?: unknown) => unknown;
    query: (...args: unknown[]) => unknown;
  };

  // pg appelle connect avec un callback depuis pool.query : ce chemin interne reste inchangé.
  patched.connect = (cb?: unknown) => {
    if (typeof cb === "function") return rawConnect(cb);
    return (async () => {
      const decision = await resolveDecision();
      return guardClient(await rawConnect(), contextValues(decision));
    })();
  };

  patched.query = (...args: unknown[]) => {
    if (typeof args[args.length - 1] === "function") return rawQuery(...args);
    return (async () => {
      const decision = await resolveDecision();
      const context = contextValues(decision);
      if (!context) return rawQuery(...args);
      const client = guardClient(await rawConnect(), context);
      try {
        return await (client.query as unknown as QueryFn)(...args);
      } finally {
        client.release();
      }
    })();
  };

  return pool;
}
