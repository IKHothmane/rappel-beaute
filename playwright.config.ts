import { defineConfig, devices } from "@playwright/test";

/**
 * Cible par défaut :
 * - CI : l'application démarrée par le workflow sur sa base dédiée (port 3000) ;
 * - local : le serveur de test `npm run dev:test` (port 3100, base DATABASE_TEST_URL),
 *   jamais le serveur de dev habituel branché sur DATABASE_URL.
 */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (process.env.CI ? "http://127.0.0.1:3000" : "http://127.0.0.1:3100");

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const PRODUCTION_HOST = /(^|\.)rappelbeauty\.com$/i;

/** Les parcours E2E se connectent et écrivent : jamais sur la production. */
function assertSafeTarget(url: string): void {
  const host = new URL(url).hostname;
  if (PRODUCTION_HOST.test(host)) {
    throw new Error(`[e2e] Refus : ${host} est la production.`);
  }
  if (!LOCAL_HOSTS.includes(host) && process.env.PLAYWRIGHT_ALLOW_REMOTE !== "1") {
    throw new Error(
      `[e2e] ${host} n'est pas local. Pour un environnement distant de test, ` +
        "définissez PLAYWRIGHT_ALLOW_REMOTE=1.",
    );
  }
}

assertSafeTarget(baseURL);

/** En CI le workflow démarre l'app lui-même (logs visibles) — ne pas double-lancer. */
const skipWebServer =
  Boolean(process.env.PLAYWRIGHT_SKIP_WEBSERVER) || !process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: "npx next start -H 127.0.0.1 -p 3000",
        url: `${baseURL.replace(/\/$/, "")}/api/health/`,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
