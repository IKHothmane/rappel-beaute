/**
 * Vérifie l'intégrité post-restore : tables métier, contraintes, échantillon de données.
 */
import { Pool } from "pg";

const CRITICAL_TABLES = [
  "Organization",
  "User",
  "Customer",
  "Staff",
  "Appointment",
  "Payment",
  "Invoice",
  "InventoryMovement",
  "LoyaltyTransaction",
  "GiftCardTransaction",
  "AuditLog",
  "Plan",
  "Subscription",
] as const;

type CheckResult = { name: string; ok: boolean; detail?: string };

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.RESTORE_DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL ou RESTORE_DATABASE_URL requis");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url, max: 3 });
  const results: CheckResult[] = [];

  try {
    for (const table of CRITICAL_TABLES) {
      try {
        const { rows } = await pool.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "${table}"`,
        );
        const count = parseInt(rows[0]?.c ?? "0", 10);
        results.push({
          name: `table:${table}`,
          ok: true,
          detail: `${count} lignes`,
        });
      } catch (e) {
        results.push({
          name: `table:${table}`,
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const { rows: fkRows } = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM pg_constraint WHERE contype = 'f'`,
    );
    results.push({
      name: "constraints:foreign_keys",
      ok: parseInt(fkRows[0]?.c ?? "0", 10) > 0,
      detail: `${fkRows[0]?.c} FK`,
    });

    const { rows: exRows } = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM pg_constraint WHERE contype = 'x'`,
    );
    results.push({
      name: "constraints:exclude",
      ok: parseInt(exRows[0]?.c ?? "0", 10) > 0,
      detail: `${exRows[0]?.c} EXCLUDE (RDV overlap)`,
    });

    const { rows: orgSample } = await pool.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM "Organization" LIMIT 1`,
    );
    results.push({
      name: "sample:organization",
      ok: orgSample.length > 0,
      detail: orgSample[0]?.slug ?? "vide",
    });

    const failed = results.filter((r) => !r.ok);
    console.log(JSON.stringify({ ok: failed.length === 0, checks: results }, null, 2));

    if (failed.length > 0) {
      console.error(`${failed.length} vérification(s) échouée(s)`);
      process.exit(1);
    }
    console.log("✓ Restore vérifié — base exploitable");
  } finally {
    await pool.end();
  }
}

main();
