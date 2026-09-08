import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  buildPublicBookingUrl,
  parseBookingQrQuery,
  slugifyLabel,
} from "@/lib/booking-qr";
import {
  createPublicBooking,
  getPublicServices,
  resolveOrganizationBySlug,
  resolvePublicServiceRef,
  resolvePublicStaffRef,
} from "@/lib/db/public-booking";
import {
  getQrBookingStats,
  recordPublicBookingEvent,
} from "@/lib/db/public-booking-events";
import {
  cleanupAppointmentsOnDate,
  ensureSecondOrg,
  getSeedOrgId,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

const SLUG = "institut-royal";
const BOOK_DATE = "2026-10-21";
const BOOK_TIME = "11:00";

describe("41.19 — QR URLs (unit)", () => {
  it("QR global avec source=qr", () => {
    const url = buildPublicBookingUrl({ slug: SLUG, source: "qr" });
    expect(url).toContain(`/book/${SLUG}/`);
    expect(url).toContain("source=qr");
    expect(url).not.toMatch(/price|duration|prix/i);
  });

  it("QR service", () => {
    const url = buildPublicBookingUrl({
      slug: SLUG,
      service: "hydrafacial",
      source: "qr",
    });
    expect(url).toContain("service=hydrafacial");
    expect(url).toContain("source=qr");
  });

  it("QR staff", () => {
    const url = buildPublicBookingUrl({
      slug: SLUG,
      staff: "sara",
      source: "qr",
    });
    expect(url).toContain("staff=sara");
  });

  it("parseBookingQrQuery", () => {
    const q = parseBookingQrQuery(
      new URLSearchParams("source=qr&service=hydrafacial&staff=sara"),
    );
    expect(q).toEqual({
      source: "qr",
      service: "hydrafacial",
      staff: "sara",
    });
  });

  it("slugifyLabel normalise accents", () => {
    expect(slugifyLabel("HydraFacial")).toBe("hydrafacial");
    expect(slugifyLabel("Soin visage")).toBe("soin-visage");
  });
});

run("41.19 — QR résolution & sécurité", () => {
  beforeAll(async () => {
    const orgId = await getSeedOrgId();
    await cleanupAppointmentsOnDate(orgId, BOOK_DATE);
  });

  afterAll(async () => {
    const orgId = await getSeedOrgId();
    await cleanupAppointmentsOnDate(orgId, BOOK_DATE);
  });

  it("slug valide", async () => {
    const org = await resolveOrganizationBySlug(SLUG);
    expect(org?.slug).toBe(SLUG);
  });

  it("slug invalide → null", async () => {
    expect(await resolveOrganizationBySlug("slug-qui-nexiste-pas")).toBeNull();
  });

  it("organisation suspendue → null", async () => {
    const orgId = await getSeedOrgId();
    await testPool.query(
      `UPDATE "Organization" SET status = 'SUSPENDED' WHERE id = $1`,
      [orgId],
    );
    try {
      expect(await resolveOrganizationBySlug(SLUG)).toBeNull();
    } finally {
      await testPool.query(
        `UPDATE "Organization" SET status = 'ACTIVE' WHERE id = $1`,
        [orgId],
      );
    }
  });

  it("service valide par slug marketing (prix serveur)", async () => {
    const orgId = await getSeedOrgId();
    const services = await getPublicServices(orgId);
    const hydra = services.find((s) => s.id === "s1") ?? services[0];
    expect(hydra).toBeTruthy();
    const ref = await resolvePublicServiceRef(orgId, slugifyLabel(hydra!.name));
    expect(ref?.id).toBe(hydra!.id);
    expect(ref?.price).toBe(hydra!.price);
    expect(ref?.durationMin).toBe(hydra!.durationMin);
  });

  it("service invalide / inactif → null", async () => {
    const orgId = await getSeedOrgId();
    expect(await resolvePublicServiceRef(orgId, "service-fantome-xyz")).toBeNull();
  });

  it("staff valide par prénom", async () => {
    const orgId = await getSeedOrgId();
    const staff = await resolvePublicStaffRef(orgId, "sara", "s1");
    expect(staff).toBeTruthy();
    expect(staff!.id).toBeTruthy();
  });

  it("staff invalide → null", async () => {
    const orgId = await getSeedOrgId();
    expect(await resolvePublicStaffRef(orgId, "personne-inexistante", "s1")).toBeNull();
  });

  it("staff incompatible avec le service → null", async () => {
    const orgId = await getSeedOrgId();
    const hit = await resolvePublicStaffRef(orgId, "e5", "s1");
    expect(hit).toBeNull();
  });

  it("isolation tenant — service org B inaccessible via org A", async () => {
    const orgA = await getSeedOrgId();
    const orgB = await ensureSecondOrg();
    const svcB = testId("svc_b");
    await testPool.query(
      `INSERT INTO "Service" (
        id, "organizationId", name, price, "durationMin", "prepTimeMin", "cleanupTimeMin",
        active, "updatedAt"
      ) VALUES ($1, $2, 'Secret B', 999, 30, 0, 0, true, NOW())
      ON CONFLICT (id) DO NOTHING`,
      [svcB, orgB],
    );
    try {
      expect(await resolvePublicServiceRef(orgA, svcB)).toBeNull();
      expect(await resolvePublicServiceRef(orgA, "secret-b")).toBeNull();
    } finally {
      await testPool.query(`DELETE FROM "Service" WHERE id = $1`, [svcB]);
    }
  });

  it("booking depuis QR — attributionSource=qr + prix/durée serveur", async () => {
    const orgId = await getSeedOrgId();
    const services = await getPublicServices(orgId);
    const hydra = services.find((s) => s.id === "s1");
    expect(hydra).toBeTruthy();

    const result = await createPublicBooking(SLUG, {
      serviceId: hydra!.id,
      staffId: "e1",
      date: BOOK_DATE,
      time: BOOK_TIME,
      customer: {
        firstName: "Qr",
        lastName: "Scan",
        phone: testId("qr_phone"),
        email: null,
        marketingOptIn: false,
      },
      attributionSource: "qr",
    });

    expect(result.price).toBe(hydra!.price);
    expect(result.appointmentId).toBeTruthy();

    const { rows } = await testPool.query<{
      price: string;
      attributionSource: string | null;
      startAt: Date;
      endAt: Date;
    }>(
      `SELECT price::text, "attributionSource", "startAt", "endAt"
       FROM "Appointment" WHERE id = $1`,
      [result.appointmentId],
    );
    expect(Number(rows[0].price)).toBe(hydra!.price);
    expect(rows[0].attributionSource).toBe("qr");
    const durationMin =
      (rows[0].endAt.getTime() - rows[0].startAt.getTime()) / 60_000;
    expect(durationMin).toBe(hydra!.totalBlockMin);
  });

  it("tracking source=qr — VIEW + BOOKED + stats isolées", async () => {
    const orgA = await getSeedOrgId();
    const orgB = await ensureSecondOrg();

    await recordPublicBookingEvent({
      organizationId: orgA,
      eventType: "VIEW",
      source: "qr",
    });
    await recordPublicBookingEvent({
      organizationId: orgA,
      eventType: "BOOKED",
      source: "qr",
    });
    await recordPublicBookingEvent({
      organizationId: orgB,
      eventType: "VIEW",
      source: "qr",
    });

    const statsA = await getQrBookingStats(orgA);
    const statsB = await getQrBookingStats(orgB);
    expect(statsA.views).toBeGreaterThanOrEqual(1);
    expect(statsA.bookings).toBeGreaterThanOrEqual(1);
    expect(statsB.views).toBeGreaterThanOrEqual(1);
  });
});
