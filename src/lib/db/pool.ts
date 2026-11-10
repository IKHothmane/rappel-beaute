import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/db/tenant-pool";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

/**
 * Un seul pool partagé. Chaque fichier `new Pool()` ouvrait jusqu'à 10
 * connexions : au chargement du dashboard (~20 API), Postgres saturait.
 */
export const pool =
  globalForPg.pgPool ??
  withTenantIsolation(
    new Pool({
      connectionString: process.env.DATABASE_URL,
      // Instance Railway unique : 5 connexions suffisent et coûtent moins de RAM.
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    }),
  );

// Toujours réutiliser le pool (HMR local + multi-chargements Next).
globalForPg.pgPool = pool;

if (process.env.NEXT_PHASE !== "phase-production-build") {
  void import("@/lib/push/scheduler").then((mod) => mod.startCustomerPushScheduler());
  void import("@/lib/loyalty/google-wallet-notify").then((mod) => mod.startGoogleWalletNotifier());
  void import("@/lib/loyalty/apple-wallet-sync").then((mod) => mod.startAppleWalletUpdates());
}
