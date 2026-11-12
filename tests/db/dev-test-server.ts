/**
 * Serveur Next.js branché sur la base de test — cible des tests Playwright en local.
 *
 *   npm run dev:test      → http://127.0.0.1:3100, base DATABASE_TEST_URL
 *
 * Le serveur de dev habituel (port 3000) utilise DATABASE_URL ; celui-ci ne
 * peut utiliser que la base de test, sinon il refuse de démarrer.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";
import { enforceTestDatabase } from "../helpers/test-database";
import { ensureTestDatabase } from "./test-db.mjs";

const PORT = process.env.TEST_SERVER_PORT ?? "3100";

async function main() {
  dotenv.config({ quiet: true });

  if (enforceTestDatabase() === "skipped") {
    console.error("[dev:test] DATABASE_TEST_URL absent : serveur de test non démarré.");
    process.exit(1);
  }

  const stopDatabase = await ensureTestDatabase(process.env.DATABASE_URL as string);

  const root = path.resolve(__dirname, "..", "..");
  const child = spawn(
    process.execPath,
    [
      "--require",
      "./dev-preload.cjs",
      "./node_modules/next/dist/bin/next",
      "dev",
      "-H",
      "127.0.0.1",
      "-p",
      PORT,
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        // Chaîne vide : Next ne recharge pas ces clés depuis .env.
        DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL ?? "",
        REDIS_URL: process.env.REDIS_URL ?? "",
        // Dossier de build séparé pour cohabiter avec `npm run dev`.
        NEXT_BUILD_DIR: ".next-test",
      },
    },
  );

  const shutdown = async (code: number) => {
    if (!child.killed) child.kill();
    if (stopDatabase) await stopDatabase();
    process.exit(code);
  };
  child.on("exit", (code) => void shutdown(code ?? 0));
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
