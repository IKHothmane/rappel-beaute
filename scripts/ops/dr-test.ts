/**
 * Test catastrophe simulé (LOCAL / STAGING uniquement).
 * 1. Backup DB source
 * 2. Restore sur RESTORE_DATABASE_URL (DB vierge)
 * 3. migrate deploy
 * 4. verify-restore
 * 5. health check
 *
 * Usage:
 *   DATABASE_URL=postgresql://.../rappel_beaute
 *   RESTORE_DATABASE_URL=postgresql://.../rappel_beaute_restore_test
 *   npx tsx scripts/ops/dr-test.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";

function run(cmd: string, env: Record<string, string | undefined> = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell,
  });
}

async function healthCheck(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health/`);
    const body = (await res.json()) as { status?: string; database?: string };
    return res.ok && body.database === "ok";
  } catch {
    return false;
  }
}

async function main() {
  const source = process.env.DATABASE_URL;
  const target = process.env.RESTORE_DATABASE_URL;

  if (!source || !target) {
    console.error("DATABASE_URL et RESTORE_DATABASE_URL requis");
    process.exit(1);
  }

  if (source === target) {
    console.error("RESTORE_DATABASE_URL doit être une base DIFFÉRENTE de DATABASE_URL");
    process.exit(1);
  }

  if (process.env.APP_ENV === "production") {
    console.error("Interdit en production");
    process.exit(1);
  }

  console.log("=== DR TEST — backup → restore → verify ===");

  run("npx tsx scripts/ops/backup.ts", { DATABASE_URL: source });

  const latestPath = path.join(process.cwd(), "backups", "LATEST");
  const latestFile = fs.readFileSync(latestPath, "utf8").trim();
  const dumpPath = path.join(process.cwd(), "backups", latestFile);

  run(`npx tsx scripts/ops/restore.ts "${dumpPath}"`, {
    DATABASE_URL: target,
    CONFIRM: "yes",
  });

  run("npx prisma migrate deploy", { DATABASE_URL: target });

  run("npx tsx scripts/ops/verify-restore.ts", { DATABASE_URL: target });

  const healthUrl = process.env.HEALTH_CHECK_URL;
  if (healthUrl) {
    const ok = await healthCheck(healthUrl);
    console.log(ok ? "✓ Health check OK" : "✗ Health check FAILED");
    if (!ok) process.exit(1);
  } else {
    console.log("(HEALTH_CHECK_URL non défini — skip health HTTP)");
  }

  console.log("\n=== DR TEST RÉUSSI ===");
}

main();
