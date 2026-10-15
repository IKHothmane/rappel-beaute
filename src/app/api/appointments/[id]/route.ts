import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  getAppointmentById,
  isExclusionViolation,
  updateAppointmentRow,
} from "@/lib/db/appointments";
import { assertAppointmentBookable } from "@/lib/db/planning";
import { assertResourceBookable } from "@/lib/db/resources";
import { onAppointmentCompleted } from "@/lib/db/invoices";
import type { AppointmentStatus, CreateAppointmentInput } from "@/types/appointment";

function resourceBookingError(error: unknown) {
  if (!(error instanceof Error)) return null;
  const map: Record<string, string> = {
    RESOURCE_NOT_FOUND: "Ressource introuvable.",
    RESOURCE_INACTIVE: "Cette ressource est désactivée.",
    RESOURCE_NOT_ALLOWED: "Cette ressource n'est pas autorisée pour ce service.",
    RESOURCE_MAINTENANCE: "Cette ressource est en maintenance sur ce créneau.",
  };
  return map[error.message] ?? null;
}

function availabilityError(error: unknown) {
  if (!(error instanceof Error) || error.message !== "AVAILABILITY_CONFLICT") return null;
  const conflicts = (error as Error & { conflicts?: string[] }).conflicts;
  return conflicts?.length
    ? conflicts.join(" ")
    : "Créneau hors disponibilité (horaires, pause, congé ou fermeture).";
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "agenda");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const appointment = await getAppointmentById(id, auth.session.organizationId);
    if (!appointment) {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }
    return NextResponse.json(appointment);
  } catch (error) {
    console.error(`[GET /api/appointments/${id}]`, error);
    return NextResponse.json(
      { error: "Impossible de charger le rendez-vous." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "agenda");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = stripOrganizationId(
      (await request.json()) as Partial<
        CreateAppointmentInput & { status: AppointmentStatus; organizationId?: string; promotionCode?: string }
      >,
    );

    const existing = await getAppointmentById(id, auth.session.organizationId);
    if (!existing) {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }

    if (typeof body.promotionCode === "string") {
      const code = body.promotionCode.trim();
      if (!code) {
        return NextResponse.json({ error: "Entrez un code promo." }, { status: 400 });
      }
      if (existing.promotionId || (existing.discount ?? 0) > 0) {
        return NextResponse.json({ error: "Une réduction est déjà appliquée." }, { status: 409 });
      }
      const { computePromotionDiscount } = await import("@/lib/db/promotions");
      const { pool } = await import("@/lib/db/pool");
      try {
        const service = await pool.query<{ price: string }>(
          `SELECT price::text AS price FROM "Service" WHERE id = $1 AND "organizationId" = $2`,
          [existing.serviceId, auth.session.organizationId],
        );
        const servicePrice = Number(service.rows[0]?.price ?? 0);
        const oneService = servicePrice > 0 ? Math.min(existing.price, servicePrice) : existing.price;
        const computed = await computePromotionDiscount({
          organizationId: auth.session.organizationId,
          promotionCode: code,
          serviceId: existing.serviceId,
          customerId: existing.customerId,
          amount: oneService,
          at: new Date(existing.startAt),
        });
        if (!computed) {
          return NextResponse.json({ error: "Code promo introuvable." }, { status: 400 });
        }
        const appointment = await updateAppointmentRow(id, auth.session.organizationId, {
          promotionId: computed.promotionId,
        });
        if (!appointment) {
          return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
        }
        return NextResponse.json(appointment);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const known: Record<string, string> = {
          PROMO_INACTIVE: "Ce code n'est plus actif.",
          PROMO_NOT_STARTED: "Ce code n'est pas encore valable.",
          PROMO_EXPIRED: "Ce code a expiré.",
          PROMO_SERVICE_MISMATCH: "Ce code ne s'applique pas à cette prestation.",
          PROMO_MIN_AMOUNT: "Le montant du rendez-vous est trop bas pour ce code.",
          PROMO_MAX_USES: "Ce code a déjà été utilisé.",
          PROMO_MAX_PER_CUSTOMER: "Cette cliente a déjà utilisé ce code.",
          PROMO_WEEKDAY: "Ce code n'est pas valable aujourd'hui.",
          PROMO_TIME: "Ce code n'est pas valable à cette heure.",
        };
        if (known[message]) {
          return NextResponse.json({ error: known[message] }, { status: 400 });
        }
        throw error;
      }
    }

    const bookingChanged = Boolean(
      body.resourceId !== undefined ||
        body.serviceId ||
        body.staffId !== undefined ||
        body.startAt ||
        body.endAt,
    );

    if (body.status && body.status !== existing.status) {
      const { assertCanConfirmWithoutDeposit, expireOverdueDepositAppointments } =
        await import("@/lib/db/booking-policy");
      await expireOverdueDepositAppointments(auth.session.organizationId);
      const gate = await assertCanConfirmWithoutDeposit({
        organizationId: auth.session.organizationId,
        appointmentId: id,
        nextStatus: body.status,
      });
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: 409 });
      }
    }

    const resourceId = body.resourceId !== undefined ? body.resourceId : existing.resourceId;
    const serviceId = body.serviceId ?? existing.serviceId;
    const staffId = body.staffId === undefined ? existing.staffId : body.staffId || undefined;
    const startAt = body.startAt ?? existing.startAt;
    const endAt = body.endAt ?? existing.endAt;

    if (bookingChanged) {
      await assertAppointmentBookable({
        organizationId: auth.session.organizationId,
        staffId,
        resourceId,
        startAt,
        endAt,
        excludeAppointmentId: id,
      });
    }

    if (bookingChanged && resourceId) {
      await assertResourceBookable({
        organizationId: auth.session.organizationId,
        resourceId,
        serviceId,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      });
    }

    const appointment = await updateAppointmentRow(
      id,
      auth.session.organizationId,
      body,
      {
        actor: {
          id: auth.session.id,
          name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
        },
        cancelledByInstitute: true,
      },
    );

    if (!appointment) {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }

    if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
      await onAppointmentCompleted({
        organizationId: auth.session.organizationId,
        appointmentId: appointment.id,
        serviceId: appointment.serviceId,
        userId: auth.session.id,
      });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    if (isExclusionViolation(error)) {
      return NextResponse.json(
        {
          error:
            "Créneau indisponible : chevauchement détecté par PostgreSQL (EXCLUDE).",
        },
        { status: 409 },
      );
    }
    const availMsg = availabilityError(error);
    if (availMsg) {
      return NextResponse.json({ error: availMsg }, { status: 409 });
    }
    const resourceMsg = resourceBookingError(error);
    if (resourceMsg) {
      return NextResponse.json({ error: resourceMsg }, { status: 409 });
    }
    console.error(`[PATCH /api/appointments/${id}]`, error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour le rendez-vous." },
      { status: 500 },
    );
  }
}

/** Pas de DELETE — annulation via PATCH { status: "CANCELLED" } */
