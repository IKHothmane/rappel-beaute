import { businessParts } from "@/lib/time/business-timezone";

export type VisitorIntent =
  | { intent: "services" }
  | { intent: "products" }
  | { intent: "promotions" }
  | {
      intent: "availability" | "book";
      serviceHint?: string;
      date?: string;
      time?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      reference?: string;
    }
  | {
      intent: "reschedule";
      serviceHint?: string;
      date?: string;
      time?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      reference?: string;
    }
  | { intent: "find" | "cancel"; reference?: string; phone?: string }
  | { intent: "unknown" };

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function resolveVisitorDate(text: string, now: Date): string | undefined {
  const folded = fold(text);
  const today = businessParts(now);
  const iso = folded.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  if (/\baujourd'hui\b|\btoday\b/.test(folded)) return isoDate(today.year, today.month, today.day);
  if (/\bdemain\b|\btomorrow\b/.test(folded)) {
    const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const parts = businessParts(next);
    return isoDate(parts.year, parts.month, parts.day);
  }
  const named = folded.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/);
  if (named) {
    const month = MONTHS.indexOf(named[2]) + 1;
    let year = today.year;
    const candidate = new Date(`${isoDate(year, month, Number(named[1]))}T12:00:00+01:00`);
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) year += 1;
    return isoDate(year, month, Number(named[1]));
  }
  for (let index = 0; index < WEEKDAYS.length; index += 1) {
    if (!folded.includes(WEEKDAYS[index])) continue;
    const delta = (index - today.weekday + 7) % 7;
    const next = new Date(now.getTime() + delta * 24 * 60 * 60 * 1000);
    const parts = businessParts(next);
    return isoDate(parts.year, parts.month, parts.day);
  }
  return undefined;
}

export function resolveVisitorTime(text: string): string | undefined {
  const folded = fold(text);
  const clock = folded.match(/\b([01]?\d|2[0-3])\s*h\s*([0-5]\d)?\b/);
  if (clock) {
    return `${clock[1].padStart(2, "0")}:${clock[2] ?? "00"}`;
  }
  const precise = folded.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (precise) return `${precise[1]}:${precise[2]}`;
  return undefined;
}

function phoneOf(text: string): string | undefined {
  const labeled = text.match(/(?:t[eé]l[eé]phone|tel|phone)\s*[:.]?\s*([+\d][\d\s.-]{8,18})/i);
  const source = labeled?.[1] ?? text;
  const match = source.match(/(?:\+212|212|0)[ \t.-]*[5-8](?:[ \t.-]*\d){8}/);
  if (!match) return undefined;
  const digits = match[0].replace(/\D/g, "");
  if (digits.startsWith("212")) return `0${digits.slice(3, 12)}`;
  return digits.slice(0, 10);
}

function nameOf(text: string): { firstName?: string; lastName?: string } {
  const match = text.match(/m['’]appelle\s+(\p{L}+)\s+(\p{L}+)/iu);
  if (!match) return {};
  return { firstName: match[1], lastName: match[2] };
}

function referenceOf(text: string): string | undefined {
  const match = text.toUpperCase().match(/\b[A-HJ-NP-Z2-9]{10}\b/);
  return match?.[0];
}

const ALLOWED = new Set([
  "services",
  "products",
  "promotions",
  "availability",
  "book",
  "find",
  "reschedule",
  "cancel",
  "unknown",
]);

export function intentFromModel(content: string, now: Date): VisitorIntent | null {
  const json = content.match(/\{[\s\S]*\}/);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json[0]) as { intent?: string; args?: Record<string, unknown> };
    if (!parsed.intent || !ALLOWED.has(parsed.intent) || parsed.intent === "unknown") return null;
    if (parsed.intent === "confirm" || parsed.intent === "execute") return null;
    const args = parsed.args ?? {};
    const clean = (key: string) => (typeof args[key] === "string" ? args[key].trim() : undefined);
    if (parsed.intent === "services" || parsed.intent === "products" || parsed.intent === "promotions") {
      return { intent: parsed.intent };
    }
    if (parsed.intent === "find" || parsed.intent === "cancel") {
      return { intent: parsed.intent, reference: clean("reference"), phone: clean("phone") };
    }
    if (parsed.intent !== "availability" && parsed.intent !== "book" && parsed.intent !== "reschedule") {
      return null;
    }
    return {
      intent: parsed.intent,
      serviceHint: clean("serviceHint"),
      date: clean("date") ?? resolveVisitorDate(String(args.date ?? ""), now),
      time: clean("time"),
      firstName: clean("firstName"),
      lastName: clean("lastName"),
      phone: clean("phone"),
      reference: clean("reference"),
    };
  } catch {
    return null;
  }
}

export function interpretVisitorMessage(message: string, now = new Date()): VisitorIntent {
  const folded = fold(message);
  const phone = phoneOf(message);
  const reference = referenceOf(message);
  const names = nameOf(message);
  const date = resolveVisitorDate(message, now);
  const time = resolveVisitorTime(message);

  if (/\b(deplac|report|chang)/.test(folded) && /\brendez/.test(folded)) {
    return { intent: "reschedule", reference, phone, date, time };
  }
  if (/\bannul/.test(folded) && /\brendez/.test(folded)) {
    return { intent: "cancel", reference, phone };
  }
  if (/\b(retrouver|ma reference|mon rendez)/.test(folded) && !/\b(deplac|report|chang|annul)/.test(folded)) {
    return { intent: "find", reference, phone };
  }
  if (/\b(produit|product)\b/.test(folded)) return { intent: "products" };
  if (/\b(promo|offre|promotion)\b/.test(folded)) return { intent: "promotions" };
  if (/\b(soins?|services?|catalogue|menu)\b/.test(folded) && !/\b(reserv|veux|voudrais|prendre|book)\b/.test(folded)) {
    return { intent: "services" };
  }
  if (/\b(creneau|disponib|horaire|availability)\b/.test(folded)) {
    return { intent: "availability", serviceHint: serviceHint(folded), date, time };
  }
  if (/\b(reserv|veux|voudrais|prendre|book)\b/.test(folded) || (serviceHint(folded) && (date || time || phone))) {
    return {
      intent: "book",
      serviceHint: serviceHint(folded),
      date,
      time,
      phone,
      reference,
      ...names,
    };
  }
  if (reference && phone) return { intent: "find", reference, phone };
  return { intent: "unknown" };
}

function serviceHint(folded: string): string | undefined {
  const known = ["manucure", "hydrafacial", "sourcil", "maquillage", "massage", "soin"];
  return known.find((hint) => folded.includes(hint));
}
