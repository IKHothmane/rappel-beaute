/**
 * Backup PostgreSQL format custom (.dump) — compatible pg_restore.
 * Usage: DATABASE_URL=... npx tsx scripts/ops/backup.ts
 *
 * Fallback Docker : PG_DOCKER_CONTAINER=rappel_beaute_db
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { URL } from "url";

const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS ?? "14", 10);

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
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "").split("?")[0],
  };
}

function isLoopback(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

function runPgDump(url: string, file: string) {
  if (hasBin("pg_dump")) {
    execSync(`pg_dump "${url}" --format=custom --no-owner --no-acl --file="${file}"`, {
      stdio: "inherit",
      env: process.env,
    });
    return;
  }

  const container = process.env.PG_DOCKER_CONTAINER;
  if (!container) {
    console.error(
      "pg_dump introuvable. Installez postgresql-client ou définissez PG_DOCKER_CONTAINER=rappel_beaute_db",
    );
    process.exit(1);
  }

  const db = parseDb(url);
  const remote = `/tmp/${path.basename(file)}`;
  console.log(`pg_dump via docker exec ${container}`);

  if (isLoopback(db.host)) {
    // Même instance Postgres que le conteneur
    execSync(
      `docker exec -e PGPASSWORD=${db.password} ${container} pg_dump -U ${db.user} -d ${db.database} --format=custom --no-owner --no-acl --file="${remote}"`,
      { stdio: "inherit", env: process.env },
    );
  } else {
    execSync(
      `docker exec ${container} pg_dump "${url}" --format=custom --no-owner --no-acl --file="${remote}"`,
      { stdio: "inherit", env: process.env },
    );
  }

  execSync(`docker cp ${container}:${remote} "${file}"`, { stdio: "inherit" });
  execSync(`docker exec ${container} rm -f "${remote}"`, { stdio: "ignore" });
}

function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL requis");
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(BACKUP_DIR, `rappel_beaute_${timestamp}.dump`);

  console.log(`Backup → ${file}`);
  runPgDump(url, file);

  const stats = fs.statSync(file);
  console.log(`OK — ${(stats.size / 1024 / 1024).toFixed(2)} Mo`);

  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    if (!name.startsWith("rappel_beaute_") || !name.endsWith(".dump")) continue;
    const fp = path.join(BACKUP_DIR, name);
    if (fs.statSync(fp).mtimeMs < cutoff) {
      fs.unlinkSync(fp);
      console.log(`Supprimé (rétention): ${name}`);
    }
  }

  fs.writeFileSync(path.join(BACKUP_DIR, "LATEST"), path.basename(file));
}

main();
