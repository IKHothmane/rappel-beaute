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
        CreateAppointmentInput & { status: AppointmentStatus; organizationId?: string }
      >,
    );

    const existing = await getAppointmentById(id, auth.session.organizationId);
    if (!existing) {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }

    const bookingChanged = Boolean(
      body.resourceId !== undefined ||
        body.serviceId ||
        body.startAt ||
        body.endAt,
    );

    const resourceId = body.resourceId ?? existing.resourceId;
    const serviceId = body.serviceId ?? existing.serviceId;
    const startAt = body.startAt ?? existing.startAt;
    const endAt = body.endAt ?? existing.endAt;

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
    );

    if (!appointment) {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }

    // Effets COMPLETED idempotents : stock + facture + commission
    if (
      body.status === "COMPLETED" &&
      existing.status !== "COMPLETED"
    ) {
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
