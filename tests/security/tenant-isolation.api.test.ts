import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signJwt } from "@/lib/auth/crypto";
import { getSessionSecret } from "@/lib/auth/env";
import { getSeedOrgId, testPool } from "../helpers/db";

/**
 * Isolation entre instituts au niveau de l'API (IDOR / BOLA).
 *
 * Institut A : l'institut du seed (données dans presque toutes les tables).
 * Institut B : institut fictif créé ici, avec sa propre propriétaire.
 *
 * Les handlers de route sont appelés directement avec un jeton de session signé.
 * Les routes dynamiques sont découvertes sur le disque : une nouvelle route
 * `[id]` est testée automatiquement, et un paramètre inconnu fait échouer le test.
 * Base locale de test uniquement (tests/helpers/test-database.ts).
 */
const run = process.env.DATABASE_URL ? describe : describe.skip;

const API_ROOT = path.join(process.cwd(), "src", "app", "api");
const ORG_B = "org_iso_b";
const B = {
  user: "u_iso_b",
  customer: "iso_b_customer",
  staff: "iso_b_staff",
  service: "iso_b_service",
  resource: "iso_b_resource",
  supplier: "iso_b_supplier",
  product: "iso_b_product",
  note: "iso_b_note",
  phone: "0699000111",
  lastName: "Zzisolationb",
};

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Handler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;
type DynamicRoute = { file: string; route: string; params: string[]; methods: Method[] };

