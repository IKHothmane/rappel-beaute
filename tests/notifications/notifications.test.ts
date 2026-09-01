import { describe, expect, it } from "vitest";
import {
  buildIdempotencyKey,
  createNotificationForUser,
  emitNotification,
  getNotificationForUser,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/notifications";
import {
  buildNotificationHref,
  rolesForNotificationType,
  typesForCategory,
} from "@/lib/notifications/permissions";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

async function getOwnerUserId(orgId: string): Promise<string> {
  const { rows } = await testPool.query<{ id: string }>(
    `SELECT id FROM "User" WHERE "organizationId" = $1 AND role = 'OWNER' LIMIT 1`,
    [orgId],
  );
  if (!rows[0]) throw new Error("OWNER seed introuvable");
  return rows[0].id;
}

async function getManagerUserId(orgId: string): Promise<string> {
  const { rows } = await testPool.query<{ id: string }>(
    `SELECT id FROM "User" WHERE "organizationId" = $1 AND role = 'MANAGER' LIMIT 1`,
    [orgId],
  );
  if (!rows[0]) throw new Error("MANAGER seed introuvable");
  return rows[0].id;
}

run("Notifications — création", () => {
  it("crée une notification pour un utilisateur", async () => {
    const orgId = await getSeedOrgId();
    const userId = await getOwnerUserId(orgId);
    const entityId = testId("ntf_prod");

    const result = await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "STOCK_LOW",
      title: "Stock faible",
      message: "Test produit",
      eventKey: "stock_low",
      entityType: "Product",
      entityId,
    });

    expect(result.created).toBe(true);
    expect(result.id).toBeTruthy();

    const item = await getNotificationForUser(orgId, userId, result.id!);
    expect(item?.type).toBe("STOCK_LOW");
    expect(item?.entityId).toBe(entityId);
    expect(item?.href).toBe(`/products/${entityId}/`);
  });
});

run("Notifications — idempotence", () => {
  it("ignore le doublon notification:{event}:{entity}:{user}", async () => {
    const orgId = await getSeedOrgId();
    const userId = await getOwnerUserId(orgId);
    const entityId = testId("ntf_dup");

    const key = buildIdempotencyKey("stock_low", entityId, userId);
    expect(key).toBe(`notification:stock_low:${entityId}:${userId}`);

    const first = await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "STOCK_LOW",
      title: "A",
      message: "B",
      eventKey: "stock_low",
      entityId,
    });
    const second = await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "STOCK_LOW",
      title: "A",
      message: "B",
      eventKey: "stock_low",
      entityId,
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.id).toBe(first.id);
  });
});

run("Notifications — isolation multi-tenant", () => {
  it("Org B ne voit pas les notifications Org A", async () => {
    const orgA = await getSeedOrgId();
    const orgB = await ensureSecondOrg();
    const userA = await getOwnerUserId(orgA);

    const { rows: usersB } = await testPool.query<{ id: string }>(
      `SELECT id FROM "User" WHERE "organizationId" = $1 LIMIT 1`,
      [orgB],
    );
    if (!usersB[0]) {
      await testPool.query(
        `INSERT INTO "User" (id, "organizationId", email, "firstName", "lastName", role, "updatedAt")
         VALUES ($1,$2,'test-b@example.com','Test','B','OWNER',NOW())
         ON CONFLICT DO NOTHING`,
        [testId("u_b"), orgB],
      );
    }
    const userB =
      usersB[0]?.id ??
      (
        await testPool.query<{ id: string }>(
          `SELECT id FROM "User" WHERE "organizationId" = $1 LIMIT 1`,
          [orgB],
        )
      ).rows[0]!.id;

    const entityId = testId("ntf_iso");
    await createNotificationForUser({
      organizationId: orgA,
      userId: userA,
      type: "SYSTEM",
      title: "Secret A",
      message: "Org A only",
      eventKey: "system",
      entityId,
    });

    const listB = await listNotifications(orgB, userB, { category: "all" });
    expect(listB.data.some((n) => n.message === "Org A only")).toBe(false);

    const listA = await listNotifications(orgA, userA, { category: "all" });
    expect(listA.data.some((n) => n.message === "Org A only")).toBe(true);
  });
});

run("Notifications — isolation utilisateur", () => {
  it("un utilisateur ne voit que ses notifications", async () => {
    const orgId = await getSeedOrgId();
    const ownerId = await getOwnerUserId(orgId);
    const managerId = await getManagerUserId(orgId);
    const entityId = testId("ntf_user");

    await createNotificationForUser({
      organizationId: orgId,
      userId: ownerId,
      type: "PAYMENT_RECEIVED",
      title: "Paiement owner",
      message: "450 MAD",
      eventKey: "payment_received",
      entityId,
    });

    const managerList = await listNotifications(orgId, managerId, { category: "all" });
    expect(managerList.data.some((n) => n.message === "450 MAD")).toBe(false);

    const ownerList = await listNotifications(orgId, ownerId, { category: "finance" });
    expect(ownerList.data.some((n) => n.message === "450 MAD")).toBe(true);
  });
});

