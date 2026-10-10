import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

/**
 * Un seul pool partagé. Chaque fichier `new Pool()` ouvrait jusqu'à 10
 * connexions : au chargement du dashboard (~20 API), Postgres saturait.
 */
export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

if (process.env.NEXT_PHASE !== "phase-production-build") {
  void import("@/lib/push/scheduler").then((mod) => mod.startCustomerPushScheduler());
  void import("@/lib/loyalty/google-wallet-notify").then((mod) => mod.startGoogleWalletNotifier());
  void import("@/lib/loyalty/apple-wallet-sync").then((mod) => mod.startAppleWalletUpdates());
}
