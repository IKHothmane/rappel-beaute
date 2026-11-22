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
const TRANSVERSAL = ["rappel_platform", "rappel_public", "rappel_job"] as const;
const CHILD_TABLES = [
  "ServiceStaff", "ServiceResource", "ServiceProduct", "ServiceCommission", "StaffSchedule", "StaffBreak",
  "StaffLeave", "ResourceMaintenance", "ProductLot", "ProductPriceHistory", "ProductSupplier", "PurchaseItem",
  "PurchaseReceiptLine", "InvoiceItem", "PackageItem", "CampaignRecipient", "ActivationToken", "SupportMessage",
  "AIMessage", "PublicWidgetOrigin", "AssistantMessage", "AppleWalletRegistration", "ReviewStaffRating",
];
const EXCLUDED = new Set(["PlatformAuditLog"]);
const TUTORIAL_TABLE = '"UserTutorialState"';
const TUTORIAL_UPDATE_COLUMNS = ["status", "lastStep", "version", "startedAt", "completedAt", "skippedAt", "updatedAt"];
const TUTORIAL_INSERT_COLUMNS = ["userId", "organizationId", ...TUTORIAL_UPDATE_COLUMNS, "createdAt"];
const quotedColumns = (columns: string[]) => columns.map((column) => `"${column}"`).join(", ");

async function restore(db: Client): Promise<void> {
  await db.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}') THEN
        CREATE ROLE ${ROLE} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      END IF;
    END $$`);
  // Un rôle préexistant est ramené aux seuls attributs attendus.
  await db.query(`ALTER ROLE ${ROLE} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`);
  for (const role of TRANSVERSAL) {
    await db.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
          CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
      END $$`);
    await db.query(`ALTER ROLE ${role} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`);
    await db.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await db.query(`REVOKE CREATE ON SCHEMA public FROM ${role}`);
    await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await db.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
  }

  const passwords: Array<[string, string | undefined]> = [
    [ROLE, process.env.RAPPEL_APP_PASSWORD],
    ["rappel_platform", process.env.RAPPEL_PLATFORM_PASSWORD],
    ["rappel_public", process.env.RAPPEL_PUBLIC_PASSWORD],
    ["rappel_job", process.env.RAPPEL_JOB_PASSWORD],
  ];
  for (const [role, password] of passwords) {
    if (!password) continue;
    if (password.length < 24) throw new Error(`${role} : mot de passe de 24 caractères minimum.`);
    const { rows } = await db.query<{ sql: string }>(`SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', $1::text, $2::text) AS sql`, [role, password]);
    await db.query(rows[0].sql);
  }

  await db.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);
  await db.query(`REVOKE CREATE ON SCHEMA public FROM ${ROLE}`);
  await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`);
  await db.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE}`);
  await db.query(`REVOKE ALL ON TABLE "PlatformAuditLog" FROM ${ROLE}, rappel_public, rappel_job, rappel_platform`);
  await db.query(`GRANT SELECT, INSERT ON TABLE "PlatformAuditLog" TO rappel_platform`);
  await db.query(`GRANT INSERT ON TABLE "PlatformAuditLog" TO rappel_public`);
  if ((await db.query(`SELECT to_regclass($1) AS table`, [TUTORIAL_TABLE])).rows[0].table) {
    await db.query(`REVOKE ALL ON TABLE ${TUTORIAL_TABLE} FROM PUBLIC, ${ROLE}, ${TRANSVERSAL.join(", ")}`);
    await db.query(`GRANT SELECT, INSERT (${quotedColumns(TUTORIAL_INSERT_COLUMNS)}),
      UPDATE (${quotedColumns(TUTORIAL_UPDATE_COLUMNS)}) ON TABLE ${TUTORIAL_TABLE} TO ${ROLE}`);
    await db.query(`GRANT SELECT ON TABLE ${TUTORIAL_TABLE} TO rappel_platform`);
  }
  await db.query(`DO $$
    BEGIN
      IF to_regprocedure('app_private.org_proof_ok()') IS NOT NULL THEN
        GRANT USAGE ON SCHEMA app_private TO rappel_app, rappel_platform, rappel_public, rappel_job;
        GRANT EXECUTE ON FUNCTION app_private.org_proof_ok() TO rappel_app, rappel_platform, rappel_public, rappel_job;
        GRANT EXECUTE ON FUNCTION app_current_org() TO rappel_app, rappel_platform, rappel_public, rappel_job;
      END IF;
    END $$`);
  for (const role of [ROLE, ...TRANSVERSAL]) {
    await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM ${role}`);
    await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM ${role}`);
  }
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
    if (t === "PlatformAuditLog") continue;
    if (t === "UserTutorialState") {
      const { rows: grants } = await db.query<{ role: string; valid: boolean }>(
        `SELECT role, has_table_privilege(role, $1, 'SELECT') = (role IN ('rappel_app', 'rappel_platform'))
          AND NOT has_table_privilege(role, $1, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          AND (SELECT bool_and(
            has_column_privilege(role, $1, column_name, 'INSERT') = (role = 'rappel_app' AND column_name = ANY($2::text[]))
            AND has_column_privilege(role, $1, column_name, 'UPDATE') = (role = 'rappel_app' AND column_name = ANY($3::text[]))
          ) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'UserTutorialState') AS valid
         FROM unnest($4::text[]) AS roles(role)`,
        [TUTORIAL_TABLE, TUTORIAL_INSERT_COLUMNS, TUTORIAL_UPDATE_COLUMNS, [ROLE, ...TRANSVERSAL]],
      );
      for (const grant of grants) if (!grant.valid) problems.push(`table ${t} : droits incorrects pour ${grant.role}`);
      continue;
    }
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
    await db.query(`SELECT set_config('app.current_org', '__verification__', true), set_config('app.rls_bypass', 'on', true)`);
    if ((await count()) !== 0) problems.push("rappel_app s'ouvre les autres instituts avec la variable de session");
    await db.query("RESET ROLE");
    await db.query("SET LOCAL ROLE rappel_platform");
    if ((await count()) !== total) problems.push("le rôle plateforme ne voit pas les lignes");
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
      await db.query("BEGIN");
      try {
        await restore(db);
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
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
