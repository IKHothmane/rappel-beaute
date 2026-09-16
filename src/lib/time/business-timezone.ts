/**
 * Fuseau métier de l'application. Les horaires d'ouverture, les plannings du
 * personnel et les créneaux de réservation sont exprimés en heure marocaine,
 * quel que soit le fuseau du serveur (UTC chez la plupart des hébergeurs) ou du
 * navigateur.
 *
 * Le décalage n'est jamais codé en dur : le Maroc est à UTC+1 mais repasse à
 * UTC+0 pendant le Ramadan, donc il est toujours résolu via la base IANA.
 */
export const BUSINESS_TZ = "Africa/Casablanca";

const PARTS_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type BusinessDate = { year: number; month: number; day: number };

export type BusinessParts = BusinessDate & {
  hour: number;
  minute: number;
  second: number;
  /** 0 = dimanche, même convention que Date.prototype.getDay(). */
  weekday: number;
};

/** Décompose un instant en heure murale marocaine. */
export function businessParts(instant: Date): BusinessParts {
  const parts = PARTS_FORMAT.formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    // Intl peut rendre « 24 » plutôt que « 00 » à minuit avec hour12: false.
    hour: Number(pick("hour")) % 24,
    minute: Number(pick("minute")),
    second: Number(pick("second")),
    weekday: WEEKDAY_INDEX[pick("weekday")] ?? 0,
  };
}

/**
 * Décalage du fuseau métier, en millisecondes, à cet instant.
 * Les décalages de fuseau tombent toujours sur la minute : les millisecondes de
 * l'instant sont donc reprises telles quelles, sinon elles faussent la
 * soustraction (Intl ne les expose pas).
 */
function offsetAt(instant: Date): number {
  const p = businessParts(instant);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
    instant.getUTCMilliseconds(),
  );
  return asUtc - instant.getTime();
}

/**
 * Instant correspondant à une heure murale marocaine.
 * Deux passes pour rester juste de part et d'autre d'un changement de décalage.
 */
export function businessWallTime(
  date: BusinessDate,
  hour: number,
  minute: number,
  second = 0,
  ms = 0,
): Date {
  const naive = Date.UTC(date.year, date.month - 1, date.day, hour, minute, second, ms);
  const firstPass = naive - offsetAt(new Date(naive));
  return new Date(naive - offsetAt(new Date(firstPass)));
}

/** Jour de la semaine marocain (0 = dimanche). */
export function businessDayOfWeek(instant: Date): number {
  return businessParts(instant).weekday;
}

/** Pose une heure « HH:MM » marocaine sur le jour calendaire marocain de `base`. */
export function businessTimeOnDate(base: Date, time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  return businessWallTime(businessParts(base), hour, minute);
}

/** Instant d'un « YYYY-MM-DD » + « HH:MM » exprimés en heure marocaine. */
export function businessDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return businessWallTime({ year, month, day }, hour, minute);
}

/** Les deux instants tombent-ils le même jour calendaire marocain ? */
export function isSameBusinessDay(a: Date, b: Date): boolean {
  const pa = businessParts(a);
  const pb = businessParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function startOfBusinessDay(instant: Date): Date {
  return businessWallTime(businessParts(instant), 0, 0, 0, 0);
}

export function endOfBusinessDay(instant: Date): Date {
  return businessWallTime(businessParts(instant), 23, 59, 59, 999);
}

/** « 14:30 » en heure marocaine. */
export function formatBusinessTime(instant: Date): string {
  return instant.toLocaleTimeString("fr-FR", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** « 14/10/2026 » en heure marocaine. */
export function formatBusinessDate(instant: Date): string {
  return instant.toLocaleDateString("fr-FR", { timeZone: BUSINESS_TZ });
}