/** Table de la ressource désignée par chaque paramètre de route. */
const ID_TABLE: Array<[RegExp, string]> = [
  [/^\/ai\/conversations\//, "AIConversation"],
  [/^\/appointments\//, "Appointment"],
  [/^\/campaigns\//, "Campaign"],
  [/^\/commissions\//, "CommissionRecord"],
  [/^\/customers\//, "Customer"],
  [/^\/expenses\//, "Expense"],
  [/^\/invoices\//, "Invoice"],
  [/^\/notifications\//, "Notification"],
  [/^\/payments\//, "Payment"],
  [/^\/pos\/sales\//, "PosSale"],
  [/^\/products\//, "Product"],
  [/^\/purchases\//, "Purchase"],
  [/^\/resources\//, "Resource"],
  [/^\/services\//, "Service"],
  [/^\/staff\//, "Staff"],
  [/^\/suppliers\//, "Supplier"],
  [/^\/support\/tickets\//, "SupportTicket"],
  [/^\/users\//, "User"],
  [/^\/waiting-list\//, "WaitingListEntry"],
];
const CHILD_PARAM: Record<string, { table: string; parent: string; fk: string }> = {
  noteId: { table: "CustomerNote", parent: "Customer", fk: "customerId" },
  maintenanceId: { table: "ResourceMaintenance", parent: "Resource", fk: "resourceId" },
  leaveId: { table: "StaffLeave", parent: "Staff", fk: "staffId" },
};

/** Corps volontairement hostile : champs d'écriture courants + institut de la victime. */
function hostileBody(victimOrg: string): Record<string, unknown> {
  return {
    organizationId: victimOrg,
    name: "ISOLATION-HACK",
    firstName: "ISOLATION-HACK",
    lastName: "ISOLATION-HACK",
    content: "ISOLATION-HACK",
    notes: "ISOLATION-HACK",
    reason: "ISOLATION-HACK",
    message: "ISOLATION-HACK",
    status: "CANCELLED",
    active: false,
    amount: 1,
    price: 1,
    quantity: 1,
    startAt: "2031-01-06T10:00:00.000Z",
    endAt: "2031-01-06T11:00:00.000Z",
    schedule: [],
    method: "CASH",
  };
}

/**
 * Corps valides pour les routes qui valident la requête avant de chercher la ressource :
 * sans eux, un 400 de validation masquerait l'absence de contrôle d'appartenance.
 */
const VALID_BODIES: Record<string, Array<Record<string, unknown>>> = {
  "PATCH /customers/[id]": [{ firstName: "Isolation", lastName: "Hack" }, { archived: true }],
  "PATCH /commissions/[id]": [
    { action: "markPaid" },
    { action: "markUnpaid" },
    { action: "adjust", amount: 10, reason: "Isolation hack" },
  ],
  "PATCH /invoices/[id]": [{ action: "void", reason: "Isolation hack — annulation" }],
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function tenantRoutes(): Array<{ file: string; route: string; methods: Method[] }> {
  return walk(API_ROOT)
    .map((file) => {
      const src = fs.readFileSync(file, "utf8");
      const methods = [...src.matchAll(/export\s+const\s+(GET|POST|PATCH|PUT|DELETE)\s*=\s*tenantRoute\(/g)].map(
        (m) => m[1] as Method,
      );
      const route = file.replace(API_ROOT, "").replace(/\\/g, "/").replace(/\/route\.ts$/, "");
      return { file, route, methods };
    })
    .filter((r) => r.methods.length > 0);
}

const ALL = tenantRoutes();
const DYNAMIC: DynamicRoute[] = ALL.filter((r) => r.route.includes("[")).map((r) => ({
  ...r,
  params: [...r.route.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]),
}));
const STATIC_GET = ALL.filter((r) => !r.route.includes("[") && r.methods.includes("GET"));

function tableForId(route: string): string {
  const hit = ID_TABLE.find(([re]) => re.test(route));
  if (!hit) throw new Error(`Route dynamique sans correspondance de table : ${route} — complétez ID_TABLE.`);
  return hit[1];
}

async function firstId(table: string, organizationId: string): Promise<string | null> {
  const { rows } = await testPool.query<{ id: string }>(
    `SELECT id FROM "${table}" WHERE "organizationId" = $1 ORDER BY id LIMIT 1`,
    [organizationId],
  );
  return rows[0]?.id ?? null;
}

async function firstChildId(param: string, organizationId: string): Promise<{ id: string; parentId: string } | null> {
  const def = CHILD_PARAM[param];
  const { rows } = await testPool.query<{ id: string; parentId: string }>(
    `SELECT c.id, c."${def.fk}" AS "parentId" FROM "${def.table}" c
     JOIN "${def.parent}" p ON p.id = c."${def.fk}"
     WHERE p."organizationId" = $1 ORDER BY c.id LIMIT 1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

/** Empreinte de toutes les lignes d'un institut (tables avec organizationId) et des tables enfants. */
async function fingerprint(organizationId: string): Promise<Record<string, string>> {
  const { rows: tables } = await testPool.query<{ table_name: string; has_org: boolean }>(
    `SELECT t.table_name,
            EXISTS (SELECT 1 FROM information_schema.columns c
                    WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                      AND c.column_name = 'organizationId') AS has_org
     FROM information_schema.tables t
     WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
       AND t.table_name NOT LIKE '\\_%' ORDER BY 1`,
  );
  const out: Record<string, string> = {};
  for (const { table_name, has_org } of tables) {
    // Tables enfants : seules les lignes rattachées à l'institut via leur parent comptent.
    const child = Object.values(CHILD_PARAM).find((c) => c.table === table_name);
    let where = "";
    if (has_org) where = `WHERE t."organizationId" = $1`;
    else if (child) {
      where = `WHERE EXISTS (SELECT 1 FROM "${child.parent}" p WHERE p.id = t."${child.fk}" AND p."organizationId" = $1)`;
    } else if (table_name === "Organization") where = `WHERE t.id = $1`;
    else continue;
    const { rows } = await testPool.query<{ h: string }>(
      `SELECT md5(COALESCE(string_agg(x.h, '' ORDER BY x.h), '')) || ':' || COUNT(*) AS h
       FROM (SELECT md5(t::text) AS h FROM "${table_name}" t ${where}) x`,
      [organizationId],
    );
    out[table_name] = rows[0].h;
  }
  return out;
}

/**
 * Lignes rattachées à une ressource d'un autre institut, sur toutes les clés étrangères :
 * - table avec organizationId → parent avec organizationId différent ;
 * - table de jonction sans organizationId → deux parents d'instituts différents.
 */
async function crossOrgReferences(): Promise<string[]> {
  const { rows: fks } = await testPool.query<{ child: string; col: string; parent: string; child_org: boolean }>(
    `SELECT c.relname AS child, a.attname AS col, p.relname AS parent,
            EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.oid AND x.attname = 'organizationId'
                    AND NOT x.attisdropped) AS child_org
     FROM pg_constraint k
     JOIN pg_class c ON c.oid = k.conrelid
     JOIN pg_class p ON p.oid = k.confrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.conkey[1]
     WHERE k.contype = 'f' AND array_length(k.conkey, 1) = 1 AND p.relname <> 'Organization'
       AND EXISTS (SELECT 1 FROM pg_attribute y WHERE y.attrelid = p.oid AND y.attname = 'organizationId'
                   AND NOT y.attisdropped)
     ORDER BY 1, 2`,
  );
  const found: string[] = [];
  for (const fk of fks.filter((f) => f.child_org)) {
    const { rows } = await testPool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM "${fk.child}" c JOIN "${fk.parent}" p ON p.id = c."${fk.col}"
       WHERE c."organizationId" <> p."organizationId"`,
    );
    if (rows[0].n !== "0") found.push(`${fk.child}.${fk.col} → ${fk.parent} : ${rows[0].n}`);
  }
  const junctions = new Map<string, typeof fks>();
  for (const fk of fks.filter((f) => !f.child_org)) {
    junctions.set(fk.child, [...(junctions.get(fk.child) ?? []), fk]);
  }
  for (const [child, links] of junctions) {
    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const [a, b] = [links[i], links[j]];
        const { rows } = await testPool.query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM "${child}" c
           JOIN "${a.parent}" pa ON pa.id = c."${a.col}"
           JOIN "${b.parent}" pb ON pb.id = c."${b.col}"
           WHERE pa."organizationId" <> pb."organizationId"`,
        );
        if (rows[0].n !== "0") found.push(`${child} (${a.col} / ${b.col}) : ${rows[0].n}`);
      }
    }
  }
  return found;
}

function changedTables(before: Record<string, string>, after: Record<string, string>): string[] {
  return Object.keys(before).filter((t) => before[t] !== after[t]);
}

async function tokenFor(userId: string): Promise<string> {
  const { rows } = await testPool.query(
    `SELECT u.id, u.email, u."firstName", u."lastName", u.role::text AS role, u."organizationId",
            u."sessionVersion", o.name AS "orgName", o.slug AS "orgSlug"
     FROM "User" u JOIN "Organization" o ON o.id = u."organizationId" WHERE u.id = $1`,
    [userId],
  );
  const u = rows[0];
  if (!u) throw new Error(`Utilisateur de test introuvable : ${userId}`);
  return signJwt(
    {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      organizationId: u.organizationId,
      orgName: u.orgName,
      orgSlug: u.orgSlug,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: false,
      sessionVersion: u.sessionVersion ?? 0,
    },
    getSessionSecret(),
    3600,
  );
}

async function call(
  file: string,
  method: Method,
  url: string,
  token: string,
  params: Record<string, string>,
  body?: unknown,
): Promise<{ status: number; text: string }> {
  const mod = (await import(/* @vite-ignore */ file)) as Record<string, Handler>;
  const request = new NextRequest(`http://localhost/api${url}`, {
    method,
    headers: { cookie: `rappel_session=${token}`, "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const response = await mod[method](request, { params: Promise.resolve(params) });
  return { status: response.status, text: await response.text() };
}

/** Valeurs de chaîne exactes présentes dans une réponse JSON. */
function stringValues(text: string): Set<string> {
  const found = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") found.add(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  try {
    visit(JSON.parse(text));
  } catch {
    /* réponse non JSON : seuls les marqueurs en sous-chaîne s'appliquent */
  }
  return found;
}

/** Marqueurs propres à un institut : assez longs pour une recherche en sous-chaîne. */
async function markers(organizationId: string): Promise<string[]> {
  const { rows } = await testPool.query<{ v: string | null }>(
    `SELECT phone AS v FROM "Customer" WHERE "organizationId" = $1
     UNION SELECT email FROM "Customer" WHERE "organizationId" = $1
     UNION SELECT email FROM "Staff" WHERE "organizationId" = $1
     UNION SELECT email FROM "User" WHERE "organizationId" = $1
     UNION SELECT name FROM "Supplier" WHERE "organizationId" = $1
     UNION SELECT name FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  return rows.map((r) => r.v?.trim() ?? "").filter((v) => v.length >= 8);
}

let ORG_A = "";
let tokenA = "";
let tokenB = "";
let markersA: string[] = [];
let markersB: string[] = [];

async function setupOrgB(): Promise<void> {
  const { rows } = await testPool.query<{ planId: string; priceSnapshot: string }>(
    `SELECT "planId", "priceSnapshot"::text FROM "Subscription" WHERE "organizationId" = $1 LIMIT 1`,
    [ORG_A],
  );
  const plan = rows[0];
  if (!plan) throw new Error("Abonnement du seed introuvable.");
  const q = (sql: string, params: unknown[]) => testPool.query(sql, params);

  // Lignes laissées chez B par une exécution précédente (institut fictif de ce fichier).
  await q(`DELETE FROM "GiftCardTransaction" WHERE "organizationId" = $1`, [ORG_B]);
  await q(`DELETE FROM "GiftCard" WHERE "organizationId" = $1`, [ORG_B]);
  await q(`DELETE FROM "Expense" WHERE "organizationId" = $1`, [ORG_B]);

  await q(
    `INSERT INTO "Organization" (id, name, slug, status, "updatedAt")
     VALUES ($1, 'Institut Isolation B', 'institut-isolation-b', 'ACTIVE', NOW()) ON CONFLICT (id) DO NOTHING`,
    [ORG_B],
  );
  await q(
    `INSERT INTO "User" (id, "organizationId", email, "firstName", "lastName", phone, role, "passwordHash", "updatedAt")
     VALUES ($1, $2, 'owner@isolation-b.test', 'Bahia', $3, '+212 6 99 00 01 10', 'OWNER', 'x', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [B.user, ORG_B, B.lastName],
  );
  await q(
    `INSERT INTO "Subscription" (id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
       "startedAt", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
     VALUES ('sub_iso_b', $1, $2, 'ACTIVE', $3, 'MAD', NOW(), NOW(), NOW() + interval '30 days', NOW())
     ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', "currentPeriodEnd" = NOW() + interval '30 days'`,
    [ORG_B, plan.planId, plan.priceSnapshot],
  );
  await q(
    `INSERT INTO "Customer" (id, "organizationId", "firstName", "lastName", phone, status,
       "marketingWhatsapp", "marketingEmail", "marketingSms", notes, "updatedAt")
     VALUES ($1, $2, 'Basma', $3, $4, 'ACTIVE', false, false, false, NULL, NOW()) ON CONFLICT (id) DO NOTHING`,
    [B.customer, ORG_B, B.lastName, B.phone],
  );
  await q(
    `INSERT INTO "Staff" (id, "organizationId", "firstName", "lastName", phone, email, position, status, "hireDate", "updatedAt")
     VALUES ($1, $2, 'Bouchra', $3, '+212 6 99 00 02 20', 'staff@isolation-b.test', 'Esthéticienne',
             'ACTIVE'::"StaffStatus", '2024-01-01', NOW()) ON CONFLICT (id) DO NOTHING`,
    [B.staff, ORG_B, B.lastName],
  );
  await q(
    `INSERT INTO "Service" (id, "organizationId", name, description, category, price, "durationMin",
       "prepTimeMin", "cleanupTimeMin", deposit, active, "updatedAt")
     VALUES ($1, $2, 'Soin isolation B', 'Test', 'Soins visage', 123, 30, 0, 0, NULL, true, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [B.service, ORG_B],
  );
  await q(
    `INSERT INTO "Resource" (id, "organizationId", name, type, capacity, location, active, "updatedAt")
     SELECT $1, $2, 'Cabine isolation B', r.type, 1, 'B', true, NOW()
     FROM "Resource" r WHERE r."organizationId" = $3 LIMIT 1 ON CONFLICT (id) DO NOTHING`,
    [B.resource, ORG_B, ORG_A],
  );
  await q(
    `INSERT INTO "Supplier" (id, "organizationId", name, phone, email, address, "contactName", active, "updatedAt")
     VALUES ($1, $2, 'Fournisseur Isolation B', '0699000333', 'supplier@isolation-b.test', 'B', 'B', true, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [B.supplier, ORG_B],
  );
  await q(
    `INSERT INTO "Product" (id, "organizationId", name, sku, category, brand, unit, "purchasePrice", "salePrice",
       stock, "minStock", "maxStock", "supplierName", consumable, sellable, active, "updatedAt")
     SELECT $1, $2, 'Produit isolation B', 'ISO-B-01', p.category, 'B', p.unit, 10, 20, 5, 1, 10, 'B', false, true, true, NOW()
     FROM "Product" p WHERE p."organizationId" = $3 LIMIT 1 ON CONFLICT (id) DO NOTHING`,
    [B.product, ORG_B, ORG_A],
  );
  await q(
    `INSERT INTO "CustomerNote" (id, "organizationId", "customerId", content, "updatedAt")
     VALUES ($1, $2, $3, 'Note privée isolation B', NOW()) ON CONFLICT (id) DO NOTHING`,
    [B.note, ORG_B, B.customer],
  );
  // Une note chez A, pour que la route imbriquée ait une cible.
  await q(
    `INSERT INTO "CustomerNote" (id, "organizationId", "customerId", content, "updatedAt")
     SELECT 'iso_a_note', $1, c.id, 'Note privée isolation A', NOW()
     FROM "Customer" c WHERE c."organizationId" = $1 ORDER BY c.id LIMIT 1 ON CONFLICT (id) DO NOTHING`,
    [ORG_A],
  );
  // Cibles chez A pour les routes que le seed ne couvre pas.
  await q(
    `INSERT INTO "AIConversation" (id, "organizationId", "userId", title, "updatedAt")
     SELECT 'iso_a_ai', $1, u.id, 'Conversation privée isolation A', NOW()
     FROM "User" u WHERE u."organizationId" = $1 ORDER BY u.id LIMIT 1 ON CONFLICT (id) DO NOTHING`,
    [ORG_A],
  );
  await q(
    `INSERT INTO "WaitingListEntry" (id, "organizationId", "customerId", "serviceId", "preferredDate", "updatedAt")
     SELECT 'iso_a_wait', $1,
            (SELECT id FROM "Customer" WHERE "organizationId" = $1 ORDER BY id LIMIT 1),
            (SELECT id FROM "Service" WHERE "organizationId" = $1 ORDER BY id LIMIT 1),
            DATE '2031-03-03', NOW()
     ON CONFLICT (id) DO NOTHING`,
    [ORG_A],
  );
  await q(
    `INSERT INTO "SupportTicket" (id, "organizationId", "createdByUserId", subject, category, "updatedAt")
     SELECT 'iso_a_ticket', $1, u.id, 'Ticket privé isolation A',
            (enum_range(NULL::"SupportTicketCategory"))[1], NOW()
     FROM "User" u WHERE u."organizationId" = $1 ORDER BY u.id LIMIT 1 ON CONFLICT (id) DO NOTHING`,
    [ORG_A],
  );
}

run("Isolation API entre instituts A et B", () => {
  beforeAll(async () => {
    ORG_A = await getSeedOrgId();
    await setupOrgB();
    const { rows } = await testPool.query<{ id: string }>(
      `SELECT id FROM "User" WHERE "organizationId" = $1 AND role = 'OWNER' AND status = 'ACTIVE' ORDER BY id LIMIT 1`,
      [ORG_A],
    );
    tokenA = await tokenFor(rows[0].id);
    tokenB = await tokenFor(B.user);
    markersA = await markers(ORG_A);
    markersB = await markers(ORG_B);
  });

  afterAll(async () => {
    // Lignes créées par ce fichier chez B pendant les tests (base locale de test).
    await testPool.query(
      `DELETE FROM "Customer" WHERE "organizationId" = $1 AND id <> $2`,
      [ORG_B, B.customer],
    );
  });

  it("le harnais authentifie réellement : chaque institut lit ses propres données", async () => {
    const file = path.join(API_ROOT, "customers", "[id]", "route.ts");
    const idA = await firstId("Customer", ORG_A);
    const ownA = await call(file, "GET", `/customers/${idA}/`, tokenA, { id: idA! });
    const ownB = await call(file, "GET", `/customers/${B.customer}/`, tokenB, { id: B.customer });
    expect(ownA.status).toBe(200);
    expect(ownB.status).toBe(200);
    expect(ownB.text).toContain(B.phone);
  });

  it("B ne lit ni ne modifie aucune ressource de A par identifiant (toutes les routes [id])", async () => {
    expect(DYNAMIC.length).toBeGreaterThan(30);
    const before = await fingerprint(ORG_A);
    const leaks: string[] = [];
    const unverified: string[] = [];
    const serverErrors: string[] = [];
    const outcomes: string[] = [];
    let attempts = 0;

    for (const route of DYNAMIC) {
      const table = tableForId(route.route);
      const params: Record<string, string> = {};
      const targets: string[] = [];
      let missing = false;

      for (const param of route.params) {
        if (param === "id") {
          const id = await firstId(table, ORG_A);
          if (!id) missing = true;
          else {
            params.id = id;
            targets.push(id);
          }
        } else if (CHILD_PARAM[param]) {
          const child = await firstChildId(param, ORG_A);
          if (!child) missing = true;
          else {
            params[param] = child.id;
            params.id = child.parentId;
            targets.push(child.id, child.parentId);
          }
        } else {
          throw new Error(`Paramètre de route inconnu : [${param}] dans ${route.route} — complétez CHILD_PARAM.`);
        }
      }
      if (missing) {
        unverified.push(`${route.route} (aucune ligne ${table} chez A)`);
        continue;
      }

      const url = route.route.replace(/\[([^\]]+)\]/g, (_, name: string) => params[name]) + "/";
      const calls = route.methods.flatMap((method) => {
        const label = `${method} ${route.route}`;
        const bodies = method === "GET" ? [undefined] : [hostileBody(ORG_A), ...(VALID_BODIES[label] ?? [])];
        return bodies.map((body) => ({ method, label, body }));
      });
      for (const { method, label, body } of calls) {
        attempts += 1;
        let result: { status: number; text: string };
        try {
          result = await call(route.file, method, url, tokenB, params, body);
        } catch (error) {
          serverErrors.push(`${label} → exception ${(error as Error).message.slice(0, 80)}`);
          continue;
        }
        outcomes.push(`${result.status} ${label}`);
        if (result.status === 401) leaks.push(`${label} → 401 : harnais non authentifié, test sans valeur`);
        if (result.status >= 500) serverErrors.push(`${label} → ${result.status}`);
        if (result.status >= 200 && result.status < 300) {
          const values = stringValues(result.text);
          const exposedId = targets.find((id) => values.has(id));
          const exposedMarker = markersA.find((m) => result.text.includes(m));
          if (exposedId || exposedMarker) {
            leaks.push(`${label} → ${result.status} expose ${exposedId ?? exposedMarker}`);
          }
        }
      }
    }

    const changed = changedTables(before, await fingerprint(ORG_A));
    console.info(
      `[isolation] ${attempts} appels B→A sur ${DYNAMIC.length} routes dynamiques ; ` +
        `non vérifiées : ${unverified.length} ; erreurs serveur : ${serverErrors.length}`,
    );
    if (process.env.ISOLATION_VERBOSE) console.info("[isolation] détail :\n  " + outcomes.sort().join("\n  "));
    if (unverified.length) console.info("[isolation] non vérifiées :\n  " + unverified.join("\n  "));
    if (serverErrors.length) console.info("[isolation] erreurs serveur :\n  " + serverErrors.join("\n  "));

    expect(leaks, `Fuites B→A : ${leaks.join(" | ")}`).toEqual([]);
    expect(changed, `Tables de A modifiées par B : ${changed.join(", ")}`).toEqual([]);
  });

  it("A ne lit ni ne modifie les ressources de B (sens inverse)", async () => {
    const before = await fingerprint(ORG_B);
    const leaks: string[] = [];
    const cases: Array<[string[], Record<string, string>, string]> = [
      [["customers", "[id]"], { id: B.customer }, `/customers/${B.customer}/`],
      [["customers", "[id]", "notes"], { id: B.customer }, `/customers/${B.customer}/notes/`],
      [["customers", "[id]", "timeline"], { id: B.customer }, `/customers/${B.customer}/timeline/`],
      [["customers", "[id]", "stats"], { id: B.customer }, `/customers/${B.customer}/stats/`],
      [["staff", "[id]"], { id: B.staff }, `/staff/${B.staff}/`],
      [["staff", "[id]", "schedule"], { id: B.staff }, `/staff/${B.staff}/schedule/`],
      [["services", "[id]"], { id: B.service }, `/services/${B.service}/`],
      [["resources", "[id]"], { id: B.resource }, `/resources/${B.resource}/`],
      [["suppliers", "[id]"], { id: B.supplier }, `/suppliers/${B.supplier}/`],
      [["products", "[id]"], { id: B.product }, `/products/${B.product}/`],
    ];
    for (const [segments, params, url] of cases) {
      const file = path.join(API_ROOT, ...segments, "route.ts");
      const route = DYNAMIC.find((r) => r.file === file);
      expect(route, `route absente : ${segments.join("/")}`).toBeTruthy();
      for (const method of route!.methods) {
        const result = await call(file, method, url, tokenA, params, hostileBody(ORG_B));
        expect(result.status, `${method} ${url}`).not.toBe(401);
        if (result.status < 300) {
          const values = stringValues(result.text);
          const exposed = Object.values(params).find((id) => values.has(id)) ?? markersB.find((m) => result.text.includes(m));
          if (exposed) leaks.push(`${method} ${url} → ${result.status} expose ${exposed}`);
        }
      }
    }
    const changed = changedTables(before, await fingerprint(ORG_B));
    expect(leaks, `Fuites A→B : ${leaks.join(" | ")}`).toEqual([]);
    expect(changed, `Tables de B modifiées par A : ${changed.join(", ")}`).toEqual([]);
  });

  it("route imbriquée : un parent de B ne donne pas accès à l'enfant de A", async () => {
    const before = await fingerprint(ORG_A);
    const note = await firstChildId("noteId", ORG_A);
    const leave = await firstChildId("leaveId", ORG_A);
    const maintenance = await firstChildId("maintenanceId", ORG_A);
    const cases: Array<[string[], Record<string, string>, Method[]]> = [];
    if (note) cases.push([["customers", "[id]", "notes", "[noteId]"], { id: B.customer, noteId: note.id }, ["PATCH", "DELETE"]]);
    if (leave) cases.push([["staff", "[id]", "leaves", "[leaveId]"], { id: B.staff, leaveId: leave.id }, ["PATCH"]]);
    if (maintenance) {
      cases.push([
        ["resources", "[id]", "maintenance", "[maintenanceId]"],
        { id: B.resource, maintenanceId: maintenance.id },
        ["PATCH"],
      ]);
    }
    expect(cases.length).toBeGreaterThan(0);
    for (const [segments, params, methods] of cases) {
      const file = path.join(API_ROOT, ...segments, "route.ts");
      for (const method of methods) {
        const result = await call(file, method, "/nested/", tokenB, params, hostileBody(ORG_A));
        expect(result.status, `${method} ${segments.join("/")}`).toBeGreaterThanOrEqual(400);
        expect(result.status, `${method} ${segments.join("/")}`).not.toBe(401);
      }
    }
    expect(changedTables(before, await fingerprint(ORG_A))).toEqual([]);
  });

  it("listes, recherches et exports de B ne contiennent aucune donnée de A", async () => {
    expect(STATIC_GET.length).toBeGreaterThan(40);
    const { rows } = await testPool.query<{ lastName: string }>(
      `SELECT "lastName" FROM "Customer" WHERE "organizationId" = $1 ORDER BY id LIMIT 1`,
      [ORG_A],
    );
    const search = encodeURIComponent(rows[0].lastName);
    const query = `?organizationId=${ORG_A}&orgId=${ORG_A}&search=${search}&q=${search}&format=csv&from=2020-01-01&to=2031-01-01`;
    const leaks: string[] = [];
    const statuses: Record<string, number> = {};
    for (const route of STATIC_GET) {
      let result: { status: number; text: string };
      try {
        result = await call(route.file, "GET", `${route.route}/${query}`, tokenB, {});
      } catch (error) {
        statuses.exception = (statuses.exception ?? 0) + 1;
        console.info(`[isolation] exception GET ${route.route} : ${(error as Error).message.slice(0, 100)}`);
        continue;
      }
      statuses[result.status] = (statuses[result.status] ?? 0) + 1;
      const marker = markersA.find((m) => result.text.includes(m));
      if (marker) leaks.push(`GET ${route.route} → ${result.status} contient « ${marker} »`);
      if (result.text.includes(`"organizationId":"${ORG_A}"`)) leaks.push(`GET ${route.route} → lignes de ${ORG_A}`);
    }
    console.info(`[isolation] ${STATIC_GET.length} listes/exports lus par B, statuts : ${JSON.stringify(statuses)}`);
    expect(statuses[401] ?? 0).toBe(0);
    expect(leaks, `Fuites en liste : ${leaks.join(" | ")}`).toEqual([]);
  });

  it("organizationId fourni par le client est ignoré à la création", async () => {
    const before = await fingerprint(ORG_A);
    const file = path.join(API_ROOT, "customers", "route.ts");
    const phone = `06${Math.floor(10000000 + Math.random() * 89999999)}`;
    const result = await call(file, "POST", "/customers/", tokenB, {}, {
      organizationId: ORG_A,
      firstName: "Injection",
      lastName: "Organisation",
      phone,
    });
    expect(result.status).not.toBe(401);
    const { rows } = await testPool.query<{ organizationId: string }>(
      `SELECT "organizationId" FROM "Customer" WHERE phone = $1`,
      [phone],
    );
    if (result.status < 300) expect(rows.map((r) => r.organizationId)).toEqual([ORG_B]);
    else expect(rows).toEqual([]);
    expect(changedTables(before, await fingerprint(ORG_A))).toEqual([]);
  });

  it("B ne peut pas créer un rendez-vous qui référence la cliente, le service ou l'employée de A", async () => {
    const file = path.join(API_ROOT, "appointments", "route.ts");
    const [customerA, serviceA, staffA] = await Promise.all([
      firstId("Customer", ORG_A),
      firstId("Service", ORG_A),
      firstId("Staff", ORG_A),
    ]);
    const base = {
      customerId: B.customer,
      serviceId: B.service,
      staffId: B.staff,
      resourceId: B.resource,
      startAt: "2031-02-03T10:00:00.000Z",
      endAt: "2031-02-03T10:30:00.000Z",
      date: "2031-02-03",
      time: "10:00",
      price: 123,
    };
    for (const override of [{ customerId: customerA }, { serviceId: serviceA }, { staffId: staffA }]) {
      const result = await call(file, "POST", "/appointments/", tokenB, {}, { ...base, ...override });
      expect(result.status, JSON.stringify(override)).toBeGreaterThanOrEqual(400);
      expect(result.status, JSON.stringify(override)).not.toBe(401);
    }
    const { rows } = await testPool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM "Appointment" a
       WHERE a."organizationId" = $1
         AND (a."customerId" IN (SELECT id FROM "Customer" WHERE "organizationId" = $2)
           OR a."serviceId" IN (SELECT id FROM "Service" WHERE "organizationId" = $2)
           OR a."staffId" IN (SELECT id FROM "Staff" WHERE "organizationId" = $2))`,
      [ORG_B, ORG_A],
    );
    expect(rows[0].n).toBe("0");
  });

  it("B ne peut rattacher aucune de ses lignes à une ressource de A (références croisées)", async () => {
    const before = await fingerprint(ORG_A);
    const ids: Record<string, string | null> = {};
    for (const table of ["Customer", "Service", "Staff", "Resource", "Supplier", "Product", "Appointment", "Invoice", "Payment", "Promotion", "GiftCard"]) {
      ids[table] = await firstId(table, ORG_A);
    }
    const rand = Math.floor(Math.random() * 1e8);
    const item = {
      productId: ids.Product,
      serviceId: ids.Service,
      name: "Iso",
      quantity: 1,
      quantityOrdered: 1,
      unitPrice: 10,
      price: 10,
      unit: "PIECE",
    };
    // Corps bourré d'identifiants de A sous les noms de champs de référence usuels.
    const stuffed = {
      organizationId: ORG_A,
      customerId: ids.Customer,
      buyerCustomerId: ids.Customer,
      beneficiaryCustomerId: ids.Customer,
      serviceId: ids.Service,
      staffId: ids.Staff,
      absentStaffId: ids.Staff,
      substituteStaffId: ids.Staff,
      resourceId: ids.Resource,
      supplierId: ids.Supplier,
      productId: ids.Product,
      appointmentId: ids.Appointment,
      invoiceId: ids.Invoice,
      paymentId: ids.Payment,
      promotionId: ids.Promotion,
      giftCardId: ids.GiftCard,
      serviceIds: [ids.Service],
      staffIds: [ids.Staff],
      resourceIds: [ids.Resource],
      productIds: [ids.Product],
      items: [item],
      lines: [item],
      products: [item],
      resources: [{ resourceId: ids.Resource, quantity: 1 }],
      name: `Iso croisé ${rand}`,
      firstName: "Iso",
      lastName: "Croisé",
      phone: `06${String(rand).padStart(8, "0")}`,
      code: `ISO${rand}`,
      sku: `ISO-${rand}`,
      description: "Référence croisée",
      reason: "Référence croisée",
      notes: "Référence croisée",
      amount: 10,
      initialAmount: 10,
      price: 10,
      total: 10,
      value: 10,
      quantity: 1,
      durationMin: 30,
      method: "CASH",
      paymentMethod: "CASH",
      type: "IN",
      category: "OTHER",
      date: "2031-04-07",
      time: "10:00",
      expenseDate: "2031-04-07",
      preferredDate: "2031-04-07",
      startAt: "2031-04-07T10:00:00.000Z",
      endAt: "2031-04-07T11:00:00.000Z",
    };
    // Routes de création sans effet externe (pas d'envoi WhatsApp, e-mail, IA).
    const targets = [
      "appointments", "commissions", "expenses", "gift-cards", "invoices", "payments", "planning",
      "pos/sales", "products", "promotions", "purchases", "resources", "services", "staff", "stock",
      "suppliers", "waiting-list",
    ];
    const statuses: string[] = [];
    for (const target of targets) {
      const file = path.join(API_ROOT, ...target.split("/"), "route.ts");
      try {
        const result = await call(file, "POST", `/${target}/`, tokenB, {}, stuffed);
        statuses.push(`${result.status} ${target}`);
        expect(result.status, target).not.toBe(401);
      } catch (error) {
        statuses.push(`exception ${target} ${(error as Error).message.slice(0, 60)}`);
      }
    }
    console.info("[isolation] créations de B avec références de A : " + statuses.join(", "));

    // Une référence croisée devient une fuite dès que la liste de B affiche le nom de la ressource de A.
    const { rows: names } = await testPool.query<{ v: string }>(
      `SELECT "lastName" AS v FROM "Customer" WHERE id = $1 UNION SELECT name FROM "Supplier" WHERE id = $2`,
      [ids.Customer, ids.Supplier],
    );
    const disclosed: string[] = [];
    for (const target of ["expenses", "gift-cards"]) {
      const file = path.join(API_ROOT, target, "route.ts");
      const list = await call(file, "GET", `/${target}/`, tokenB, {});
      for (const { v } of names) {
        if (list.text.includes(v)) disclosed.push(`GET /${target} affiche « ${v} » (donnée de A)`);
      }
    }

    const crossed = await crossOrgReferences();
    expect.soft(crossed, `Références entre instituts : ${crossed.join(" | ")}`).toEqual([]);
    expect.soft(disclosed, `Fuites par référence croisée : ${disclosed.join(" | ")}`).toEqual([]);
    expect(changedTables(before, await fingerprint(ORG_A))).toEqual([]);
  });

  it("200 lectures concurrentes entrelacées : aucune réponse ne mélange les instituts", async () => {
    const file = path.join(API_ROOT, "customers", "route.ts");
    const results = await Promise.all(
      Array.from({ length: 200 }, (_, i) => {
        const asA = i % 2 === 0;
        return call(file, "GET", "/customers/?limit=50", asA ? tokenA : tokenB, {}).then((r) => ({ asA, ...r }));
      }),
    );
    const mixed = results.filter((r) =>
      r.asA ? r.text.includes(B.phone) || r.text.includes(B.lastName) : markersA.some((m) => r.text.includes(m)),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => !r.asA).every((r) => r.text.includes(B.phone))).toBe(true);
    expect(mixed.length).toBe(0);
  });
});
