/**
 * Restore PostgreSQL depuis .dump (pg_restore) ou .sql.gz (psql).
 * Usage: DATABASE_URL=... npx tsx scripts/ops/restore.ts backups/rappel_beaute_xxx.dump
 * CI: CONFIRM=yes pour skip prompt interactif
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

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

const ext = path.extname(file).toLowerCase();

if (ext === ".dump") {
  try {
    execSync(
      `pg_restore --dbname="${target}" --no-owner --no-acl --clean --if-exists "${file}"`,
      { stdio: "inherit", env: process.env },
    );
  } catch {
    // pg_restore exit 1 = avertissements fréquents (--no-owner) — on valide après
    console.warn("pg_restore a signalé des avertissements — vérification post-restore…");
    execSync(`psql "${target}" -c "SELECT 1 FROM \\"Organization\\" LIMIT 1;"`, {
      stdio: "inherit",
      env: process.env,
    });
  }
} else if (file.endsWith(".sql.gz")) {
  execSync(`gunzip -c "${file}" | psql "${target}" -v ON_ERROR_STOP=1`, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
} else {
  console.error("Format supporté: .dump ou .sql.gz");
  process.exit(1);
}

console.log("Restore terminé — exécutez: npm run db:migrate:deploy && npm run ops:verify-restore");
