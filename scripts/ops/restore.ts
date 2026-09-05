/**
 * Restore PostgreSQL depuis .dump (pg_restore) ou .sql.gz (psql).
 * Usage: DATABASE_URL=... CONFIRM=yes npx tsx scripts/ops/restore.ts backups/xxx.dump
 *
 * Fallback Docker : PG_DOCKER_CONTAINER=rappel_beaute_db
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { URL } from "url";

const file = process.argv[2];
const target = process.env.DATABASE_URL;
const confirm = process.env.CONFIRM === "yes" || process.env.CI === "true";

if (!file || !fs.existsSync(file)) {
  console.error("Usage: DATABASE_URL=... CONFIRM=yes npx tsx scripts/ops/restore.ts <fichier>");
  process.exit(1);
}
if (!target) {
  console.error("DATABASE_URL requis");
  process.exit(1);
}

const masked = target.replace(/:([^:@/]+)@/, ":***@");
console.log(`Restore vers ${masked}`);
console.log(`Fichier: ${file}`);

if (!confirm && process.stdin.isTTY) {
  console.error("Définissez CONFIRM=yes pour confirmer (staging/CI uniquement).");
  process.exit(1);
}

function hasBin(bin: string): boolean {
  try {
    execSync(`${bin} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function parseDb(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "").split("?")[0],
  };
}

function isLoopback(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

function verifyOrganizationTable(url: string) {
  const db = parseDb(url);
  if (hasBin("psql")) {
    execSync(`psql "${url}" -c "SELECT 1 FROM \\"Organization\\" LIMIT 1;"`, {
      stdio: "inherit",
      env: process.env,
    });
    return;
  }
  const container = process.env.PG_DOCKER_CONTAINER;
  if (!container) throw new Error("psql introuvable pour vérification post-restore");
  execSync(
    `docker exec -e PGPASSWORD=${db.password} ${container} psql -U ${db.user} -d ${db.database} -c "SELECT 1 FROM \\"Organization\\" LIMIT 1;"`,
    { stdio: "inherit", env: process.env },
  );
}

function runPgRestore(url: string, dumpFile: string) {
  if (hasBin("pg_restore")) {
    try {
      execSync(
        `pg_restore --dbname="${url}" --no-owner --no-acl --clean --if-exists "${dumpFile}"`,
        { stdio: "inherit", env: process.env },
      );
    } catch {
      console.warn("pg_restore a signalé des avertissements — vérification post-restore…");
      verifyOrganizationTable(url);
    }
    return;
  }

  const container = process.env.PG_DOCKER_CONTAINER;
  if (!container) {
    console.error(
      "pg_restore introuvable. Installez postgresql-client ou définissez PG_DOCKER_CONTAINER=rappel_beaute_db",
    );
    process.exit(1);
  }

  const db = parseDb(url);
  const remote = `/tmp/restore_${Date.now()}.dump`;
  console.log(`pg_restore via docker exec ${container}`);
  execSync(`docker cp "${dumpFile}" ${container}:${remote}`, { stdio: "inherit" });

  try {
    if (isLoopback(db.host)) {
      execSync(
        `docker exec -e PGPASSWORD=${db.password} ${container} pg_restore -U ${db.user} -d ${db.database} --no-owner --no-acl --clean --if-exists "${remote}"`,
        { stdio: "inherit", env: process.env },
      );
    } else {
      execSync(
        `docker exec ${container} pg_restore --dbname="${url}" --no-owner --no-acl --clean --if-exists "${remote}"`,
        { stdio: "inherit", env: process.env },
      );
    }
  } catch {
    console.warn("pg_restore (docker) a signalé des avertissements — vérification…");
    verifyOrganizationTable(url);
  } finally {
    execSync(`docker exec ${container} rm -f "${remote}"`, { stdio: "ignore" });
  }
}

const ext = path.extname(file).toLowerCase();

if (ext === ".dump") {
  runPgRestore(target, file);
} else if (file.endsWith(".sql.gz")) {
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
  if (!hasBin("psql") || !hasBin("gunzip")) {
    console.error(".sql.gz nécessite psql + gunzip sur PATH");
    process.exit(1);
  }
  execSync(`gunzip -c "${file}" | psql "${target}" -v ON_ERROR_STOP=1`, {
    stdio: "inherit",
    shell,
    env: process.env,
  });
} else {
  console.error("Format supporté: .dump ou .sql.gz");
  process.exit(1);
}

console.log("Restore terminé — exécutez: npm run db:migrate:deploy && npm run ops:verify-restore");
