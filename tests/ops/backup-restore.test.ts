import { describe, expect, it } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

const run = process.env.DATABASE_URL && process.env.RUN_OPS_TESTS === "true" ? describe : describe.skip;

function hasPgTools(): boolean {
  try {
    execSync("pg_dump --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

run("Ops — backup → restore (local/staging)", () => {
  it("vérifie les tables critiques sur la DB courante", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    try {
      const { rows } = await pool.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "Organization"`,
      );
      expect(parseInt(rows[0]?.c ?? "0", 10)).toBeGreaterThan(0);
    } finally {
      await pool.end();
    }

    execSync("npx tsx scripts/ops/verify-restore.ts", {
      stdio: "pipe",
      env: process.env,
    });
  });

  it("backup .dump puis verify-restore", { skip: !hasPgTools() || !process.env.RESTORE_DATABASE_URL || process.env.RESTORE_DATABASE_URL === process.env.DATABASE_URL }, () => {
    const restoreUrl = process.env.RESTORE_DATABASE_URL!;

    execSync("npm run ops:backup", { stdio: "inherit", env: process.env });

    const latest = fs.readFileSync(path.join(process.cwd(), "backups", "LATEST"), "utf8").trim();
    const dump = path.join(process.cwd(), "backups", latest);
    expect(fs.existsSync(dump)).toBe(true);

    execSync(`npm run ops:restore -- "${dump}"`, {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: restoreUrl, CONFIRM: "yes" },
    });

    execSync("npm run ops:verify-restore", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: restoreUrl },
    });
  });
});

describe("Ops — verify-restore script", () => {
  it("échoue sans DATABASE_URL", () => {
    expect(() => {
      execSync("npx tsx scripts/ops/verify-restore.ts", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: "" },
      });
    }).toThrow();
  });
});
