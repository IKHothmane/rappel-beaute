import "dotenv/config";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/auth/crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const DEMO_PASSWORD = hashPassword("demo1234");

async function upsertOrg() {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "Organization" (id, name, slug, address, city, phone, email, ice, status, "updatedAt")
     VALUES (
       'org_institut_royal', 'Institut Royal', 'institut-royal',
       '12 Bd Zerktouni, Casablanca', 'Casablanca', '+212 5 22 00 11 22',
       'contact@institutroyal.ma', '001234567000012', 'ACTIVE', NOW()
     )
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       address = EXCLUDED.address,
       city = EXCLUDED.city,
       phone = EXCLUDED.phone,
       email = EXCLUDED.email,
       ice = EXCLUDED.ice,
       status = 'ACTIVE'
     RETURNING id`,
  );
  return rows[0].id;
}

async function seedPlatformUser() {
  await pool.query(
    `INSERT INTO "PlatformUser" (id, email, "firstName", "lastName", role, status, "passwordHash", "updatedAt")
     VALUES ('pu_super_admin', 'admin@rappelbeaute.ma', 'Osman', 'Benali', 'SUPER_ADMIN', 'ACTIVE', $1, NOW())
     ON CONFLICT (email) DO UPDATE SET
       "firstName" = EXCLUDED."firstName",
       "lastName" = EXCLUDED."lastName",
       "passwordHash" = EXCLUDED."passwordHash",
       status = 'ACTIVE',
       "updatedAt" = NOW()`,
    [DEMO_PASSWORD],
  );
}

async function seedOrgSubscription(orgId: string) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await pool.query(
    `INSERT INTO "Subscription" (
      id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
      "startedAt", "currentPeriodStart", "currentPeriodEnd", "updatedAt"
    ) VALUES ('sub_institut_royal', $1, 'plan_institut', 'ACTIVE', 499, 'MAD', $2, $2, $3, NOW())
    ON CONFLICT (id) DO UPDATE SET
      "planId" = EXCLUDED."planId",
      "priceSnapshot" = EXCLUDED."priceSnapshot",
      status = 'ACTIVE',
      "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
      "updatedAt" = NOW()`,
    [orgId, now, periodEnd],
  );
}

async function main() {
  const orgId = await upsertOrg();
  await seedPlatformUser();
  await seedOrgSubscription(orgId);

  const users = [
    ["u_owner", "nadia@institutroyal.ma", "Nadia", "Bennani", "+212 6 61 00 11 22", "OWNER"],
    ["u_manager", "manager@institutroyal.ma", "Karim", "Alaoui", "+212 6 61 00 11 23", "MANAGER"],
    ["u_staff", "sara@institutroyal.ma", "Sara", "Bennani", "+212 6 61 00 11 24", "STAFF"],
    ["u_cashier", "caisse@institutroyal.ma", "Fatima", "Tazi", "+212 6 61 00 11 25", "CASHIER"],
    ["u_accountant", "compta@institutroyal.ma", "Youssef", "Idrissi", "+212 6 61 00 11 26", "ACCOUNTANT"],
  ] as const;

  for (const [id, email, firstName, lastName, phone, role] of users) {
    await pool.query(
      `INSERT INTO "User" (id, "organizationId", email, "firstName", "lastName", phone, role, "passwordHash", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT ("organizationId", email) DO UPDATE SET
         "firstName" = EXCLUDED."firstName",
         "lastName" = EXCLUDED."lastName",
         role = EXCLUDED.role,
         "passwordHash" = EXCLUDED."passwordHash",
         "updatedAt" = NOW()`,
      [id, orgId, email, firstName, lastName, phone, role, DEMO_PASSWORD],
    );
  }

  const customers = [
    ["c1", "Sara", "El Amrani", "0661223344", "ACTIVE", true, true, false, "Cliente fidèle depuis 2024"],
    ["c2", "Imane", "Tazi", "0670112233", "ACTIVE", false, true, false, null],
    ["c3", "Meryem", "Alaoui", "0655443322", "AT_RISK", false, false, false, null],
    ["c4", "Lina", "Benjelloun", "0612345678", "NEW", true, false, false, null],
    ["c5", "Salma", "Amrani", "0666778899", "ACTIVE", true, true, true, null],
    ["c6", "Kenza", "Berrada", "0655667788", "NEW", false, false, false, null],
    ["c7", "Houda", "Filali", "0644332211", "ACTIVE", true, false, false, null],
    ["c8", "Nour", "Chakir", "0633221100", "INACTIVE", false, false, false, null],
    ["c9", "Yasmine", "Idrissi", "0622110099", "ACTIVE", true, true, false, null],
    ["c10", "Rim", "Benkirane", "0611009988", "NEW", true, false, false, null],
    ["c11", "Asma", "Lahlou", "0699887766", "ACTIVE", false, true, false, null],
    ["c12", "Zineb", "Ouazzani", "0688776655", "AT_RISK", false, false, false, null],
    ["c13", "Ghita", "Saadi", "0677665544", "ACTIVE", true, true, true, null],
    ["c14", "Dounia", "Tahiri", "0666554433", "INACTIVE", false, false, false, null],
    ["c15", "Siham", "Bouzid", "0655443321", "NEW", true, true, false, null],
    ["c16", "Latifa", "Moussaoui", "0644332210", "ACTIVE", false, false, false, null],
    ["c17", "Hanane", "Kettani", "0633221109", "ACTIVE", true, false, false, null],
    ["c18", "Wafa", "Senhaji", "0622110098", "AT_RISK", false, false, false, null],
    ["c19", "Nadia", "Cherkaoui", "0611009987", "NEW", false, true, false, null],
    ["c20", "Samira", "Belhaj", "0609988776", "INACTIVE", false, false, false, null],
  ] as const;

  for (const [id, firstName, lastName, phone, status, mWa, mEm, mSms, notes] of customers) {
    await pool.query(
      `INSERT INTO "Customer" (
        id, "organizationId", "firstName", "lastName", phone, status,
        "marketingWhatsapp", "marketingEmail", "marketingSms", notes, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      ON CONFLICT (id) DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        phone = EXCLUDED.phone,
        status = EXCLUDED.status,
        "marketingWhatsapp" = EXCLUDED."marketingWhatsapp",
        "marketingEmail" = EXCLUDED."marketingEmail",
        "marketingSms" = EXCLUDED."marketingSms",
        notes = EXCLUDED.notes,
        "updatedAt" = NOW()`,
      [id, orgId, firstName, lastName, phone, status, mWa, mEm, mSms, notes],
    );
  }

  const staffMembers = [
    ["e1", "Sara", "Bennani", "+212 6 70 22 11 01", "sara@institutroyal.ma", "Esthéticienne", "ACTIVE", "2023-03-15"],
    ["e2", "Chaimae", "El Fassi", "+212 6 61 33 44 02", "chaimae@institutroyal.ma", "Esthéticienne", "ACTIVE", "2022-06-01"],
    ["e3", "Nadia", "Bennani", "+212 6 61 00 11 22", "nadia.staff@institutroyal.ma", "Responsable", "ON_LEAVE", "2020-01-10"],
    ["e4", "Imane", "Tazi", "+212 6 55 66 77 04", "imane@institutroyal.ma", "Esthéticienne", "ACTIVE", "2024-09-01"],
    ["e5", "Yasmine", "Idrissi", "+212 6 62 11 00 05", "yasmine.staff@institutroyal.ma", "Maquilleuse", "ACTIVE", "2025-02-20"],
  ] as const;

  for (const [id, firstName, lastName, phone, email, position, status, hireDate] of staffMembers) {
    await pool.query(
      `INSERT INTO "Staff" (
        id, "organizationId", "firstName", "lastName", phone, email, position, status, "hireDate", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::"StaffStatus",$9,NOW())
      ON CONFLICT (id) DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        position = EXCLUDED.position,
        status = EXCLUDED.status,
        "hireDate" = EXCLUDED."hireDate",
        "updatedAt" = NOW()`,
      [id, orgId, firstName, lastName, phone, email, position, status, hireDate],
    );
  }

  async function seedSchedule(staffId: string, day: number, start: string, end: string, active = true) {
    await pool.query(
      `INSERT INTO "StaffSchedule" (id, "staffId", "dayOfWeek", "startTime", "endTime", active)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT ("staffId", "dayOfWeek") DO UPDATE SET
         "startTime" = EXCLUDED."startTime", "endTime" = EXCLUDED."endTime", active = EXCLUDED.active`,
      [`sch_${staffId}_${day}`, staffId, day, start, end, active],
    );
  }

  async function seedBreak(staffId: string, day: number, start: string, end: string) {
    await pool.query(
      `INSERT INTO "StaffBreak" (id, "staffId", "dayOfWeek", "startTime", "endTime")
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [`brk_${staffId}_${day}_${start}`, staffId, day, start, end],
    );
  }

  for (const id of ["e1", "e2", "e4", "e5"]) {
    for (const day of [1, 2, 3, 4, 5]) {
      await seedSchedule(id, day, "09:00", day === 5 ? "16:00" : "18:00");
    }
    await seedSchedule(id, 6, "10:00", "15:00");
    await seedBreak(id, 1, "12:30", "14:00");
    await seedBreak(id, 2, "12:30", "14:00");
    await seedBreak(id, 3, "12:30", "14:00");
    await seedBreak(id, 4, "12:30", "14:00");
    await seedBreak(id, 5, "12:30", "14:00");
    await seedBreak(id, 6, "12:30", "13:30");
  }

  for (const day of [1, 2, 3, 4, 5]) {
    await seedSchedule("e3", day, "09:00", "17:00");
  }

  await pool.query(
    `INSERT INTO "StaffLeave" (id, "staffId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ('lv_e2_sept', 'e2', '2026-09-01', '2026-09-05', 'CONGE', 'Congé annuel', 'APPROVED', NOW())
     ON CONFLICT (id) DO NOTHING`,
  );

  await pool.query(
    `INSERT INTO "StaffLeave" (id, "staffId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ('lv_e3_aug', 'e3', '2026-08-25', '2026-09-10', 'CONGE', 'Congé responsable', 'APPROVED', NOW())
     ON CONFLICT (id) DO NOTHING`,
  );

  const services = [
    ["s1", "Hydrafacial", "Soins visage", "Soin visage profond avec extraction et hydratation.", 450, 60, 10, 15, 50],
    ["s2", "Manucure", "Mains & pieds", "Manucure complète avec vernis.", 200, 45, 5, 10, null],
    ["s3", "Soin visage", "Soins visage", "Soin éclat et hydratation.", 300, 45, 5, 10, 30],
    ["s4", "Massage relaxant", "Corps & massage", "Massage corps aux huiles essentielles.", 350, 60, 10, 15, null],
    ["s5", "Épilation sourcils", "Épilation", "Épilation et mise en forme des sourcils.", 80, 20, 0, 5, null],
    ["s6", "Maquillage événement", "Maquillage", "Maquillage professionnel pour événement.", 400, 75, 15, 10, 100],
  ] as const;

  for (const [id, name, category, description, price, durationMin, prepTimeMin, cleanupTimeMin, deposit] of services) {
    await pool.query(
      `INSERT INTO "Service" (
        id, "organizationId", name, description, category, price, "durationMin",
        "prepTimeMin", "cleanupTimeMin", deposit, active, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        "durationMin" = EXCLUDED."durationMin",
        "prepTimeMin" = EXCLUDED."prepTimeMin",
        "cleanupTimeMin" = EXCLUDED."cleanupTimeMin",
        deposit = EXCLUDED.deposit,
        active = true,
        "updatedAt" = NOW()`,
      [id, orgId, name, description, category, price, durationMin, prepTimeMin, cleanupTimeMin, deposit],
    );
  }

  // Catalogue : stock initial = 0, puis mouvement PURCHASE (ledger = source de vérité)
  const products = [
    // id, name, sku, category, unit, purchase, sale, min, max, consumable, sellable, supplier, brand
    ["p1", "Sérum Hydrafacial", "SER-HYD-01", "PROFESSIONNEL", "ML", 80, null, 10, 100, true, false, "BeautyLab", "HydraPro"],
    ["p2", "Masque visage", "MAS-VIS-02", "CONSOMMABLE", "PIECE", 35, null, 15, 80, true, false, "BeautyLab", null],
    ["p3", "Huile massage", "HUI-MAS-03", "PROFESSIONNEL", "ML", 45, null, 15, 200, true, false, "AromaMaroc", "SpaOil"],
    ["p4", "Gants jetables", "GAN-JET-04", "JETABLE", "PIECE", 0.5, null, 50, 500, true, false, "MedSupply", null],
    ["p5", "Vernis manucure", "VER-MAN-05", "CONSOMMABLE", "PIECE", 25, null, 10, 60, true, false, "NailCo", "Shine"],
    ["p6", "Crème hydratante retail", "CRE-RET-06", "VENTE", "PIECE", 70, 140, 8, 40, false, true, "BeautyLab", "SoftSkin"],
  ] as const;

  for (const [id, name, sku, category, unit, purchase, sale, min, max, consumable, sellable, supplier, brand] of products) {
    await pool.query(
      `INSERT INTO "Product" (
        id, "organizationId", name, sku, category, brand, unit,
        "purchasePrice", "salePrice", stock, "minStock", "maxStock",
        "supplierName", consumable, sellable, active, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5::"ProductCategory",$6,$7::"ProductUnit",
        $8,$9,0,$10,$11,$12,$13,$14,true,NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sku = EXCLUDED.sku,
        category = EXCLUDED.category,
        brand = EXCLUDED.brand,
        unit = EXCLUDED.unit,
        "purchasePrice" = EXCLUDED."purchasePrice",
        "salePrice" = EXCLUDED."salePrice",
        "minStock" = EXCLUDED."minStock",
        "maxStock" = EXCLUDED."maxStock",
        "supplierName" = EXCLUDED."supplierName",
        consumable = EXCLUDED.consumable,
        sellable = EXCLUDED.sellable,
        active = true,
        "updatedAt" = NOW()`,
      [id, orgId, name, sku, category, brand, unit, purchase, sale, min, max, supplier, consumable, sellable],
    );
  }

  // Stocks initiaux via mouvements PURCHASE (idempotents)
  const initialStock = [
    ["p1", 100, "Réception initiale sérum"],
    ["p2", 40, "Réception initiale masques"],
    ["p3", 200, "Réception initiale huile"],
    ["p4", 200, "Réception initiale gants"],
    ["p5", 30, "Réception initiale vernis"],
    ["p6", 24, "Réception initiale crème retail"],
  ] as const;

  for (const [productId, qty, reason] of initialStock) {
    const key = `seed:init:${productId}`;
    const exists = await pool.query(
      `SELECT 1 FROM "InventoryMovement" WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [orgId, key],
    );
    if (exists.rows.length) continue;

    const unitRes = await pool.query<{ unit: string }>(
      `SELECT unit::text AS unit FROM "Product" WHERE id = $1`,
      [productId],
    );
    const unit = unitRes.rows[0]?.unit ?? "UNIT";
    const movId = `mov_seed_${productId}`;
    await pool.query(
      `INSERT INTO "InventoryMovement" (
        id, "organizationId", "productId", type, quantity, unit, reason,
        "referenceType", "idempotencyKey"
      ) VALUES (
        $1,$2,$3,'PURCHASE'::"MovementType",$4,$5::"ProductUnit",$6,
        'PURCHASE'::"InventoryReferenceType",$7
      )`,
      [movId, orgId, productId, qty, unit, reason, key],
    );
    await pool.query(
      `UPDATE "Product" SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2`,
      [qty, productId],
    );
  }

  // Lots avec expiration (démo alertes)
  await pool.query(
    `INSERT INTO "ProductLot" (id, "productId", "lotNumber", quantity, "expiresAt", "updatedAt")
     VALUES
       ('lot_p1_a', 'p1', 'LOT-SER-0826', 100, NOW() + INTERVAL '45 days', NOW()),
       ('lot_p2_a', 'p2', 'LOT-MAS-0826', 40, NOW() + INTERVAL '20 days', NOW()),
       ('lot_p6_a', 'p6', 'LOT-CRE-0826', 24, NOW() + INTERVAL '90 days', NOW())
     ON CONFLICT (id) DO NOTHING`,
  );

  // Recalibrer le cache stock depuis le ledger (source de vérité)
  await pool.query(
    `UPDATE "Product" p
     SET stock = COALESCE((
       SELECT SUM(im.quantity) FROM "InventoryMovement" im WHERE im."productId" = p.id
     ), 0),
     "updatedAt" = NOW()
     WHERE p."organizationId" = $1`,
    [orgId],
  );

  // ─── Fournisseurs + ProductSupplier + commande démo ────────────────────────
  const suppliers = [
    ["sup_beauty", "Beauty Pro", "06 61 22 33 44", "contact@beautypro.ma", "Casablanca", "Amine Saidi"],
    ["sup_cosmo", "Cosmo Maroc", "06 62 11 22 33", "cmd@cosmomaroc.ma", "Rabat", "Leila Cherkaoui"],
    ["sup_hydra", "Hydra Supply", "06 63 44 55 66", "hello@hydrasupply.ma", "Marrakech", "Yassine Bennani"],
  ] as const;

  for (const [id, name, phone, email, address, contactName] of suppliers) {
    await pool.query(
      `INSERT INTO "Supplier" (
        id, "organizationId", name, phone, email, address, "contactName", active, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email,
        address = EXCLUDED.address, "contactName" = EXCLUDED."contactName",
        active = true, "deletedAt" = NULL, "updatedAt" = NOW()`,
      [id, orgId, name, phone, email, address, contactName],
    );
  }

  const productSuppliers = [
    // id, productId, supplierId, price, preferred
    ["ps1", "p1", "sup_beauty", 80, true],
    ["ps2", "p1", "sup_hydra", 83, false],
    ["ps3", "p1", "sup_cosmo", 87, false],
    ["ps4", "p2", "sup_beauty", 35, true],
    ["ps5", "p4", "sup_cosmo", 0.5, true],
    ["ps6", "p6", "sup_beauty", 70, true],
    ["ps7", "p3", "sup_hydra", 45, true],
  ] as const;

  for (const [id, productId, supplierId, price, preferred] of productSuppliers) {
    await pool.query(
      `INSERT INTO "ProductSupplier" (
        id, "productId", "supplierId", "purchasePrice", preferred, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT ("productId", "supplierId") DO UPDATE SET
        "purchasePrice" = EXCLUDED."purchasePrice",
        preferred = EXCLUDED.preferred,
        "updatedAt" = NOW()`,
      [id, productId, supplierId, price, preferred],
    );
  }

  // Commande brouillon + commande en attente de réception
  await pool.query(
    `INSERT INTO "Purchase" (
      id, "organizationId", "supplierId", number, status, notes, "orderedAt", "receivedAt", "createdById", "updatedAt"
    ) VALUES
      ('pur_demo_1', $1, 'sup_beauty', 'ACH-2026-0001', 'ORDERED'::"PurchaseStatus",
       'Réassort sérum / masques', NOW() - INTERVAL '2 days', NULL, 'u_owner', NOW()),
      ('pur_demo_2', $1, 'sup_cosmo', 'ACH-2026-0002', 'DRAFT'::"PurchaseStatus",
       'Gants jetables', NULL, NULL, 'u_manager', NOW())
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      "orderedAt" = EXCLUDED."orderedAt",
      "receivedAt" = NULL,
      "updatedAt" = NOW()`,
    [orgId],
  );

  // Reset lignes démo (sans toucher aux réceptions réelles hors seed — purge démo)
  await pool.query(`DELETE FROM "PurchaseReceiptLine" WHERE "receiptId" IN (
    SELECT id FROM "PurchaseReceipt" WHERE "purchaseId" IN ('pur_demo_1','pur_demo_2')
  )`);
  await pool.query(`DELETE FROM "PurchaseReceipt" WHERE "purchaseId" IN ('pur_demo_1','pur_demo_2')`);
  await pool.query(`DELETE FROM "PurchaseItem" WHERE "purchaseId" IN ('pur_demo_1','pur_demo_2')`);

  await pool.query(
    `INSERT INTO "PurchaseItem" (
      id, "purchaseId", "productId", "quantityOrdered", "quantityReceived", "unitPrice", unit
    ) VALUES
      ('pui1', 'pur_demo_1', 'p1', 10, 0, 80, 'ML'::"ProductUnit"),
      ('pui2', 'pur_demo_1', 'p2', 20, 0, 35, 'PIECE'::"ProductUnit"),
      ('pui3', 'pur_demo_1', 'p4', 100, 0, 1, 'PIECE'::"ProductUnit"),
      ('pui4', 'pur_demo_2', 'p4', 200, 0, 0.5, 'PIECE'::"ProductUnit")`,
  );

  async function linkStaff(serviceId: string, staffIds: string[]) {
    for (const staffId of staffIds) {
      await pool.query(
        `INSERT INTO "ServiceStaff" ("serviceId", "staffId") VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [serviceId, staffId],
      );
    }
  }

  async function linkResource(serviceId: string, resourceId: string, qty = 1) {
    await pool.query(
      `INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [serviceId, resourceId, qty],
    );
  }

  async function linkProduct(serviceId: string, productId: string, qty: number, unit: string) {
    await pool.query(
      `INSERT INTO "ServiceProduct" ("serviceId", "productId", quantity, unit) VALUES ($1,$2,$3,$4)
       ON CONFLICT ("serviceId", "productId") DO UPDATE SET quantity = EXCLUDED.quantity, unit = EXCLUDED.unit`,
      [serviceId, productId, qty, unit],
    );
  }

  async function linkCommission(
    id: string,
    serviceId: string,
    staffId: string,
    type: "PERCENTAGE" | "FIXED",
    percentage: number | null,
    fixed: number | null,
  ) {
    await pool.query(
      `INSERT INTO "ServiceCommission" (id, "serviceId", "staffId", type, percentage, "fixedAmount")
       VALUES ($1,$2,$3,$4::"CommissionType",$5,$6)
       ON CONFLICT ("serviceId", "staffId") DO UPDATE SET type = EXCLUDED.type, percentage = EXCLUDED.percentage, "fixedAmount" = EXCLUDED."fixedAmount"`,
      [id, serviceId, staffId, type, percentage, fixed],
    );
  }

  const resources = [
    ["r1", "Cabine 1", "CABINE", 1, "RDC"],
    ["r2", "Cabine 2", "CABINE", 1, "RDC"],
    ["r3", "Salle massage", "SALLE", 1, "Étage"],
    ["r4", "Machine Hydrafacial", "MACHINE", 1, "Cabine 1/2"],
    ["r5", "Fauteuil manucure", "FAUTEUIL", 1, "Zone ongles"],
    ["r6", "Table épilation", "TABLE", 1, "Cabine 1"],
  ] as const;

  for (const [id, name, type, capacity, location] of resources) {
    await pool.query(
      `INSERT INTO "Resource" (id, "organizationId", name, type, capacity, location, active, "updatedAt")
       VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,true,NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         capacity = EXCLUDED.capacity,
         location = EXCLUDED.location,
         active = true,
         "updatedAt" = NOW()`,
      [id, orgId, name, type, capacity, location],
    );
  }

  await pool.query(
    `INSERT INTO "ResourceMaintenance" (id, "resourceId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ('mnt_r4_sept', 'r4', '2026-09-02 08:00:00', '2026-09-02 18:00:00', 'PREVENTIVE', 'Révision machine Hydrafacial', 'SCHEDULED', NOW())
     ON CONFLICT (id) DO NOTHING`,
  );

  await linkStaff("s1", ["e1", "e2", "e4"]);
  await linkResource("s1", "r1");
  await linkResource("s1", "r2");
  await linkResource("s1", "r4");
  await linkProduct("s1", "p1", 5, "ML");
  await linkProduct("s1", "p2", 1, "PIECE");
  await linkProduct("s1", "p4", 1, "PIECE");
  await linkCommission("sc1", "s1", "e2", "PERCENTAGE", 10, null);
  await linkCommission("sc2", "s1", "e1", "PERCENTAGE", 12, null);
  await linkCommission("sc2b", "s1", "e4", "PERCENTAGE", 10, null);

  await linkStaff("s2", ["e1", "e2", "e5"]);
  await linkResource("s2", "r5");
  await linkResource("s5", "r6");
  await linkProduct("s2", "p5", 1, "PIECE");
  await linkCommission("sc3", "s2", "e1", "PERCENTAGE", 8, null);
  await linkCommission("sc3b", "s2", "e2", "FIXED", null, 30);

  await linkStaff("s3", ["e1", "e2", "e4"]);
  await linkResource("s3", "r1");
  await linkResource("s3", "r2");
  await linkProduct("s3", "p2", 1, "PIECE");
  await linkCommission("sc5", "s3", "e1", "PERCENTAGE", 10, null);
  await linkCommission("sc5b", "s3", "e2", "PERCENTAGE", 10, null);
  await linkCommission("sc5c", "s3", "e4", "PERCENTAGE", 10, null);

  await linkStaff("s4", ["e2", "e4"]);
  await linkResource("s4", "r3");
  await linkProduct("s4", "p3", 15, "ML");
  await linkProduct("s4", "p4", 1, "PIECE");
  await linkCommission("sc4", "s4", "e3", "FIXED", null, 50);
  await linkCommission("sc4b", "s4", "e2", "PERCENTAGE", 10, null);
  await linkCommission("sc4c", "s4", "e4", "PERCENTAGE", 10, null);

  await linkStaff("s5", ["e1", "e2"]);
  await linkResource("s5", "r1");

  await linkStaff("s6", ["e1", "e5"]);
  await linkResource("s6", "r2");

  const appointments = [
    ["apt-001", "c1", "s1", "e2", "r2", "2026-08-30T09:00:00", "2026-08-30T10:00:00", 450, 50, "CONFIRMED"],
    ["apt-002", "c2", "s3", "e1", "r1", "2026-08-30T10:30:00", "2026-08-30T11:30:00", 300, null, "PENDING"],
    ["apt-003", "c3", "s4", "e3", "r3", "2026-08-30T14:30:00", "2026-08-30T15:30:00", 350, null, "CONFIRMED"],
    ["apt-004", "c4", "s2", "e1", "r1", "2026-08-30T12:00:00", "2026-08-30T12:45:00", 150, null, "ARRIVED"],
    ["apt-005", "c1", "s2", "e2", "r2", "2026-08-31T11:00:00", "2026-08-31T11:45:00", 150, null, "COMPLETED"],
    ["apt-005b", "c2", "s1", "e2", "r2", "2026-08-31T14:00:00", "2026-08-31T15:00:00", 450, 100, "COMPLETED"],
    ["apt-005c", "c4", "s3", "e1", "r1", "2026-08-31T16:00:00", "2026-08-31T17:00:00", 300, null, "ARRIVED"],
    ["apt-006", "c2", "s1", "e2", "r2", "2026-08-28T15:00:00", "2026-08-28T16:00:00", 450, null, "COMPLETED"],
    ["apt-007", "c1", "s1", "e2", "r2", "2026-08-28T09:00:00", "2026-08-28T10:00:00", 450, null, "COMPLETED"],
    ["apt-008", "c1", "s3", "e1", "r1", "2026-08-20T10:00:00", "2026-08-20T11:00:00", 300, null, "COMPLETED"],
    ["apt-009", "c1", "s4", "e3", "r3", "2026-08-15T14:00:00", "2026-08-15T15:00:00", 350, null, "COMPLETED"],
    ["apt-010", "c1", "s2", "e2", "r2", "2026-08-10T11:00:00", "2026-08-10T11:45:00", 150, null, "COMPLETED"],
    ["apt-011", "c1", "s1", "e2", "r2", "2026-07-25T09:00:00", "2026-07-25T10:00:00", 450, null, "COMPLETED"],
    ["apt-012", "c1", "s3", "e1", "r1", "2026-07-10T10:30:00", "2026-07-10T11:30:00", 300, null, "COMPLETED"],
    ["apt-013", "c1", "s2", "e2", "r2", "2026-06-28T12:00:00", "2026-06-28T12:45:00", 150, null, "COMPLETED"],
    ["apt-014", "c1", "s1", "e2", "r2", "2026-06-15T09:00:00", "2026-06-15T10:00:00", 450, null, "COMPLETED"],
    ["apt-015", "c2", "s2", "e1", "r1", "2026-08-20T12:00:00", "2026-08-20T12:45:00", 150, null, "COMPLETED"],
    ["apt-016", "c2", "s3", "e1", "r1", "2026-08-05T10:00:00", "2026-08-05T11:00:00", 300, null, "COMPLETED"],
    ["apt-017", "c5", "s1", "e2", "r2", "2026-08-25T09:00:00", "2026-08-25T10:00:00", 450, null, "COMPLETED"],
    ["apt-018", "c5", "s4", "e3", "r3", "2026-08-18T15:00:00", "2026-08-18T16:00:00", 350, null, "COMPLETED"],
    ["apt-019", "c5", "s2", "e2", "r2", "2026-08-12T11:00:00", "2026-08-12T11:45:00", 150, null, "COMPLETED"],
    ["apt-020", "c9", "s1", "e2", "r2", "2026-08-22T09:00:00", "2026-08-22T10:00:00", 450, null, "COMPLETED"],
    ["apt-021", "c9", "s3", "e1", "r1", "2026-08-08T10:00:00", "2026-08-08T11:00:00", 300, null, "COMPLETED"],
    ["apt-022", "c13", "s4", "e3", "r3", "2026-08-26T14:00:00", "2026-08-26T15:00:00", 350, null, "COMPLETED"],
    ["apt-023", "c3", "s2", "e1", "r1", "2026-05-01T12:00:00", "2026-05-01T12:45:00", 150, null, "COMPLETED"],
    ["apt-024", "c12", "s3", "e1", "r1", "2026-04-10T10:00:00", "2026-04-10T11:00:00", 300, null, "COMPLETED"],
    ["apt-025", "c6", "s2", "e2", "r2", "2026-08-29T11:00:00", "2026-08-29T11:45:00", 150, null, "CANCELLED"],
    ["apt-026", "c7", "s1", "e2", "r2", "2026-08-27T09:00:00", "2026-08-27T10:00:00", 450, null, "NO_SHOW"],
  ] as const;

  for (const [id, customerId, serviceId, staffId, resourceId, startAt, endAt, price, deposit, status] of appointments) {
    await pool.query(
      `INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
        "startAt", "endAt", price, deposit, status, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::"AppointmentStatus",NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        price = EXCLUDED.price,
        deposit = EXCLUDED.deposit,
        "updatedAt" = NOW()`,
      [id, orgId, customerId, serviceId, staffId, resourceId, startAt, endAt, price, deposit, status],
    );
  }

  // ─── Finance démo : caisse ouverte + paiements (ledger) ────────────────────
  await pool.query(
    `UPDATE "CashRegisterSession"
     SET status = 'CLOSED'::"CashRegisterStatus",
         "closedAt" = COALESCE("closedAt", NOW()),
         "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND status = 'OPEN' AND id <> 'crs_demo_today'`,
    [orgId],
  );

  await pool.query(
    `INSERT INTO "CashRegisterSession" (
      id, "organizationId", "openedById", "openingFloat", status, notes, "openedAt", "updatedAt"
    ) VALUES (
      'crs_demo_today', $1, 'u_cashier', 1000, 'OPEN'::"CashRegisterStatus",
      'Caisse démo', date_trunc('day', NOW()) + INTERVAL '9 hours', NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'OPEN'::"CashRegisterStatus",
      "closedAt" = NULL,
      "closedById" = NULL,
      "openingFloat" = 1000,
      "updatedAt" = NOW()`,
    [orgId],
  );

  await pool.query(
    `INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
    ) VALUES (
      'ctx_open_demo', $1, 'crs_demo_today', 'OPENING'::"CashTxnType", 1000,
      'CASH'::"PaymentMethod", 'Fond de caisse', 'u_cashier', 'open:crs_demo_today'
    )
    ON CONFLICT (id) DO NOTHING`,
    [orgId],
  );

  // Acompte 100 + solde multi-méthodes sur apt-005b
  const demoPayments = [
    ["pay_dep_005b", "apt-005b", "c2", 100, "CASH", "DEPOSIT", "seed:dep:apt-005b"],
    ["pay_bal_005b_cash", "apt-005b", "c2", 150, "CASH", "PAYMENT", "seed:bal:apt-005b:cash"],
    ["pay_bal_005b_card", "apt-005b", "c2", 200, "CARD", "PAYMENT", "seed:bal:apt-005b:card"],
    ["pay_005", "apt-005", "c1", 150, "CARD", "PAYMENT", "seed:pay:apt-005"],
  ] as const;

  for (const [id, aptId, custId, amount, method, kind, key] of demoPayments) {
    await pool.query(
      `INSERT INTO "Payment" (
        id, "organizationId", "appointmentId", "customerId", amount, method, kind,
        status, "userId", "idempotencyKey", "paidAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6::"PaymentMethod",$7::"PaymentKind",
        'COMPLETED'::"PaymentStatus",'u_cashier',$8,NOW(),NOW()
      )
      ON CONFLICT (id) DO NOTHING`,
      [id, orgId, aptId, custId, amount, method, kind, key],
    );
  }

  // Mouvements caisse pour les paiements espèces (idempotents)
  await pool.query(
    `INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "paymentId", "userId", "idempotencyKey"
    ) VALUES
      ('ctx_sale_dep', $1, 'crs_demo_today', 'SALE'::"CashTxnType", 100, 'CASH'::"PaymentMethod",
       'Acompte', 'pay_dep_005b', 'u_cashier', 'cashpay:pay_dep_005b'),
      ('ctx_sale_bal', $1, 'crs_demo_today', 'SALE'::"CashTxnType", 150, 'CASH'::"PaymentMethod",
       'Encaissement RDV', 'pay_bal_005b_cash', 'u_cashier', 'cashpay:pay_bal_005b_cash')
    ON CONFLICT (id) DO NOTHING`,
    [orgId],
  );

  // Factures + commissions pour tous les RDV COMPLETED (idempotentes, snapshots)
  const { issueInvoiceFromAppointment } = await import("../src/lib/db/invoices");
  const { createCommissionForAppointment } = await import("../src/lib/db/commissions");
  const completedApts = await pool.query<{ id: string }>(
    `SELECT id FROM "Appointment"
     WHERE "organizationId" = $1 AND status = 'COMPLETED'`,
    [orgId],
  );
  for (const row of completedApts.rows) {
    await issueInvoiceFromAppointment(orgId, { appointmentId: row.id }, "u_owner");
    await createCommissionForAppointment({ organizationId: orgId, appointmentId: row.id });
  }

  // Dépenses opérationnelles (≠ Purchase stock)
  const expenses = [
    ["exp_rent", "RENT", 8000, "TRANSFER", "Loyer août", null, "2026-08-01", "LOY-08-2026"],
    ["exp_elec", "ELECTRICITY", 1250, "TRANSFER", "Facture ONEE", null, "2026-08-31", "FAC-08-2026"],
    ["exp_mkt", "MARKETING", 800, "CARD", "Instagram Ads", null, "2026-08-28", null],
    ["exp_maint", "MAINTENANCE", 350, "CASH", "Petit matériel cabine", "sup_cosmo", "2026-08-30", null],
  ] as const;

  for (const [id, category, amount, method, description, supplierId, date, reference] of expenses) {
    await pool.query(
      `INSERT INTO "Expense" (
        id, "organizationId", category, amount, "paymentMethod", description,
        "supplierId", "expenseDate", reference, status, "createdById", "updatedAt"
      ) VALUES (
        $1,$2,$3::"ExpenseCategory",$4,$5::"PaymentMethod",$6,
        $7,$8,$9,'RECORDED'::"ExpenseStatus",'u_owner',NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        status = 'RECORDED'::"ExpenseStatus",
        "updatedAt" = NOW()`,
      [id, orgId, category, amount, method, description, supplierId, date, reference],
    );
  }

  // Sortie caisse pour dépense espèces (si session ouverte)
  await pool.query(
    `INSERT INTO "CashRegisterTransaction" (
      id, "organizationId", "sessionId", type, amount, method, reason, "userId", "idempotencyKey"
    )
    SELECT
      'ctx_exp_maint', $1, s.id, 'EXPENSE'::"CashTxnType", -350,
      'CASH'::"PaymentMethod", 'Petit matériel cabine', 'u_owner', 'expense:exp_maint'
    FROM "CashRegisterSession" s
    WHERE s.id = 'crs_demo_today' AND s.status = 'OPEN'
    ON CONFLICT (id) DO NOTHING`,
    [orgId],
  );

  // Fidélité : programme + récompenses + points depuis paiements + forfait démo
  await pool.query(
    `INSERT INTO "LoyaltyProgram" (
      id, "organizationId", "madPerPoint", "bronzeMin", "silverMin", "goldMin", "vipMin", active, "updatedAt"
    ) VALUES ('lprog_demo', $1, 1, 0, 1000, 3000, 6000, true, NOW())
    ON CONFLICT ("organizationId") DO UPDATE SET
      "madPerPoint" = EXCLUDED."madPerPoint",
      "updatedAt" = NOW()`,
    [orgId],
  );

  const rewardsSeed = [
    ["lrwd_50", "Remise 50 MAD", 500, "DISCOUNT_FIXED", 50],
    ["lrwd_soin", "Soin visage offert", 1000, "FREE_SERVICE", null],
    ["lrwd_20", "Remise 20 %", 2000, "DISCOUNT_PERCENT", 20],
  ] as const;
  for (const [id, name, cost, type, value] of rewardsSeed) {
    await pool.query(
      `INSERT INTO "LoyaltyReward" (
        id, "organizationId", name, "pointsCost", type, value, active, "redemptionCount", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5::"LoyaltyRewardType",$6,true,0,NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        "pointsCost" = EXCLUDED."pointsCost",
        "updatedAt" = NOW()`,
      [id, orgId, name, cost, type, value],
    );
  }

  const { earnPointsFromPayment, consumePackageSessionForAppointment } = await import(
    "../src/lib/db/loyalty"
  );
  const pays = await pool.query<{
    id: string;
    customerId: string;
    amount: string;
    appointmentId: string | null;
    kind: string;
  }>(
    `SELECT id, "customerId", amount::text, "appointmentId", kind::text
     FROM "Payment"
     WHERE "organizationId" = $1 AND status = 'COMPLETED' AND kind <> 'REFUND'
       AND "customerId" IS NOT NULL`,
    [orgId],
  );
  for (const p of pays.rows) {
    await earnPointsFromPayment({
      organizationId: orgId,
      customerId: p.customerId,
      paymentId: p.id,
      amountMad: parseFloat(p.amount) || 0,
      appointmentId: p.appointmentId,
      userId: "u_owner",
    });
  }

  // Forfait Hydrafacial pour Sara (c1) — 6 séances, 3 déjà consommées via PackageSession
  await pool.query(
    `INSERT INTO "Package" (
      id, "organizationId", "customerId", name, "serviceId",
      "sessionTotal", "sessionUsed", "pricePaid", status, "createdById", "updatedAt"
    ) VALUES (
      'pkg_hydra_c1', $1, 'c1', 'Forfait Hydrafacial', 's1',
      6, 0, 2400, 'ACTIVE'::"PackageStatus", 'u_owner', NOW()
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW()`,
    [orgId],
  );
  await pool.query(
    `INSERT INTO "PackageItem" (id, "packageId", "serviceId", "sessionTotal", "sessionUsed")
     VALUES ('pki_hydra_c1', 'pkg_hydra_c1', 's1', 6, 0)
     ON CONFLICT (id) DO NOTHING`,
  );

  // Consommer séances pour RDV Hydrafacial COMPLETED de c1 (idempotent)
  const hydraApts = await pool.query<{ id: string }>(
    `SELECT id FROM "Appointment"
     WHERE "organizationId" = $1 AND "customerId" = 'c1' AND "serviceId" = 's1'
       AND status = 'COMPLETED'
     ORDER BY "startAt" ASC
     LIMIT 3`,
    [orgId],
  );
  for (const row of hydraApts.rows) {
    await consumePackageSessionForAppointment({
      organizationId: orgId,
      appointmentId: row.id,
      customerId: "c1",
      serviceId: "s1",
    });
  }

  // Promotions démo
  await pool.query(
    `INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "serviceId",
      "minAmount", "maxUses", "usageCount", "startsAt", "endsAt", "updatedAt"
    ) VALUES
      ('promo_rentree', $1, '-20% Soin visage', 'RENTREE20', 'PERCENTAGE'::"PromotionType",
       'ACTIVE'::"PromotionStatus", 20, 's3', 300, 100, 0,
       '2026-09-01', '2026-09-15', NOW()),
      ('promo_happy', $1, 'Happy Hour', NULL, 'HAPPY_HOUR'::"PromotionType",
       'ACTIVE'::"PromotionStatus", 50, NULL, NULL, NULL, 0,
       NULL, NULL, NOW()),
      ('promo_pack', $1, 'Pack rentrée', NULL, 'PACKAGE'::"PromotionType",
       'ACTIVE'::"PromotionStatus", NULL, 's1', NULL, NULL, 0,
       '2026-09-01', '2026-09-30', NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW()`,
    [orgId],
  );
  await pool.query(
    `UPDATE "Promotion" SET "timeStart" = '14:00', "timeEnd" = '17:00', weekdays = '1,2,3,4,5'
     WHERE id = 'promo_happy'`,
  );

  // Cartes cadeaux démo
  const existingGc = await pool.query(`SELECT 1 FROM "GiftCard" WHERE id = 'gc_demo_500'`);
  if (!existingGc.rows[0]) {
    await pool.query(
      `INSERT INTO "GiftCard" (
        id, "organizationId", code, "initialValue", balance,
        "buyerCustomerId", "beneficiaryCustomerId", status, "expiresAt", "createdById", "updatedAt"
      ) VALUES (
        'gc_demo_500', $1, 'BEAUTY-8F42-K9', 500, 500,
        'c5', 'c1', 'ACTIVE'::"GiftCardStatus", '2026-12-31', 'u_owner', NOW()
      )`,
      [orgId],
    );
    await pool.query(
      `INSERT INTO "GiftCardTransaction" (
        id, "organizationId", "giftCardId", type, amount, "balanceAfter",
        reason, "createdById", "idempotencyKey"
      ) VALUES (
        'gctx_demo_issue', $1, 'gc_demo_500', 'ISSUED'::"GiftCardTxnType", 500, 500,
        'Émission démo', 'u_owner', 'issue:gc_demo_500'
      )
      ON CONFLICT DO NOTHING`,
      [orgId],
    );
  }

  // ─── RDV futurs (WhatsApp rappels / confirmations) ─────────────────────────
  const tomorrowAppointments = [
    ["apt-tom-1", "c1", "s1", "e2", "r2", 14, 30, 450, 50, "CONFIRMED"],
    ["apt-tom-2", "c2", "s2", "e1", "r1", 10, 0, 200, null, "PENDING"],
    ["apt-tom-3", "c9", "s3", "e1", "r1", 16, 0, 300, null, "CONFIRMED"],
    ["apt-tom-4", "c5", "s4", "e4", "r3", 11, 30, 350, null, "PENDING"],
  ] as const;

  for (const [id, customerId, serviceId, staffId, resourceId, h, m, price, deposit, status] of tomorrowAppointments) {
    await pool.query(
      `INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
        "startAt", "endAt", price, deposit, status, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '1 day' + make_interval(hours => $7, mins => $8),
        date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '1 day' + make_interval(hours => $7, mins => $8) + INTERVAL '1 hour',
        $9,$10,$11::"AppointmentStatus",NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        "startAt" = EXCLUDED."startAt",
        "endAt" = EXCLUDED."endAt",
        status = EXCLUDED.status,
        "updatedAt" = NOW()`,
      [id, orgId, customerId, serviceId, staffId, resourceId, h, m, price, deposit, status],
    );
  }

  await pool.query(
    `INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
      "startAt", "endAt", price, deposit, status, "updatedAt"
    ) VALUES (
      'apt-j2-1', $1, 'c7', 's1', 'e2', 'r2',
      date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '2 days' + INTERVAL '15 hours',
      date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') + INTERVAL '2 days' + INTERVAL '16 hours',
      450, NULL, 'PENDING'::"AppointmentStatus", NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      "startAt" = EXCLUDED."startAt",
      status = EXCLUDED.status,
      "updatedAt" = NOW()`,
    [orgId],
  );

  await pool.query(
    `UPDATE "Customer" SET "birthDate" = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int - 28, EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(DAY FROM CURRENT_DATE)::int)
     WHERE id = 'c13' AND "organizationId" = $1`,
    [orgId],
  );

  await pool.query(
    `INSERT INTO "ReactivationSettings" (
      id, "organizationId", "minimumDaysBetweenMarketingMessages",
      "promoCode45", "promoCode60", "promoCode90", "updatedAt"
    ) VALUES (
      'rset_demo', $1, 30, 'RETOUR10', 'RETOUR15', 'RETOUR20', NOW()
    )
    ON CONFLICT ("organizationId") DO UPDATE SET
      "promoCode45" = EXCLUDED."promoCode45",
      "updatedAt" = NOW()`,
    [orgId],
  );

  await pool.query(
    `INSERT INTO "ReviewSettings" (
      id, "organizationId", "googleReviewUrl", "delayHours", "maxWindowHours", enabled, "updatedAt"
    ) VALUES (
      'revset_demo', $1, NULL, 3, 24, true, NOW()
    )
    ON CONFLICT ("organizationId") DO UPDATE SET
      enabled = EXCLUDED.enabled,
      "delayHours" = EXCLUDED."delayHours",
      "updatedAt" = NOW()`,
    [orgId],
  );

  await pool.query(
    `INSERT INTO "Campaign" (
      id, "organizationId", name, channel, status, "messageTemplate", "segmentFilters",
      "promotionId", "createdById", "updatedAt"
    ) VALUES (
      'camp_demo_hydra', $1, 'Retour Hydrafacial', 'WHATSAPP'::"CampaignChannel",
      'DRAFT'::"CampaignStatus",
      $2,
      $3::jsonb,
      'promo_rentree',
      'u_owner',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW()`,
    [
      orgId,
      `Bonjour {{customer.firstName}} 🌸

Nous avons pensé à vous !
Votre dernier {{lastService.name}} remonte à {{lastVisit.date}}.

Profitez de {{promotion.discount}} avec le code {{promotion.code}}.

À bientôt ❤️`,
      JSON.stringify({
        minDaysSinceLastVisit: 45,
        serviceIds: ["s1"],
        marketingWhatsapp: true,
        noUpcomingAppointment: true,
        excludeRecentMarketing: true,
      }),
    ],
  );

  await pool.query(
    `UPDATE "Customer" SET "marketingWhatsapp" = true
     WHERE id IN ('c3', 'c12') AND "organizationId" = $1`,
    [orgId],
  );

  await pool.query(
    `UPDATE "Campaign" SET status = 'DRAFT'::"CampaignStatus", "audienceCount" = 0, "preparedAt" = NULL
     WHERE id = 'camp_demo_hydra' AND "organizationId" = $1`,
    [orgId],
  );

  const { ensureDefaultTemplates, syncWhatsAppTasks } = await import("../src/lib/db/whatsapp");
  const { syncReviewRequests } = await import("../src/lib/db/reviews");
  await ensureDefaultTemplates(orgId);
  await syncWhatsAppTasks(orgId);
  await syncReviewRequests(orgId);

  console.log("Seed OK — Institut Royal prêt.");
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
