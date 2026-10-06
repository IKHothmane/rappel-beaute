import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as confirmAppointment } from "@/app/api/public/assistant/appointments/confirm/route";
import { POST as proposeAppointment } from "@/app/api/public/assistant/appointments/propose/route";
import { ensurePreviewWidget, openWidgetSession } from "@/lib/db/assistant-session";
import { getPublicAvailabilitySlots } from "@/lib/db/public-booking";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Proposition puis confirmation d'un rendez-vous public", () => {
  let orgId: string;
  let token: string;
  let otherToken: string;
  let foreignService: string;
  let date: string;
  let time: string;
  const sessionHashes: string[] = [];
  const phones: string[] = [];
  const actionIds: string[] = [];
  const appointmentIds: string[] = [];

  beforeAll(async () => {
    resetRateLimitsForTests();
    await ensurePreviewWidget();
    orgId = await getSeedOrgId();
    const otherOrgId = await ensureSecondOrg();
    foreignService = testId("svc");
    await testPool.query(
      `INSERT INTO "Service" (id, "organizationId", name, price, "durationMin", active, "updatedAt")
       VALUES ($1, $2, 'Soin autre institut', 180, 45, true, NOW())`,
      [foreignService, otherOrgId],
    );
    const opened = await openWidgetSession({
      publicId: "pub_preview",
      origin: "http://localhost:3000",
      ip: "203.0.113.81",
    });
    token = opened.token;
    sessionHashes.push(createHash("sha256").update(token).digest("hex"));
    const other = await openWidgetSession({
      publicId: "pub_preview",
      origin: "http://localhost:3000",
      ip: "203.0.113.82",
    });
    otherToken = other.token;
    sessionHashes.push(createHash("sha256").update(otherToken).digest("hex"));
    for (const candidate of ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]) {
      const slots = await getPublicAvailabilitySlots(orgId, { serviceId: "s2", date: candidate });
      const open = slots.find((slot) => slot.available);
      if (open) {
        date = candidate;
        time = open.time;
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
    if (phones.length) {
      await testPool.query(
        `DELETE FROM "Customer" WHERE "organizationId" = $1 AND phone = ANY($2::text[])`,
        [orgId, phones],
      );
    }
    await testPool.query(`DELETE FROM "Service" WHERE id = $1`, [foreignService]);
  });

  function post(path: "propose" | "confirm", bearer: string, body: unknown, key?: string) {
    return new NextRequest(`http://localhost:3000/api/public/assistant/appointments/${path}/`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
        ...(key ? { "idempotency-key": key } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("refuse organizationId, employeeId et customerId", async () => {
    const before = await testPool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM "AssistantAction" WHERE "organizationId" = $1`,
      [orgId],
    );
    const res = await proposeAppointment(
      post("propose", token, {
        serviceId: "s2",
        date,
        time,
        firstName: "Lina",
        lastName: "Test",
        phone: testId("w"),
        organizationId: "org_impose",
        customerId: "cus_impose",
        staffId: "emp_impose",
      }),
    );
    expect(res.status).toBe(403);
    const after = await testPool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM "AssistantAction" WHERE "organizationId" = $1`,
      [orgId],
    );
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });

  it("ne propose pas un service d'un autre institut", async () => {
    const res = await proposeAppointment(
      post("propose", token, {
        serviceId: foreignService,
        date,
        time,
        firstName: "Lina",
        lastName: "Test",
        phone: testId("w"),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("confirme une seule fois et rattache la cliente dans l'institut de la session", async () => {
    const phone = testId("w");
    phones.push(phone);
    const key = `idem${testId("k").replace(/_/g, "")}`;
    const person = { serviceId: "s2", date, time, firstName: "Lina", lastName: "Widget", phone };
    const created = await proposeAppointment(post("propose", token, person, key));
    expect(created.status).toBe(201);
    const proposal = (await created.json()) as {
      actionId: string;
      status: string;
      customerId?: string;
      staffId?: string;
      organizationId?: string;
    };
    actionIds.push(proposal.actionId);
    expect(proposal.status).toBe("PENDING_CONFIRMATION");
    expect(proposal.customerId).toBeUndefined();
    expect(proposal.staffId).toBeUndefined();
    expect(proposal.organizationId).toBeUndefined();

    const replay = await proposeAppointment(post("propose", token, person, key));
    const replayBody = (await replay.json()) as { actionId: string };
    expect(replayBody.actionId).toBe(proposal.actionId);

    const confirmed = await confirmAppointment(
      post("confirm", token, { actionId: proposal.actionId }),
    );
    expect(confirmed.status).toBe(200);
    const booking = (await confirmed.json()) as {
      reference: string;
      appointmentId?: string;
      customerId?: string;
      staffId?: string;
    };
    expect(booking.reference).toMatch(/^[A-Z2-9]{10}$/);
    expect(booking.appointmentId).toBeUndefined();
    expect(booking.customerId).toBeUndefined();
    expect(booking.staffId).toBeUndefined();
    const storedId = await testPool.query<{ id: string }>(
      `SELECT id FROM "Appointment" WHERE "bookingRef" = $1 AND "organizationId" = $2`,
      [booking.reference, orgId],
    );
    appointmentIds.push(storedId.rows[0].id);

    const again = await confirmAppointment(post("confirm", token, { actionId: proposal.actionId }));
    const againBody = (await again.json()) as { reference: string };
    expect(again.status).toBe(200);
    expect(againBody.reference).toBe(booking.reference);

    const stored = await testPool.query<{ organizationId: string; phone: string; n: string }>(
      `SELECT a."organizationId", c.phone, COUNT(*)::text AS n
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId"
       WHERE c.phone = $1 AND a."organizationId" = $2
       GROUP BY a."organizationId", c.phone`,
      [phone, orgId],
    );
    expect(stored.rows[0]?.organizationId).toBe(orgId);
    expect(stored.rows[0]?.n).toBe("1");

    const outsider = await confirmAppointment(
      post("confirm", otherToken, { actionId: proposal.actionId }),
    );
    expect(outsider.status).toBe(404);
  });

  it("laisse une seule écriture quand deux propositions visent le même créneau", async () => {
    const slots = await getPublicAvailabilitySlots(orgId, { serviceId: "s2", date });
    const open = slots.filter((slot) => slot.available);
    expect(open.length).toBeGreaterThan(0);
    const slot = open[open.length - 1]?.time ?? time;
    const firstPhone = testId("w");
    const secondPhone = testId("w");
    phones.push(firstPhone, secondPhone);
    const first = await proposeAppointment(
      post("propose", token, {
        serviceId: "s2",
        date,
        time: slot,
        firstName: "Nora",
        lastName: "Une",
        phone: firstPhone,
      }, `race${testId("a").replace(/_/g, "")}`),
    );
    const second = await proposeAppointment(
      post("propose", token, {
        serviceId: "s2",
        date,
        time: slot,
        firstName: "Nora",
        lastName: "Deux",
        phone: secondPhone,
      }, `race${testId("b").replace(/_/g, "")}`),
    );
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = (await first.json()) as { actionId: string };
    const secondBody = (await second.json()) as { actionId: string };
    actionIds.push(firstBody.actionId, secondBody.actionId);
    const [left, right] = await Promise.all([
      confirmAppointment(post("confirm", token, { actionId: firstBody.actionId })),
      confirmAppointment(post("confirm", token, { actionId: secondBody.actionId })),
    ]);
    const statuses = [left.status, right.status].sort();
    expect(statuses).toEqual([200, 409]);
    for (const res of [left, right]) {
      if (res.status === 200) {
        const body = (await res.json()) as { reference: string };
        const storedId = await testPool.query<{ id: string }>(
          `SELECT id FROM "Appointment" WHERE "bookingRef" = $1`,
          [body.reference],
        );
        if (storedId.rows[0]) appointmentIds.push(storedId.rows[0].id);
      }
    }
  });
});
