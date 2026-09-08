import { describe, expect, it } from "vitest";
import {
  checkAvailability,
  getAvailableSlots,
  isStaffAvailableOnDate,
} from "@/modules/appointments/availability";
import { isCoveredByOvertime, hasActiveReplacement } from "@/lib/db/planning";
import type { StaffAgendaContext } from "@/types/staff";
import type { Appointment } from "@/types/appointment";
import { canAccessNav, canWriteFeature } from "@/lib/rbac";
import { isPlanFeatureEnabled } from "@/lib/subscriptions/nav-features";

function staffBase(over: Partial<StaffAgendaContext> = {}): StaffAgendaContext {
  return {
    id: "st1",
    displayName: "Sara",
    firstName: "Sara",
    lastName: "A",
    status: "ACTIVE",
    schedules: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", active: true }, // Monday
    ],
    breaks: [{ dayOfWeek: 1, startTime: "13:00", endTime: "14:00" }],
    leaves: [],
    overtimes: [],
    replacementsAsAbsent: [],
    ...over,
  };
}

function mondayAt(h: number, m = 0) {
  // 2026-09-07 is a Monday
  const d = new Date(2026, 8, 7, h, m, 0, 0);
  return d;
}

describe("41.24 — Planning avancé (unit)", () => {
  it("RBAC agenda / planning", () => {
    expect(canWriteFeature("OWNER", "agenda")).toBe(true);
    expect(canAccessNav("MANAGER", "planning")).toBe(true);
    expect(isPlanFeatureEnabled({ agenda: true }, "planning")).toBe(true);
    expect(isPlanFeatureEnabled({ agenda: false }, "planning")).toBe(false);
  });

  it("hors horaires → conflit", () => {
    const staff = staffBase();
    const start = mondayAt(19, 0);
    const end = mondayAt(20, 0);
    const r = checkAvailability(
      [],
      {
        staffId: "st1",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(false);
    expect(r.conflicts.some((c) => /Hors horaires|ne travaille/.test(c))).toBe(true);
  });

  it("heures supplémentaires couvrent hors horaires", () => {
    const start = mondayAt(19, 0);
    const end = mondayAt(20, 0);
    const staff = staffBase({
      overtimes: [
        {
          id: "ot1",
          startAt: mondayAt(18, 0).toISOString(),
          endAt: mondayAt(21, 0).toISOString(),
          reason: "OT",
        },
      ],
    });
    expect(isCoveredByOvertime(start, end, staff.overtimes)).toBe(true);
    const r = checkAvailability(
      [],
      {
        staffId: "st1",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(true);
  });

  it("pause → conflit", () => {
    const staff = staffBase();
    const r = checkAvailability(
      [],
      {
        staffId: "st1",
        startAt: mondayAt(13, 15).toISOString(),
        endAt: mondayAt(13, 45).toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(false);
    expect(r.conflicts.some((c) => /Pause/.test(c))).toBe(true);
  });

  it("congé APPROVED → conflit", () => {
    const staff = staffBase({
      leaves: [
        {
          id: "lv1",
          startAt: "2026-09-07T00:00:00.000Z",
          endAt: "2026-09-07T23:59:00.000Z",
          type: "CONGE",
          reason: null,
          status: "APPROVED",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });
    const r = checkAvailability(
      [],
      {
        staffId: "st1",
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(false);
  });

  it("remplacement → absente indisponible", () => {
    const staff = staffBase({
      replacementsAsAbsent: [
        {
          id: "rep1",
          startAt: mondayAt(0, 0).toISOString(),
          endAt: mondayAt(23, 0).toISOString(),
          substituteStaffId: "st2",
          substituteName: "Nora",
        },
      ],
    });
    expect(
      hasActiveReplacement(mondayAt(10), mondayAt(11), staff.replacementsAsAbsent),
    ).toBe(true);
    const r = checkAvailability(
      [],
      {
        staffId: "st1",
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(false);
    expect(r.conflicts.some((c) => /remplacée/.test(c))).toBe(true);
  });

  it("chevauchement RDV même employée", () => {
    const staff = staffBase();
    const existing: Appointment[] = [
      {
        id: "a1",
        organizationId: "o1",
        customerId: "c1",
        customerName: "Client",
        serviceId: "s1",
        serviceName: "Soin",
        staffId: "st1",
        staffName: "Sara",
        resourceId: null,
        resourceName: null,
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
        price: 200,
        deposit: null,
        depositState: "NOT_REQUIRED",
        depositDueAt: null,
        status: "CONFIRMED",
        notes: null,
        source: "MANUAL",
      },
    ];
    const r = checkAvailability(
      existing,
      {
        staffId: "st1",
        startAt: mondayAt(10, 30).toISOString(),
        endAt: mondayAt(11, 30).toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(false);
  });

  it("excludeAppointmentId ignore le RDV déplacé", () => {
    const staff = staffBase();
    const existing: Appointment[] = [
      {
        id: "a1",
        organizationId: "o1",
        customerId: "c1",
        customerName: "Client",
        serviceId: "s1",
        serviceName: "Soin",
        staffId: "st1",
        staffName: "Sara",
        resourceId: null,
        resourceName: null,
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
        price: 200,
        deposit: null,
        depositState: "NOT_REQUIRED",
        depositDueAt: null,
        status: "CONFIRMED",
        notes: null,
        source: "MANUAL",
      },
    ];
    const r = checkAvailability(
      existing,
      {
        staffId: "st1",
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
        excludeAppointmentId: "a1",
      },
      staff,
    );
    expect(r.available).toBe(true);
  });

  it("isStaffAvailableOnDate respecte remplacements", () => {
    const staff = staffBase({
      replacementsAsAbsent: [
        {
          id: "rep1",
          startAt: mondayAt(0, 0).toISOString(),
          endAt: mondayAt(23, 59).toISOString(),
          substituteStaffId: "st2",
          substituteName: "Nora",
        },
      ],
    });
    expect(isStaffAvailableOnDate(staff, mondayAt(12))).toBe(false);
  });

  it("getAvailableSlots exclut les pauses", () => {
    const staff = staffBase();
    const slots = getAvailableSlots([], {
      date: mondayAt(12),
      staffId: "st1",
      durationMinutes: 30,
      staffContext: staff,
    });
    const pauseSlot = slots.find((s) => s.time === "13:00" || s.time === "13:30");
    if (pauseSlot) expect(pauseSlot.available).toBe(false);
    const morning = slots.find((s) => s.time === "10:00");
    expect(morning?.available).toBe(true);
  });

  it("CANCELLED n'occupe pas le créneau", () => {
    const staff = staffBase();
    const existing: Appointment[] = [
      {
        id: "a1",
        organizationId: "o1",
        customerId: "c1",
        customerName: "Client",
        serviceId: "s1",
        serviceName: "Soin",
        staffId: "st1",
        staffName: "Sara",
        resourceId: null,
        resourceName: null,
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
        price: 200,
        deposit: null,
        depositState: "NOT_REQUIRED",
        depositDueAt: null,
        status: "CANCELLED",
        notes: null,
        source: "MANUAL",
      },
    ];
    const r = checkAvailability(
      existing,
      {
        staffId: "st1",
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(true);
  });

  it("créneau valide dans les horaires", () => {
    const staff = staffBase();
    const r = checkAvailability(
      [],
      {
        staffId: "st1",
        startAt: mondayAt(10, 0).toISOString(),
        endAt: mondayAt(11, 0).toISOString(),
      },
      staff,
    );
    expect(r.available).toBe(true);
  });
});
