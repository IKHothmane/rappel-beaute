import { Client, Pool } from "pg";
import { withTenantIsolation } from "@/lib/db/tenant-pool";

/**
 * Aide pour les tests qui vérifient les quatre rôles (rappel_app, rappel_platform, rappel_public,
 * rappel_job) sur une base locale jetable. Elle pose des mots de passe de test sur ces rôles :
 * elle refuse toute base qui n'est pas sur 127.0.0.1 / localhost.
 */
export const ROLE_PASSWORD = "local-test-only-password-000";
export const ROLE_NAMES = ["rappel_app", "rappel_platform", "rappel_public", "rappel_job"] as const;

export function rolesAdminUrl(): string {
  const url = process.env.RLS_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  return /@(127\.0\.0\.1|localhost)[:/]/.test(url) ? url : "";
}

export function roleUrl(adminUrl: string, role: string): string {
  const url = new URL(adminUrl);
  url.username = role;
  url.password = ROLE_PASSWORD;
  return url.toString();
}

const ENV_KEYS = [
  "RAPPEL_PLATFORM_DATABASE_URL",
  "RAPPEL_PUBLIC_DATABASE_URL",
  "RAPPEL_JOB_DATABASE_URL",
  "RLS_CONTEXT_KEY",
  "RLS_ENFORCE",
] as const;

/** Prépare les rôles et les variables d'environnement ; renvoie la fonction qui restaure l'environnement. */
export async function prepareRoles(admin: Client, adminUrl: string): Promise<() => void> {
  const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  if (!process.env.RLS_CONTEXT_KEY) process.env.RLS_CONTEXT_KEY = "local-rls-context-key-000000000000";
  for (const role of ROLE_NAMES) {
    await admin.query(`ALTER ROLE ${role} LOGIN PASSWORD '${ROLE_PASSWORD}'`);
  }
  process.env.RAPPEL_PLATFORM_DATABASE_URL = roleUrl(adminUrl, "rappel_platform");
  process.env.RAPPEL_PUBLIC_DATABASE_URL = roleUrl(adminUrl, "rappel_public");
  process.env.RAPPEL_JOB_DATABASE_URL = roleUrl(adminUrl, "rappel_job");
  await admin.query(
    `INSERT INTO app_private.context_key(id, value) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`,
    [process.env.RLS_CONTEXT_KEY],
  );
  process.env.RLS_ENFORCE = "all";
  return () => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  };
}

/** Pool dont la connexion de base est rappel_app ; les portées public/plateforme/tâche changent de rôle. */
export function appPool(adminUrl: string, max = 4): Pool {
  return withTenantIsolation(new Pool({ connectionString: roleUrl(adminUrl, "rappel_app"), max }));
}