run("Notifications — mark read / read all", () => {
  it("marque une notification comme lue", async () => {
    const orgId = await getSeedOrgId();
    const userId = await getOwnerUserId(orgId);
    const entityId = testId("ntf_read");

    const { id } = await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "APPOINTMENT_CREATED",
      title: "RDV",
      message: "Test",
      eventKey: "appointment_created",
      entityId,
    });

    expect(await markNotificationRead(orgId, userId, id!)).toBe(true);
    const item = await getNotificationForUser(orgId, userId, id!);
    expect(item?.readAt).toBeTruthy();
  });

  it("marque toutes les notifications comme lues", async () => {
    const orgId = await getSeedOrgId();
    const userId = await getOwnerUserId(orgId);

    await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "SYSTEM",
      title: "1",
      message: "m1",
      eventKey: "system",
      entityId: testId("ntf_ra1"),
    });
    await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "SYSTEM",
      title: "2",
      message: "m2",
      eventKey: "system",
      entityId: testId("ntf_ra2"),
    });

    const count = await markAllNotificationsRead(orgId, userId);
    expect(count).toBeGreaterThanOrEqual(2);

    const unread = await listNotifications(orgId, userId, { category: "unread" });
    expect(unread.data.length).toBe(0);
  });
});

run("Notifications — RBAC destinataires", () => {
  it("STOCK_LOW → OWNER + MANAGER", () => {
    expect(rolesForNotificationType("STOCK_LOW")).toEqual(["OWNER", "MANAGER"]);
  });

  it("PAYMENT_RECEIVED → OWNER + ACCOUNTANT + CASHIER", () => {
    expect(rolesForNotificationType("PAYMENT_RECEIVED")).toEqual([
      "OWNER",
      "ACCOUNTANT",
      "CASHIER",
    ]);
  });

  it("emitNotification cible les bons rôles", async () => {
    const orgId = await getSeedOrgId();
    const entityId = testId("ntf_emit");
    const created = await emitNotification({
      organizationId: orgId,
      type: "STOCK_OUT",
      eventKey: "stock_out",
      title: "Rupture",
      message: "Produit X",
      entityType: "Product",
      entityId,
    });
    expect(created).toBeGreaterThanOrEqual(2);

    const ownerId = await getOwnerUserId(orgId);
    const ownerItem = await listNotifications(orgId, ownerId, { category: "stock" });
    expect(ownerItem.data.some((n) => n.entityId === entityId)).toBe(true);
  });
});

run("Notifications — entity link", () => {
  it("construit les liens de navigation", () => {
    expect(buildNotificationHref("Product", "p1")).toBe("/products/p1/");
    expect(buildNotificationHref("Appointment", "a1")).toBe("/agenda/?appointmentId=a1");
    expect(buildNotificationHref("Payment", "pay1")).toBe("/payments/?paymentId=pay1");
  });
});

run("Notifications — filtres et pagination", () => {
  it("filtre finance vs stock", async () => {
    const orgId = await getSeedOrgId();
    const userId = await getOwnerUserId(orgId);
    const payEntity = testId("ntf_f");
    const stockEntity = testId("ntf_s");

    await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "PAYMENT_RECEIVED",
      title: "Pay",
      message: "finance-filter",
      eventKey: "payment_received",
      entityId: payEntity,
    });
    await createNotificationForUser({
      organizationId: orgId,
      userId,
      type: "STOCK_LOW",
      title: "Stock",
      message: "stock-filter",
      eventKey: "stock_low",
      entityId: stockEntity,
    });

    const finance = await listNotifications(orgId, userId, { category: "finance" });
    expect(finance.data.some((n) => n.message === "finance-filter")).toBe(true);
    expect(finance.data.some((n) => n.message === "stock-filter")).toBe(false);

    expect(typesForCategory("stock")).toContain("STOCK_LOW");
  });

  it("pagination limite les résultats", async () => {
    const orgId = await getSeedOrgId();
    const userId = await getOwnerUserId(orgId);

    for (let i = 0; i < 3; i++) {
      await createNotificationForUser({
        organizationId: orgId,
        userId,
        type: "SYSTEM",
        title: `P${i}`,
        message: `page-${i}`,
        eventKey: "system",
        entityId: testId(`ntf_page_${i}`),
      });
    }

    const page1 = await listNotifications(orgId, userId, { page: 1, limit: 2 });
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(page1.pagination.limit).toBe(2);
    expect(page1.pagination.total).toBeGreaterThanOrEqual(3);
  });
});

run("Notifications — accès refusé cross-user", () => {
  it("mark read échoue pour une notification d'un autre user", async () => {
    const orgId = await getSeedOrgId();
    const ownerId = await getOwnerUserId(orgId);
    const managerId = await getManagerUserId(orgId);
    const entityId = testId("ntf_denied");

    const { id } = await createNotificationForUser({
      organizationId: orgId,
      userId: ownerId,
      type: "SYSTEM",
      title: "Privé",
      message: "owner only",
      eventKey: "system",
      entityId,
    });

    const ok = await markNotificationRead(orgId, managerId, id!);
    expect(ok).toBe(false);

    const cross = await getNotificationForUser(orgId, managerId, id!);
    expect(cross).toBeNull();
  });
});
