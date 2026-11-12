/**
 * Base PostgreSQL locale dédiée aux tests (embedded-postgres).
 *
 * Elle vit dans `.test-db/` (hors git), écoute sur 127.0.0.1 uniquement et n'a
 * aucun lien avec la base de démonstration ni avec la production.
 *
 *   node tests/db/test-db.mjs start   démarre la base et reste au premier plan
 *   node tests/db/test-db.mjs reset   supprime `.test-db/` (base locale seulement)
 *
 * `npm test` la démarre automatiquement (tests/global-setup.ts) si
 * DATABASE_TEST_URL pointe sur une adresse locale où rien n'écoute.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_DIR = process.env.TEST_DB_DIR
  ? path.resolve(process.env.TEST_DB_DIR)
  : path.join(ROOT, ".test-db", "pgdata");

export const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];

export function isLocalUrl(url) {
  try {
    return LOCAL_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(1_500, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

function run(label, args, databaseUrl) {
  const env = { ...process.env, DATABASE_URL: databaseUrl };
  // Les migrations et le seed ne doivent viser que la base de test.
  delete env.DIRECT_DATABASE_URL;
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`[test-db] ${label} a échoué :\n${result.stdout}\n${result.stderr}`);
  }
}

/**
 * Démarre la base de test locale si nécessaire.
 * @returns {Promise<null | (() => Promise<void>)>} fonction d'arrêt, ou null si
 * la base était déjà joignable (CI, instance lancée à part).
 */
export async function ensureTestDatabase(databaseUrl) {
  const url = new URL(databaseUrl);
  if (!LOCAL_HOSTS.includes(url.hostname)) return null;

  const port = Number(url.port || 5432);
  if (await portOpen("127.0.0.1", port)) return null;

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const fresh = !fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || "postgres"),
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => undefined,
    onError: (error) => console.error("[test-db]", error),
  });

  if (fresh) {
    fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
    await pg.initialise();
  }
  await pg.start();

  try {
    if (fresh) await pg.createDatabase(database);
    run(
      "prisma migrate deploy",
      [path.join(ROOT, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
      databaseUrl,
    );
    if (fresh) {
      run(
        "seed",
        [path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), "prisma/seed.ts"],
        databaseUrl,
      );
    }
  } catch (error) {
    await pg.stop();
    throw error;
  }

  return () => pg.stop();
}

async function cli() {
  const { config } = await import("dotenv");
  config({ quiet: true });
  const command = process.argv[2];
  const databaseUrl = process.env.DATABASE_TEST_URL;

  if (!databaseUrl || !isLocalUrl(databaseUrl)) {
    console.error("[test-db] DATABASE_TEST_URL doit pointer sur 127.0.0.1 pour la base locale.");
    process.exit(1);
  }

  if (command === "reset") {
    const port = Number(new URL(databaseUrl).port || 5432);
    if (await portOpen("127.0.0.1", port)) {
      console.error(`[test-db] Une base écoute encore sur le port ${port} : arrêtez-la d'abord.`);
      process.exit(1);
    }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    console.log(`[test-db] ${DATA_DIR} supprimé. La base sera recréée au prochain lancement.`);
    return;
  }

  if (command === "start") {
    const stop = await ensureTestDatabase(databaseUrl);
    if (!stop) {
      console.log("[test-db] Une base répond déjà à cette adresse.");
      return;
    }
    console.log(`[test-db] Base de test prête sur ${new URL(databaseUrl).host} — Ctrl+C pour arrêter.`);
    const shutdown = async () => {
      await stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    setInterval(() => undefined, 60_000);
    return;
  }

  console.error("Usage : node tests/db/test-db.mjs <start|reset>");
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
