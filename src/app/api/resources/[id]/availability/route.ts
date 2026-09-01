import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { getResourceAvailability } from "@/lib/db/resources";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireFeatureRead(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const date = new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const availability = await getResourceAvailability(auth.session.organizationId, id, date);
    if (!availability) {
      return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
    }
    return NextResponse.json(availability);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }
    console.error("[GET /api/resources/:id/availability]", error);
    return NextResponse.json({ error: "Impossible de charger la disponibilité." }, { status: 500 });
  }
}
