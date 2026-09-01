import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import {
  createPublicBooking,
  getPublicAvailabilitySlots,
  getPublicServices,
  getPublicStaffForService,
  resolveOrganizationBySlug,
} from "@/lib/db/public-booking";
import { findCustomerByPhone } from "@/lib/db/customers";
import {
  PUBLIC_RATE_LIMITS,
  checkRateLimit,
  publicRateLimitKey,
  resetRateLimitsForTests,
} from "@/lib/public-booking/rate-limit";
import { parsePublicBookingBody } from "@/lib/public-booking/validation";
import {
  cleanupAppointmentsOnDate,
  ensureSecondOrg,
  getSeedOrgId,
  testId,
  testPool,
} from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

const SLUG = "institut-royal";
/** Mercredi — hors congé seed e2 sept 2026 */
const BOOK_DATE = "2026-10-14";
/** Jeudi — date auxiliaire pour tests sans collision */
const BOOK_DATE_ALT = "2026-10-15";
const BOOK_TIME = "10:00";

beforeAll(async () => {
  const orgId = await getSeedOrgId();
  for (const date of [BOOK_DATE, BOOK_DATE_ALT]) {
    await cleanupAppointmentsOnDate(orgId, date);
  }
});

function bookingInput(overrides?: Partial<{ phone: string; staffId: string | null; time: string }>) {
  return {
    serviceId: "s1",
    staffId: overrides?.staffId ?? "e1",
    date: BOOK_DATE,
    time: overrides?.time ?? BOOK_TIME,
    customer: {
      firstName: "Test",
      lastName: "Booking",
      phone: overrides?.phone ?? testId("pb_phone"),
      email: null as string | null,
      marketingOptIn: false,
    },
    notes: null as string | null,
  };
}

run("Public booking — organisation", () => {
  it("slug valide retourne le profil public", async () => {
    const org = await resolveOrganizationBySlug(SLUG);
    expect(org?.name).toBe("Institut Royal");
    expect(org?.slug).toBe(SLUG);
  });

  it("slug inexistant → null", async () => {
    expect(await resolveOrganizationBySlug("institut-inexistant-xyz")).toBeNull();
  });
});

run("Public booking — services", () => {
  it("retourne uniquement les services actifs avec prix serveur", async () => {
    const orgId = await getSeedOrgId();
    const services = await getPublicServices(orgId);
    expect(services.length).toBeGreaterThan(0);
    expect(services.every((s) => s.price > 0)).toBe(true);
    const hydra = services.find((s) => s.id === "s1");
    expect(hydra?.price).toBe(450);
    expect(hydra?.durationMin).toBe(60);
  });
});

run("Public booking — disponibilité", () => {
  it("retourne des créneaux pour un service/staff/date valides", async () => {
    const orgId = await getSeedOrgId();
    const slots = await getPublicAvailabilitySlots(orgId, {
      serviceId: "s1",
      date: BOOK_DATE,
      staffId: "e1",
    });
    expect(slots.some((s) => s.available && s.time === "10:00")).toBe(true);
  });

  it("staff incompatible (non lié au service) → aucun créneau assigné", async () => {
    const orgId = await getSeedOrgId();
    const slots = await getPublicAvailabilitySlots(orgId, {
      serviceId: "s1",
      date: BOOK_DATE,
      staffId: "e5",
    });
    expect(slots.filter((s) => s.available).length).toBe(0);
  });

  it("congé staff → pas de créneaux", async () => {
    const orgId = await getSeedOrgId();
    const slots = await getPublicAvailabilitySlots(orgId, {
      serviceId: "s1",
      date: "2026-09-03",
      staffId: "e2",
    });
    expect(slots.filter((s) => s.available).length).toBe(0);
  });

  it("pause déjeuner → créneau indisponible", async () => {
    const orgId = await getSeedOrgId();
    const slots = await getPublicAvailabilitySlots(orgId, {
      serviceId: "s1",
      date: BOOK_DATE_ALT,
      staffId: "e1",
    });
    const lunch = slots.find((s) => s.time === "13:00");
    expect(lunch?.available).toBe(false);
  });

  it("staff ON_LEAVE absent de la liste publique", async () => {
    const orgId = await getSeedOrgId();
    const staff = await getPublicStaffForService(orgId, "s4", BOOK_DATE);
    expect(staff.some((s) => s.id === "e3")).toBe(false);
  });
});

