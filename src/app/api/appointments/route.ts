import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
} from "@/lib/auth/api-guard";
import { enforceCreateAppointment } from "@/lib/subscriptions/guards";
import {
  createAppointmentRow,
  isExclusionViolation,
  listAppointmentsByOrg,
} from "@/lib/db/appointments";
import { assertResourceBookable } from "@/lib/db/resources";
import type { CreateAppointmentInput } from "@/types/appointment";

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

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const appointments = await listAppointmentsByOrg(auth.session.organizationId);
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[GET /api/appointments]", error);
    return NextResponse.json(
      { error: "Impossible de charger les rendez-vous." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "agenda");
  if (!auth.ok) return auth.response;

  const limitAuth = await enforceCreateAppointment(request);
  if (!limitAuth.ok) return limitAuth.response;

  try {
    const raw = (await request.json()) as CreateAppointmentInput & {
      organizationId?: string;
    };
    const { organizationId: _ignored, ...body } = raw;

    if (body.resourceId) {
      await assertResourceBookable({
        organizationId: auth.session.organizationId,
        resourceId: body.resourceId,
        serviceId: body.serviceId,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
      });
    }

    const appointment = await createAppointmentRow(auth.session.organizationId, body);
    return NextResponse.json(appointment, { status: 201 });
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
    console.error("[POST /api/appointments]", error);
    return NextResponse.json(
      { error: "Impossible de créer le rendez-vous." },
      { status: 500 },
    );
  }
}
