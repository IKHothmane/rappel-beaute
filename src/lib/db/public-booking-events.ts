import { randomBytes } from "crypto";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export type PublicBookingEventType = "VIEW" | "BOOKED";

export async function recordPublicBookingEvent(input: {
  organizationId: string;
  eventType: PublicBookingEventType;
  source?: string | null;
  serviceId?: string | null;
  staffId?: string | null;
  appointmentId?: string | null;
}): Promise<void> {
  const source = input.source?.trim().slice(0, 40) || null;
  await pool.query(
    `INSERT INTO "PublicBookingEvent" (
      id, "organizationId", "eventType", source, "serviceId", "staffId", "appointmentId"
    ) VALUES ($1,$2,$3::"PublicBookingEventType",$4,$5,$6,$7)`,
    [
      newId("pbev"),
      input.organizationId,
      input.eventType,
      source,
      input.serviceId ?? null,
      input.staffId ?? null,
      input.appointmentId ?? null,
    ],
  );
}

export async function getQrBookingStats(organizationId: string): Promise<{
  views: number;
  bookings: number;
  conversionPct: number | null;
}> {
  const { rows } = await pool.query<{ eventType: string; n: string }>(
    `SELECT "eventType"::text AS "eventType", COUNT(*)::text AS n
     FROM "PublicBookingEvent"
     WHERE "organizationId" = $1 AND source = 'qr'
     GROUP BY "eventType"`,
    [organizationId],
  );
  const map = Object.fromEntries(rows.map((r) => [r.eventType, Number(r.n)]));
  const views = map.VIEW ?? 0;
  const bookings = map.BOOKED ?? 0;
  return {
    views,
    bookings,
    conversionPct: views > 0 ? Math.round((bookings / views) * 1000) / 10 : null,
  };
}
