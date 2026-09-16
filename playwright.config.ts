import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

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
