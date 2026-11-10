/**
 * Rétablit, après une restauration, le rôle et les permissions de l'isolation par institut, puis les vérifie.
 * `pg_dump --no-acl` n'embarque ni les GRANT ni les rôles : sans ce script, rappel_app n'a plus accès à rien.
 * Idempotent. À lancer avec le rôle propriétaire (postgres).
 *
 *   DATABASE_URL=<url postgres> npx tsx scripts/ops/rls-restore-grants.ts            rétablir + vérifier
 *   DATABASE_URL=<url postgres> npx tsx scripts/ops/rls-restore-grants.ts --verify   vérifier seulement
 *
 * RAPPEL_APP_PASSWORD (facultatif, 24 caractères minimum) autorise la connexion du rôle.
 * Sans lui, un rôle existant garde son état et un nouveau rôle reste sans connexion possible.
 */
import { Client } from "pg";

const ROLE = "rappel_app";
const CHILD_TABLES = [
  "ServiceStaff", "ServiceResource", "ServiceProduct", "ServiceCommission", "StaffSchedule", "StaffBreak",
  "StaffLeave", "ResourceMaintenance", "ProductLot", "ProductPriceHistory", "ProductSupplier", "PurchaseItem",
  "PurchaseReceiptLine", "InvoiceItem", "PackageItem", "CampaignRecipient", "ActivationToken", "SupportMessage",
  "AIMessage", "PublicWidgetOrigin", "AssistantMessage", "AppleWalletRegistration", "ReviewStaffRating",
];
const EXCLUDED = new Set(["PlatformAuditLog"]);

async function restore(db: Client): Promise<void> {
  await db.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}') THEN
        CREATE ROLE ${ROLE} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      END IF;
    END $$`);
  // Un rôle préexistant est ramené aux seuls attributs attendus.
  await db.query(`ALTER ROLE ${ROLE} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`);

  const password = process.env.RAPPEL_APP_PASSWORD ?? "";
  if (password) {
    if (password.length < 24) throw new Error("RAPPEL_APP_PASSWORD : 24 caractères minimum.");
    const { rows } = await db.query<{ sql: string }>(`SELECT format('ALTER ROLE ${ROLE} LOGIN PASSWORD %L', $1::text) AS sql`, [password]);
    await db.query(rows[0].sql);
  }

  await db.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);
  await db.query(`REVOKE CREATE ON SCHEMA public FROM ${ROLE}`);
  await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`);
  await db.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE}`);
  await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ROLE}`);
  await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${ROLE}`);
  await db.query(`DO $$
    BEGIN
      IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
        REVOKE ALL ON "_prisma_migrations" FROM ${ROLE};
      END IF;
    END $$`);
}

async function verify(db: Client): Promise<string[]> {
  const problems: string[] = [];
  const role = (await db.query(
    `SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = $1`, [ROLE],
  )).rows[0];
  if (!role) return [`rôle ${ROLE} absent`];
  if (role.rolsuper || role.rolbypassrls || role.rolcreaterole || role.rolcreatedb) problems.push(`${ROLE} a des privilèges excessifs`);

  const members = await db.query(
    `SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = $1`, [ROLE],
  );
  if (members.rowCount) problems.push(`${ROLE} hérite d'un autre rôle`);

  for (const fn of ["app_current_org", "app_rls_bypass"]) {
    if (!(await db.query(`SELECT 1 FROM pg_proc WHERE proname = $1`, [fn])).rowCount) problems.push(`fonction ${fn} absente`);
  }

  const direct = (await db.query<{ t: string }>(
    `SELECT table_name t FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'organizationId'`,
  )).rows.map((r) => r.t).filter((t) => !EXCLUDED.has(t));
  const expected = [...direct, ...CHILD_TABLES];
  const rows = (await db.query<{ t: string; rls: boolean; pol: number; owner: string }>(
    `SELECT c.relname t, c.relrowsecurity rls, pg_get_userbyid(c.relowner) owner,
            (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.policyname = 'tenant_isolation' AND p.cmd = 'ALL') pol
     FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'`,
  )).rows;
  const byName = new Map(rows.map((r) => [r.t, r]));
  for (const t of expected) {
    const row = byName.get(t);
    if (!row) problems.push(`table ${t} absente`);
    else if (!row.rls || row.pol !== 1) problems.push(`table ${t} sans isolation`);
  }
  if (rows.some((r) => r.owner === ROLE)) problems.push(`${ROLE} possède des tables`);

  for (const { t } of rows) {
    if (t === "_prisma_migrations") {
      const { rows: p } = await db.query(`SELECT has_table_privilege($1, '"_prisma_migrations"', 'SELECT') ok`, [ROLE]);
      if (p[0].ok) problems.push(`${ROLE} peut lire _prisma_migrations`);
      continue;
    }
    const { rows: p } = await db.query(
      `SELECT has_table_privilege($1, $2, 'SELECT,INSERT,UPDATE,DELETE') AS ok, has_table_privilege($1, $2, 'TRUNCATE') AS tr`,
      [ROLE, `"${t}"`],
    );
    if (!p[0].ok) problems.push(`table ${t} : permissions manquantes`);
    if (p[0].tr) problems.push(`table ${t} : TRUNCATE accordé`);
  }
  if ((await db.query(`SELECT has_schema_privilege($1, 'public', 'CREATE') ok`, [ROLE])).rows[0].ok) problems.push(`${ROLE} peut créer dans le schéma public`);

  // Essai réel avec le rôle, annulé à la fin : aucune donnée n'est modifiée.
  const total = Number((await db.query(`SELECT count(*) n FROM "Customer"`)).rows[0].n);
  await db.query("BEGIN");
  try {
    await db.query(`SET LOCAL ROLE ${ROLE}`);
    const count = async () => Number((await db.query(`SELECT count(*) n FROM "Customer"`)).rows[0].n);
    if ((await count()) !== 0) problems.push("sans contexte, des lignes restent visibles");
    await db.query(`SELECT set_config('app.current_org', '__verification__', true), set_config('app.rls_bypass', 'off', true)`);
    if ((await count()) !== 0) problems.push("un institut inconnu voit des lignes");
    await db.query(`SELECT set_config('app.current_org', '', true), set_config('app.rls_bypass', 'on', true)`);
    if ((await count()) !== total) problems.push("l'accès autorisé ne voit pas toutes les lignes");
  } finally {
    await db.query("ROLLBACK");
  }
  console.log(`Isolation : ${expected.length} tables contrôlées, ${total} clientes en base.`);
  return problems;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL requis (rôle propriétaire).");
  const db = new Client({ connectionString });
  await db.connect();
  try {
    if (!process.argv.includes("--verify")) {
      await restore(db);
      console.log("Rôle et permissions rétablis.");
    }
    const problems = await verify(db);
    if (problems.length) {
      console.error(`ÉCHEC (${problems.length}) :\n- ${problems.slice(0, 40).join("\n- ")}`);
      process.exitCode = 1;
    } else {
      console.log("RLS_OK");
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("ÉCHEC :", error instanceof Error ? error.message : error);
  process.exit(1);
});
