import { describe, expect, it } from "vitest";
import {
  businessDateTime,
  businessDayOfWeek,
  businessParts,
  businessTimeOnDate,
  endOfBusinessDay,
  formatBusinessTime,
  isSameBusinessDay,
  startOfBusinessDay,
} from "@/lib/time/business-timezone";

/**
 * Ces assertions doivent tenir quel que soit le TZ du process : c'est tout
 * l'intérêt du module. La CI tourne en UTC, les postes de dev en UTC+1.
 */
describe("Fuseau métier — Africa/Casablanca", () => {
  it("convertit une heure murale marocaine en instant UTC", () => {
    // 14 octobre 2026, hors Ramadan → Maroc à UTC+1
    expect(businessDateTime("2026-10-14", "09:00").toISOString()).toBe(
      "2026-10-14T08:00:00.000Z",
    );
    expect(businessDateTime("2026-10-14", "14:30").toISOString()).toBe(
      "2026-10-14T13:30:00.000Z",
    );
  });

  it("résout le décalage via la base IANA, pas en dur", () => {
    // Ramadan 2026 (février/mars) : le Maroc repasse à UTC+0
    const ramadan = businessDateTime("2026-03-01", "09:00");
    expect(ramadan.toISOString()).toBe("2026-03-01T09:00:00.000Z");
  });

  it("décompose un instant en heure murale marocaine", () => {
    const parts = businessParts(new Date("2026-10-14T08:00:00.000Z"));
    expect(parts).toMatchObject({
      year: 2026,
      month: 10,
      day: 14,
      hour: 9,
      minute: 0,
      weekday: 3, // mercredi
    });
  });

  it("donne le jour de la semaine marocain", () => {
    expect(businessDayOfWeek(new Date("2026-10-14T08:00:00.000Z"))).toBe(3);
    expect(businessDayOfWeek(new Date("2026-10-15T08:00:00.000Z"))).toBe(4);
  });

  it("rattache minuit passé au bon jour marocain", () => {
    // 23:30 marocain le 14 = 22:30Z le 14
    const late = new Date("2026-10-14T22:30:00.000Z");
    expect(businessParts(late).day).toBe(14);
    expect(businessDayOfWeek(late)).toBe(3);
  });

  it("pose une heure sur le jour marocain d'un instant", () => {
    const base = new Date("2026-10-14T22:30:00.000Z"); // 23:30 à Casablanca
    expect(businessTimeOnDate(base, "09:00").toISOString()).toBe(
      "2026-10-14T08:00:00.000Z",
    );
  });

  it("borne la journée marocaine", () => {
    const instant = new Date("2026-10-14T13:30:00.000Z");
    expect(startOfBusinessDay(instant).toISOString()).toBe("2026-10-13T23:00:00.000Z");
    expect(endOfBusinessDay(instant).toISOString()).toBe("2026-10-14T22:59:59.999Z");
  });

  it("compare les jours calendaires marocains", () => {
    const a = new Date("2026-10-13T23:30:00.000Z"); // 00:30 le 14 à Casablanca
    const b = new Date("2026-10-14T13:30:00.000Z"); // 14:30 le 14
    expect(isSameBusinessDay(a, b)).toBe(true);

    const c = new Date("2026-10-14T22:30:00.000Z"); // 23:30 le 14
    const d = new Date("2026-10-14T23:30:00.000Z"); // 00:30 le 15
    expect(isSameBusinessDay(c, d)).toBe(false);
  });

  it("formate l'heure en heure marocaine", () => {
    expect(formatBusinessTime(new Date("2026-10-14T13:30:00.000Z"))).toBe("14:30");
  });
});
