import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Portée d'exécution des accès base de données.
 *
 * Chaque route, page serveur ou tâche de fond déclare explicitement dans quel cadre elle s'exécute :
 * - `tenant`   : route métier d'un institut, l'institut est fixé par le contrôle de session ;
 * - `public`   : site public, réservation, authentification, webhooks ;
 * - `platform` : back-office ;
 * - `job`      : cron et tâches de fond.
 *
 * Activation et règles de décision : voir docs/rls-activation.md.
 */
export type TenantScope =
  | { kind: "tenant"; organizationId: string | null }
  | { kind: "public" | "platform" | "job"; reason: string };

type RlsSetting = { kind: "off" } | { kind: "all" } | { kind: "list"; ids: Set<string> };

export type QueryDecision =
  | { action: "passthrough"; warn?: string }
  | { action: "tenant"; organizationId: string }
  | { action: "bypass"; warn?: string }
  | { action: "refuse"; message: string };

export class TenantContextError extends Error {
  readonly code = "TENANT_CONTEXT_MISSING";
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

const globalForScope = globalThis as unknown as { __rappelTenantScope?: AsyncLocalStorage<TenantScope> };
// Une seule instance, même si Next charge ce module dans plusieurs bundles.
const storage = (globalForScope.__rappelTenantScope ??= new AsyncLocalStorage<TenantScope>());

export function runInScope<T>(scope: TenantScope, fn: () => T): T {
  return storage.run(scope, fn);
}

export function currentScope(): TenantScope | undefined {
  return storage.getStore();
}

/** Tâche de fond ou accès volontairement inter-instituts : l'autorisation est explicite et motivée. */
export function runAsJob<T>(reason: string, fn: () => T): T {
  return runInScope({ kind: "job", reason }, fn);
}

/**
 * Fixe l'institut de la requête en cours, appelé par le contrôle de session.
 * La portée est mutable : un contrôle `await` dans une fonction appelée reste visible de la route.
 */
export function bindOrganization(organizationId: string | null | undefined): void {
  const scope = storage.getStore();
  if (!scope) return;
  const next = organizationId?.trim() || null;
  if (scope.kind === "tenant" && scope.organizationId && next && scope.organizationId !== next) {
    throw new TenantContextError("Institut différent dans une même requête.");
  }
  const mutable = scope as { kind: string; organizationId?: string | null; reason?: string };
  mutable.kind = "tenant";
  mutable.organizationId = next;
  delete mutable.reason;
}

export function parseRlsSetting(raw = process.env.RLS_ENFORCE): RlsSetting {
  const value = raw?.trim();
  if (!value) return { kind: "off" };
  if (value === "all") return { kind: "all" };
  return { kind: "list", ids: new Set(value.split(",").map((s) => s.trim()).filter(Boolean)) };
}

/**
 * Décide comment exécuter un accès base. Fonction pure, au cœur de la garantie :
 * une route métier sans institut est refusée dès que l'isolation est active, et `all` refuse tout
 * accès sans portée déclarée.
 *
 * `limitedRole` : le rôle de connexion est soumis aux règles RLS. Les règles refusant tout par défaut,
 * ce rôle doit toujours annoncer son cadre, même isolation inactive.
 */
export function decideQuery(input: {
  scope: TenantScope | undefined;
  setting: RlsSetting;
  limitedRole: boolean;
}): QueryDecision {
  const { scope, setting, limitedRole } = input;
  const open = (warn?: string): QueryDecision =>
    limitedRole ? { action: "bypass", warn } : { action: "passthrough", warn };

  if (setting.kind === "off") return open();

  if (!scope) {
    if (setting.kind === "all") return { action: "refuse", message: "Accès base sans portée déclarée." };
    return open("Accès base sans portée déclarée.");
  }
  if (scope.kind !== "tenant") return open();
  if (!scope.organizationId) return { action: "refuse", message: "Route institut sans institut défini." };

  const enforced = setting.kind === "all" || setting.ids.has(scope.organizationId);
  if (!enforced) return open();
  if (!limitedRole) {
    return { action: "passthrough", warn: "RLS_ENFORCE actif avec un rôle qui ignore les règles : aucune protection." };
  }
  return { action: "tenant", organizationId: scope.organizationId };
}
