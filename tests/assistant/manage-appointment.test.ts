import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as readAppointment } from "@/app/api/public/assistant/appointments/route";
import { POST as cancelAppointment } from "@/app/api/public/assistant/appointments/cancel/route";
import { POST as confirmAppointment } from "@/app/api/public/assistant/appointments/confirm/route";
import { POST as proposeAppointment } from "@/app/api/public/assistant/appointments/propose/route";
import { POST as rescheduleAppointment } from "@/app/api/public/assistant/appointments/reschedule/route";
import { ensurePreviewWidget, openWidgetSession } from "@/lib/db/assistant-session";
import { getPublicAvailabilitySlots } from "@/lib/db/public-booking";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Référence et téléphone pour un rendez-vous existant", () => {
  let orgId: string;
  let token: string;
  let otherToken: string;
  let otherWidgetId: string;
  let date: string;
  let time: string;
  let later: string;
  const phone = testId("w");
  const sessionHashes: string[] = [];
  const appointmentIds: string[] = [];

  beforeAll(async () => {
    resetRateLimitsForTests();
    await ensurePreviewWidget();
    orgId = await getSeedOrgId();
    const otherOrgId = await ensureSecondOrg();
    otherWidgetId = testId("wdg");
    const publicId = testId("pub");
    await testPool.query(
      `INSERT INTO "PublicWidget" (id, "organizationId", "publicId", name, status, "updatedAt")
       VALUES ($1, $2, $3, 'Widget autre institut', 'ACTIVE', NOW())`,
      [otherWidgetId, otherOrgId, publicId],
    );
    await testPool.query(
      `INSERT INTO "PublicWidgetOrigin" (id, "widgetId", origin) VALUES ($1, $2, 'http://localhost:3000')`,
      [testId("orgn"), otherWidgetId],
    );
    const opened = await openWidgetSession({
      publicId: "pub_preview",
      origin: "http://localhost:3000",
      ip: "203.0.113.91",
    });
    token = opened.token;
    sessionHashes.push(createHash("sha256").update(token).digest("hex"));
    const other = await openWidgetSession({
      publicId,
      origin: "http://localhost:3000",
      ip: "203.0.113.92",
    });
    otherToken = other.token;
    for (const candidate of ["2026-12-07", "2026-12-14", "2026-12-21"]) {
      const slots = await getPublicAvailabilitySlots(orgId, { serviceId: "s2", date: candidate });
      const open = slots.filter((slot) => slot.available).map((slot) => slot.time);
      if (open.length >= 2) {
        date = candidate;
        time = open[0];
        later = open[open.length - 1];
        break;
      }
    }
    if (!date) throw new Error("Aucun créneau de test.");
  });

  afterAll(async () => {
    if (appointmentIds.length) {
      await testPool.query(`DELETE FROM "Appointment" WHERE id = ANY($1::text[])`, [appointmentIds]);
    }
    await testPool.query(
      `DELETE FROM "AssistantConversation"
       WHERE "widgetSessionId" IN (
         SELECT id FROM "AssistantWidgetSession" WHERE "tokenHash" = ANY($1::text[])
       )`,
      [sessionHashes],
    );
    await testPool.query(`DELETE FROM "Customer" WHERE "organizationId" = $1 AND phone = $2`, [
      orgId,
      phone,
    ]);
    await testPool.query(`DELETE FROM "PublicWidget" WHERE id = $1`, [otherWidgetId]);
  });

  function call(
    path: string,
    bearer: string,
    init?: { method?: string; body?: unknown; key?: string },
  ) {
    return new NextRequest(`http://localhost:3000/api/public/assistant/${path}`, {
      method: init?.method ?? "GET",
      headers: {
        authorization: `Bearer ${bearer}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.key ? { "idempotency-key": init.key } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  }

  it("n'ouvre le rendez-vous qu'avec la référence et le téléphone de cet institut", async () => {
    const created = await proposeAppointment(
      call("appointments/propose/", token, {
        method: "POST",
        key: `idem${testId("k").replace(/_/g, "")}`,
        body: {
          serviceId: "s2",
          date,
          time,
          firstName: "Lina",
          lastName: "Suivi",
          phone,
        },
      }),
    );
    expect(created.status).toBe(201);
    const proposal = (await created.json()) as { actionId: string };
    const confirmed = await confirmAppointment(
      call("appointments/confirm/", token, { method: "POST", body: { actionId: proposal.actionId } }),
    );
    expect(confirmed.status).toBe(200);
    const booking = (await confirmed.json()) as { reference: string; customerId?: string };
    expect(booking.customerId).toBeUndefined();
    const stored = await testPool.query<{ id: string }>(
      `SELECT id FROM "Appointment" WHERE "bookingRef" = $1 AND "organizationId" = $2`,
      [booking.reference, orgId],
    );
    appointmentIds.push(stored.rows[0].id);
    const original = await testPool.query<{ startAt: Date }>(
      `SELECT "startAt" FROM "Appointment" WHERE id = $1`,
      [stored.rows[0].id],
    );

    const wrongPhone = await readAppointment(
      call(`appointments/?reference=${booking.reference}&phone=0600000000`, token),
    );
    expect(wrongPhone.status).toBe(404);

    const otherInstitute = await readAppointment(
      call(`appointments/?reference=${booking.reference}&phone=${phone}`, otherToken),
    );
    expect(otherInstitute.status).toBe(404);

    const found = await readAppointment(
      call(`appointments/?reference=${booking.reference}&phone=${phone}`, token),
    );
    expect(found.status).toBe(200);
    const view = (await found.json()) as {
      appointment: { serviceName: string; time: string; manageable: boolean; customerId?: string; staffId?: string };
    };
    expect(view.appointment.serviceName).toBe("Manucure");
    expect(view.appointment.time).toBe(time);
    expect(view.appointment.manageable).toBe(true);
    expect(view.appointment.customerId).toBeUndefined();
    expect(view.appointment.staffId).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain(stored.rows[0].id);

    const forced = await rescheduleAppointment(
      call("appointments/reschedule/", token, {
        method: "POST",
        body: {
          reference: booking.reference,
          phone,
          date,
          time: later,
          organizationId: "org_impose",
          staffId: "emp_impose",
        },
      }),
    );
    expect(forced.status).toBe(403);

    const moved = await rescheduleAppointment(
      call("appointments/reschedule/", token, {
        method: "POST",
        key: `move${testId("m").replace(/_/g, "")}`,
        body: { reference: booking.reference, phone, date, time: later },
      }),
    );
    expect(moved.status).toBe(201);
    const moveBody = (await moved.json()) as { actionId: string; staffId?: string };
    expect(moveBody.staffId).toBeUndefined();
    const moveDone = await confirmAppointment(
      call("appointments/confirm/", token, { method: "POST", body: { actionId: moveBody.actionId } }),
    );
    expect(moveDone.status).toBe(200);
    const afterMove = await testPool.query<{ startAt: Date }>(
      `SELECT "startAt" FROM "Appointment" WHERE id = $1`,
      [stored.rows[0].id],
    );
    expect(afterMove.rows[0].startAt.toISOString()).not.toBe(original.rows[0].startAt.toISOString());

    const seen = await readAppointment(
      call(`appointments/?reference=${booking.reference}&phone=${phone}`, token),
    );
    const seenBody = (await seen.json()) as { appointment: { time: string } };
    expect(seenBody.appointment.time).toBe(later);

    const cancel = await cancelAppointment(
      call("appointments/cancel/", token, {
        method: "POST",
        key: `stop${testId("c").replace(/_/g, "")}`,
        body: { reference: booking.reference, phone },
      }),
    );
    expect(cancel.status).toBe(201);
    const cancelBody = (await cancel.json()) as { actionId: string };
    const cancelDone = await confirmAppointment(
      call("appointments/confirm/", token, { method: "POST", body: { actionId: cancelBody.actionId } }),
    );
    expect(cancelDone.status).toBe(200);
    const status = await testPool.query<{ status: string }>(
      `SELECT status::text AS status FROM "Appointment" WHERE id = $1`,
      [stored.rows[0].id],
    );
    expect(status.rows[0].status).toBe("CANCELLED");
  });
});