run("Public booking — réservation", () => {
  it("crée un RDV ONLINE_BOOKING avec prix serveur", async () => {
    const phone = testId("pb");
    const result = await createPublicBooking(
      SLUG,
      bookingInput({ phone, time: "10:00", staffId: "e1" }),
    );

    expect(result.source).toBe("ONLINE_BOOKING");
    expect(result.price).toBe(450);
    expect(result.durationMin).toBe(60);

    const { rows } = await testPool.query<{ source: string; price: string }>(
      `SELECT source::text, price::text FROM "Appointment" WHERE id = $1`,
      [result.appointmentId],
    );
    expect(rows[0]?.source).toBe("ONLINE_BOOKING");
    expect(parseFloat(rows[0]?.price ?? "0")).toBe(450);
  });

  it("réutilise une cliente existante (organizationId + phone)", async () => {
    const phone = testId("pb_exist");
    const first = await createPublicBooking(
      SLUG,
      bookingInput({ phone, time: "11:00", staffId: "e4" }),
    );
    const second = await createPublicBooking(
      SLUG,
      bookingInput({ phone, time: "14:30", staffId: "e4" }),
    );

    expect(first.customerCreated).toBe(true);
    expect(second.customerCreated).toBe(false);
    expect(first.customerId).toBe(second.customerId);
  });

  it("opt-in marketing enregistré séparément", async () => {
    const phone = testId("pb_optin");
    await createPublicBooking(SLUG, {
      ...bookingInput({ phone, time: "15:00", staffId: "e1" }),
      customer: {
        firstName: "Opt",
        lastName: "In",
        phone,
        marketingOptIn: true,
      },
    });

    const orgId = await getSeedOrgId();
    const c = await findCustomerByPhone(orgId, phone);
    expect(c?.marketingWhatsapp).toBe(true);
  });

  it("double réservation concurrente → conflit", async () => {
    const phone1 = testId("pb_c1");
    const phone2 = testId("pb_c2");
    const time = "16:00";

    const results = await Promise.allSettled([
      createPublicBooking(SLUG, bookingInput({ phone: phone1, time, staffId: "e4" })),
      createPublicBooking(SLUG, bookingInput({ phone: phone2, time, staffId: "e4" })),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const msg = rejected[0]?.reason instanceof Error ? rejected[0].reason.message : "";
    expect(["SLOT_CONFLICT", "SLOT_UNAVAILABLE"]).toContain(msg);
  });

  it("isolation multi-tenant — même téléphone, org différente", async () => {
    const orgB = await ensureSecondOrg();
    const phone = testId("pb_isolate");

    await createPublicBooking(SLUG, bookingInput({ phone, time: "09:00", staffId: "e4" }));

    const inB = await findCustomerByPhone(orgB, phone);
    expect(inB).toBeNull();

    const orgA = await getSeedOrgId();
    expect(await findCustomerByPhone(orgA, phone)).not.toBeNull();
  });

  it("créneau déjà pris → SLOT_UNAVAILABLE", async () => {
    const phone1 = testId("pb_taken1");
    const phone2 = testId("pb_taken2");
    await createPublicBooking(
      SLUG,
      { ...bookingInput({ phone: phone1, time: "10:00", staffId: "e4" }), date: BOOK_DATE_ALT },
    );
    await expect(
      createPublicBooking(
        SLUG,
        { ...bookingInput({ phone: phone2, time: "10:00", staffId: "e4" }), date: BOOK_DATE_ALT },
      ),
    ).rejects.toThrow("SLOT_UNAVAILABLE");
  });

  it("staff « peu importe » assigne une praticienne compatible", async () => {
    const phone = testId("pb_any");
    const result = await createPublicBooking(SLUG, {
      ...bookingInput({ phone, time: "14:30", staffId: "any" }),
      staffId: null,
      date: BOOK_DATE_ALT,
    });
    expect(["e1", "e2", "e4"]).toContain(result.staffId);
  });
});

run("Public booking — validation & sécurité", () => {
  it("rejette organizationId et price du client", () => {
    const parsed = parsePublicBookingBody({
      serviceId: "s1",
      date: BOOK_DATE,
      time: "10:00",
      organizationId: "hack",
      price: 1,
      customer: { firstName: "A", lastName: "B", phone: "0612345678" },
    });
    expect(parsed.ok).toBe(false);
  });

  it("accepte une payload valide", () => {
    const parsed = parsePublicBookingBody({
      serviceId: "s1",
      date: BOOK_DATE,
      time: "10:00",
      customer: { firstName: "Sara", lastName: "Test", phone: "0612345678" },
    });
    expect(parsed.ok).toBe(true);
  });
});

run("Public booking — rate limiting", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("bloque après la limite bookings", async () => {
    const key = publicRateLimitKey("127.0.0.1", SLUG, "bookings");
    for (let i = 0; i < PUBLIC_RATE_LIMITS.bookings.limit; i++) {
      expect((await checkRateLimit({ key, ...PUBLIC_RATE_LIMITS.bookings })).allowed).toBe(true);
    }
    const blocked = await checkRateLimit({ key, ...PUBLIC_RATE_LIMITS.bookings });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
