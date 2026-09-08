import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { updateWaitingListStatus } from "@/lib/db/waiting-list";
import type { WaitingListStatus } from "@/types/waiting-list";

const STATUSES = new Set<WaitingListStatus>([
  "WAITING",
  "NOTIFIED",
  "BOOKED",
  "EXPIRED",
  "CANCELLED",
]);

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureWriteLimited(request, "agenda");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const status = String(raw.status ?? "").toUpperCase() as WaitingListStatus;
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const entry = await updateWaitingListStatus(
      auth.session.organizationId,
      id,
      status,
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    if (!entry) {
      return NextResponse.json({ error: "Entrée introuvable." }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    console.error("[PATCH /api/waiting-list/:id]", error);
    return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
  }
}
