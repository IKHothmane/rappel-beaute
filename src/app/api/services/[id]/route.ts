import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { canEditServicePrice } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/db/audit";
import { getServiceById, updateService } from "@/lib/db/services";
import { validateUpdateService } from "@/lib/validation/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "services");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const service = await getServiceById(auth.session.organizationId, id);
    if (!service) {
      return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
    }
    return NextResponse.json(service);
  } catch (error) {
    console.error("[GET /api/services/:id]", error);
    return NextResponse.json(
      { error: "Impossible de charger le service." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureWrite(request, "services");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateUpdateService(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    let input = validated.data;
    if (!canEditServicePrice(auth.session.role) && input.price !== undefined) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de modifier les prix." },
        { status: 403 },
      );
    }

    const { service, priceChange } = await updateService(
      auth.session.organizationId,
      id,
      input,
    );

    if (priceChange) {
      await writeAuditLog({
        organizationId: auth.session.organizationId,
        actorId: auth.session.id,
        actorName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
        entityType: "Service",
        entityId: priceChange.serviceId,
        action: "PRICE_CHANGE",
        before: { price: priceChange.oldPrice },
        after: { price: priceChange.newPrice, serviceName: priceChange.serviceName },
      });
    }

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/services/:id]", error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour le service." },
      { status: 500 },
    );
  }
}
