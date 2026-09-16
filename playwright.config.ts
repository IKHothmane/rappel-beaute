import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

/**
 * En CI : ne pas passer par `npm run start` (migrate deploy + next start).
 * Les migrations sont déjà appliquées dans le workflow ; relancer migrate
 * peut bloquer le webServer. On bind explicitement 127.0.0.1 (évite le
 * décalage IPv6/IPv4 sur les runners GitHub) et on sonde /api/health/.
 */
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
  webServer: process.env.CI
    ? {
        command: "npx next start -H 127.0.0.1 -p 3000",
        url: `${baseURL.replace(/\/$/, "")}/api/health/`,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      }
    : undefined,
});
