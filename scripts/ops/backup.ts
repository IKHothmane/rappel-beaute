/**
 * Backup PostgreSQL format custom (.dump) — compatible pg_restore.
 * Usage: DATABASE_URL=... npx tsx scripts/ops/backup.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS ?? "14", 10);

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
  execSync(`pg_dump "${url}" --format=custom --no-owner --no-acl --file="${file}"`, {
    stdio: "inherit",
    env: process.env,
  });

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
