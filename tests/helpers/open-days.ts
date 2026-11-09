import { businessDateTime, businessDayOfWeek } from "@/lib/time/business-timezone";

/** Prochain jour civil du fuseau métier (0 = dimanche), assez loin pour rester réservable. */
export function upcomingWeekday(weekday: number, leadDays = 14): string {
  const lead = new Date(Date.now() + leadDays * 24 * 60 * 60 * 1000);
  let cursor = Date.UTC(lead.getUTCFullYear(), lead.getUTCMonth(), lead.getUTCDate());
  for (let i = 0; i < 14; i += 1) {
    const iso = new Date(cursor).toISOString().slice(0, 10);
    if (businessDayOfWeek(businessDateTime(iso, "12:00")) === weekday) return iso;
    cursor += 24 * 60 * 60 * 1000;
  }
  throw new Error("Aucun jour ouvrable de test.");
}

/** Prochains lundis du fuseau métier, assez loin pour ne pas tomber sur « aujourd'hui ». */
export function upcomingMondays(count: number, leadDays = 10): string[] {
  const dates: string[] = [];
  const lead = new Date(Date.now() + leadDays * 24 * 60 * 60 * 1000);
  let cursor = Date.UTC(lead.getUTCFullYear(), lead.getUTCMonth(), lead.getUTCDate());
  for (let i = 0; dates.length < count && i < 60; i += 1) {
    const iso = new Date(cursor).toISOString().slice(0, 10);
    if (businessDayOfWeek(businessDateTime(iso, "12:00")) === 1) dates.push(iso);
    cursor += 24 * 60 * 60 * 1000;
  }
  return dates;
}
