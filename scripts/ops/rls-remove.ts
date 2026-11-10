/**
 * Retire complètement l'isolation par institut (dernier niveau de retour arrière). Aucune donnée métier n'est supprimée.
 * L'application doit d'abord être revenue sur le rôle postgres : voir docs/rls-activation.md.
 *
 *   CONFIRM=yes DATABASE_URL=<url postgres> npx tsx scripts/ops/rls-remove.ts
 *
 * Prisma considère ensuite la migration comme non appliquée : le prochain déploiement la rejouera,
 * sauf si le fichier de migration est retiré du dépôt.
 */
import { Client } from "pg";

const ROLE = "rappel_app";
const MIGRATION = "20261110090000_tenant_row_level_security";

async function main() {
  if (process.env.CONFIRM !== "yes") throw new Error("Définir CONFIRM=yes pour exécuter.");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL requis (rôle propriétaire).");
  const db = new Client({ connectionString });
  await db.connect();
  try {
    await db.query("BEGIN");
    const { rows } = await db.query<{ t: string }>(
      `SELECT tablename t FROM pg_policies WHERE schemaname = 'public' AND policyname = 'tenant_isolation'`,
    );
    for (const { t } of rows) {
      await db.query(`DROP POLICY tenant_isolation ON "${t}"`);
      await db.query(`ALTER TABLE "${t}" DISABLE ROW LEVEL SECURITY`);
    }
    await db.query(`DROP FUNCTION IF EXISTS app_current_org()`);
    await db.query(`DROP FUNCTION IF EXISTS app_rls_bypass()`);
    const role = await db.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [ROLE]);
    if (role.rowCount) await db.query(`DROP OWNED BY ${ROLE}`);
    if ((await db.query(`SELECT to_regclass('public._prisma_migrations') r`)).rows[0].r) {
      await db.query(`DELETE FROM "_prisma_migrations" WHERE migration_name = $1`, [MIGRATION]);
    }
    await db.query("COMMIT");
    console.log(`Isolation retirée de ${rows.length} tables.`);

    if (role.rowCount) {
      // Le rôle appartient au serveur : il reste si une autre base du même serveur l'utilise encore.
      await db.query(`DROP ROLE ${ROLE}`).then(
        () => console.log(`Rôle ${ROLE} supprimé.`),
        (error: Error) => console.log(`Rôle ${ROLE} conservé : ${error.message}`),
      );
    }
  } catch (error) {
    await db.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("ÉCHEC :", error instanceof Error ? error.message : error);
  process.exit(1);
});
