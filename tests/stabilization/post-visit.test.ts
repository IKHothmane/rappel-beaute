import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildPublicBookingUrl, slugifyLabel } from "@/lib/booking-qr";
import {
  evaluatePostVisitEligibility,
  getOrCreatePostVisitSettings,
  postVisitIdempotencyKey,
  resolveReturnDays,
  syncPostVisitTasks,
  updatePostVisitSettings,
} from "@/lib/db/post-visit";
import { ensureDefaultTemplates, renderTemplateBody } from "@/lib/db/whatsapp";
import { canReadFeature, getFeatureAccess } from "@/lib/rbac";
import {
  cleanupTestPrefix,
  countRows,
  ensureSecondOrg,
  getSeedOrgId,
  insertTestAppointment,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const PREFIX = "test_pv";

describe("41.20 — délais & éligibilité (unit)", () => {
  it("délai service prioritaire", () => {
    expect(resolveReturnDays(30, 45)).toBe(30);
  });

  it("délai organisation si service absent", () => {
    expect(resolveReturnDays(null, 45)).toBe(45);
    expect(resolveReturnDays(0, 45)).toBe(45);
  });

  it("délai par défaut institut sinon null si org=0", () => {
    expect(resolveReturnDays(null, 30)).toBe(30);
    expect(resolveReturnDays(null, 0)).toBeNull();
  });

  it("clé idempotence postvisit:{appointmentId}", () => {
    expect(postVisitIdempotencyKey("apt_1")).toBe("postvisit:apt_1");
  });

  it("COMPLETED → éligible (conditions OK)", async () => {
    const r = await evaluatePostVisitEligibility({
      organizationId: "org",
      appointmentStatus: "COMPLETED",
      phone: "0612345678",
      marketingWhatsapp: true,
      returnDays: 30,
      settings: {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 14,
        minimumDaysBetweenMarketingMessages: 30,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      hasFutureAppointment: false,
      lastMarketingSentAt: null,
      alreadyHasTask: false,
    });
    expect(r.ok).toBe(true);
  });

  it("CANCELLED → aucune", async () => {
    const r = await evaluatePostVisitEligibility({
      organizationId: "org",
      appointmentStatus: "CANCELLED",
      phone: "0612345678",
      marketingWhatsapp: true,
      returnDays: 30,
      settings: {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 14,
        minimumDaysBetweenMarketingMessages: 30,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      hasFutureAppointment: false,
      lastMarketingSentAt: null,
      alreadyHasTask: false,
    });
    expect(r.ok).toBe(false);
  });

  it("NO_SHOW → aucune", async () => {
    const r = await evaluatePostVisitEligibility({
      organizationId: "org",
      appointmentStatus: "NO_SHOW",
      phone: "0612345678",
      marketingWhatsapp: true,
      returnDays: 30,
      settings: {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 14,
        minimumDaysBetweenMarketingMessages: 30,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      hasFutureAppointment: false,
      lastMarketingSentAt: null,
      alreadyHasTask: false,
    });
    expect(r.ok).toBe(false);
  });

  it("opt-in obligatoire", async () => {
    const r = await evaluatePostVisitEligibility({
      organizationId: "org",
      appointmentStatus: "COMPLETED",
      phone: "0612345678",
      marketingWhatsapp: false,
      returnDays: 30,
      settings: {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 14,
        minimumDaysBetweenMarketingMessages: 30,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      hasFutureAppointment: false,
      lastMarketingSentAt: null,
      alreadyHasTask: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/opt-in/i);
  });

  it("anti-spam", async () => {
    const r = await evaluatePostVisitEligibility({
      organizationId: "org",
      appointmentStatus: "COMPLETED",
      phone: "0612345678",
      marketingWhatsapp: true,
      returnDays: 30,
      settings: {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 14,
        minimumDaysBetweenMarketingMessages: 30,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      hasFutureAppointment: false,
      lastMarketingSentAt: new Date(),
      alreadyHasTask: false,
    });
    expect(r.ok).toBe(false);
  });

  it("RDV futur bloque", async () => {
    const r = await evaluatePostVisitEligibility({
      organizationId: "org",
      appointmentStatus: "COMPLETED",
      phone: "0612345678",
      marketingWhatsapp: true,
      returnDays: 30,
      settings: {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 14,
        minimumDaysBetweenMarketingMessages: 30,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      hasFutureAppointment: true,
      lastMarketingSentAt: null,
      alreadyHasTask: false,
    });
    expect(r.ok).toBe(false);
  });

  it("téléphone absent", async () => {
    const r = await evaluatePostVisitEligibility({
      organizationId: "org",
      appointmentStatus: "COMPLETED",
      phone: "",
      marketingWhatsapp: true,
      returnDays: 30,
      settings: {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 14,
        minimumDaysBetweenMarketingMessages: 30,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      hasFutureAppointment: false,
      lastMarketingSentAt: null,
      alreadyHasTask: false,
    });
    expect(r.ok).toBe(false);
  });

  it("message template + booking URL post_visit", () => {
    const url = buildPublicBookingUrl({
      slug: "institut-royal",
      service: slugifyLabel("Hydrafacial"),
      source: "post_visit",
    });
    expect(url).toContain("source=post_visit");
    expect(url).toContain("service=hydrafacial");

    const msg = renderTemplateBody(
      "Bonjour {{customer.firstName}} — {{lastService.name}} — {{recommendedDate}} — {{bookingUrl}}",
      {
        customer: { firstName: "Sara", lastName: "B" },
        lastService: { name: "Hydrafacial" },
        recommendedDate: "1 octobre 2026",
        organization: { name: "IR", phone: "", address: "" },
        bookingUrl: url,
      },
    );
    expect(msg).toContain("Sara");
    expect(msg).toContain("Hydrafacial");
    expect(msg).toContain("post_visit");
  });

  it("RBAC marketing — STAFF limited, CASHIER none", () => {
    expect(canReadFeature("OWNER", "marketing")).toBe(true);
    expect(getFeatureAccess("STAFF", "marketing")).toBe("limited");
    expect(getFeatureAccess("CASHIER", "marketing")).toBe("none");
  });
});

run("41.20 — sync PostgreSQL", () => {
  let orgId: string;
  let aptId: string;
  let customerId: string;

  beforeAll(async () => {
    orgId = await getSeedOrgId();
    await cleanupTestPrefix(PREFIX);
    customerId = testId(`${PREFIX}_c`);
    await testPool.query(
      `INSERT INTO "Customer" (
        id, "organizationId", "firstName", "lastName", phone, status,
        "marketingWhatsapp", "updatedAt"
      ) VALUES ($1,$2,'Post','Visit','0661009988','ACTIVE',true,NOW())`,
      [customerId, orgId],
    );

    await updatePostVisitSettings(
      orgId,
      {
        enabled: true,
        defaultReturnDays: 30,
        maxOverdueDays: 60,
        minimumDaysBetweenMarketingMessages: 1,
        respectFutureAppointments: true,
        respectOptIn: true,
        autoCreateWhatsAppTasks: true,
      },
      { id: "u_owner", name: "Test" },
    );

    await testPool.query(
      `UPDATE "Service" SET "recommendedReturnDays" = 30 WHERE id = 's1'`,
    );

    const endAt = new Date(Date.now() - 31 * 86_400_000);
    const startAt = new Date(endAt.getTime() - 60 * 60_000);
    aptId = await insertTestAppointment({
      organizationId: orgId,
      customerId,
      serviceId: "s1",
      staffId: "e1",
      status: "COMPLETED",
      startAt,
      endAt,
      price: 450,
    });

    await ensureDefaultTemplates(orgId);
  });

  afterAll(async () => {
    await testPool.query(`DELETE FROM "WhatsAppTask" WHERE "appointmentId" = $1`, [aptId]);
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [aptId]);
    await testPool.query(`DELETE FROM "Customer" WHERE id = $1`, [customerId]);
    await cleanupTestPrefix(PREFIX);
  });

  it("COMPLETED → crée WhatsAppTask POST_VISIT", async () => {
    const r = await syncPostVisitTasks(orgId);
    expect(r.created).toBeGreaterThanOrEqual(1);
    const n = await countRows(
      "WhatsAppTask",
      `"organizationId" = $1 AND "appointmentId" = $2 AND type = 'POST_VISIT'`,
      [orgId, aptId],
    );
    expect(n).toBe(1);
  });

  it("deux synchronisations → une seule tâche", async () => {
    await syncPostVisitTasks(orgId);
    await syncPostVisitTasks(orgId);
    const n = await countRows(
      "WhatsAppTask",
      `"organizationId" = $1 AND "idempotencyKey" = $2`,
      [orgId, postVisitIdempotencyKey(aptId)],
    );
    expect(n).toBe(1);
  });

  it("tâche : type, message, booking URL", async () => {
    const { rows } = await testPool.query<{
      type: string;
      status: string;
      messageSnapshot: string;
      phoneSnapshot: string;
    }>(
      `SELECT type::text, status::text, "messageSnapshot", "phoneSnapshot"
       FROM "WhatsAppTask"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [orgId, postVisitIdempotencyKey(aptId)],
    );
    expect(rows[0].type).toBe("POST_VISIT");
    expect(rows[0].status).toBe("PENDING");
    expect(rows[0].phoneSnapshot).toContain("0661");
    expect(rows[0].messageSnapshot).toMatch(/Hydrafacial|rendez-vous|booking|post_visit/i);
    expect(rows[0].messageSnapshot).toContain("source=post_visit");
  });

  it("CANCELLED n'est pas éligible (pas de nouvelle tâche)", async () => {
    const endAt = new Date(Date.now() - 31 * 86_400_000);
    const badId = await insertTestAppointment({
      organizationId: orgId,
      customerId,
      status: "CANCELLED",
      startAt: new Date(endAt.getTime() - 3600_000),
      endAt,
    });
    await syncPostVisitTasks(orgId);
    const n = await countRows(
      "WhatsAppTask",
      `"idempotencyKey" = $1`,
      [postVisitIdempotencyKey(badId)],
    );
    expect(n).toBe(0);
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [badId]);
  });

  it("NO_SHOW → aucune tâche", async () => {
    const endAt = new Date(Date.now() - 31 * 86_400_000);
    const badId = await insertTestAppointment({
      organizationId: orgId,
      customerId,
      status: "NO_SHOW",
      startAt: new Date(endAt.getTime() - 3600_000),
      endAt,
    });
    await syncPostVisitTasks(orgId);
    const n = await countRows(
      "WhatsAppTask",
      `"idempotencyKey" = $1`,
      [postVisitIdempotencyKey(badId)],
    );
    expect(n).toBe(0);
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [badId]);
  });

  it("opt-out → annule PENDING", async () => {
    await testPool.query(
      `UPDATE "Customer" SET "marketingWhatsapp" = false WHERE id = $1`,
      [customerId],
    );
    await syncPostVisitTasks(orgId);
    const { rows } = await testPool.query<{ status: string }>(
      `SELECT status::text FROM "WhatsAppTask"
       WHERE "idempotencyKey" = $1`,
      [postVisitIdempotencyKey(aptId)],
    );
    expect(rows[0].status).toBe("CANCELLED");
    await testPool.query(
      `UPDATE "Customer" SET "marketingWhatsapp" = true WHERE id = $1`,
      [customerId],
    );
    await testPool.query(
      `UPDATE "WhatsAppTask" SET status = 'PENDING'::"WhatsAppTaskStatus"
       WHERE "idempotencyKey" = $1`,
      [postVisitIdempotencyKey(aptId)],
    );
  });

  it("RDV futur → annule PENDING", async () => {
    const futureId = await insertTestAppointment({
      organizationId: orgId,
      customerId,
      status: "CONFIRMED",
      startAt: new Date(Date.now() + 5 * 86_400_000),
    });
    await syncPostVisitTasks(orgId);
    const { rows } = await testPool.query<{ status: string }>(
      `SELECT status::text FROM "WhatsAppTask"
       WHERE "idempotencyKey" = $1`,
      [postVisitIdempotencyKey(aptId)],
    );
    expect(rows[0].status).toBe("CANCELLED");
    await testPool.query(`DELETE FROM "Appointment" WHERE id = $1`, [futureId]);
  });

  it("isolation tenant A ≠ B", async () => {
    const orgB = await ensureSecondOrg();
    await getOrCreatePostVisitSettings(orgB);
    const n = await countRows(
      "WhatsAppTask",
      `"organizationId" = $1 AND "idempotencyKey" = $2`,
      [orgB, postVisitIdempotencyKey(aptId)],
    );
    expect(n).toBe(0);
  });

  it("settings org isolées", async () => {
    const orgB = await ensureSecondOrg();
    const sA = await getOrCreatePostVisitSettings(orgId);
    const sB = await updatePostVisitSettings(
      orgB,
      { defaultReturnDays: 14 },
      { id: "u_owner" },
    );
    expect(sA.defaultReturnDays).not.toBe(sB.defaultReturnDays);
  });
});
