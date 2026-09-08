import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createWaitingListEntry,
  listWaitingListEntries,
} from "@/lib/db/waiting-list";
import type { WaitingListStatus } from "@/types/waiting-list";

const STATUSES = new Set<WaitingListStatus>([
  "WAITING",
  "NOTIFIED",
  "BOOKED",
  "EXPIRED",
  "CANCELLED",
]);

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const statusRaw = request.nextUrl.searchParams.get("status");
    const status =
      statusRaw && STATUSES.has(statusRaw as WaitingListStatus)
        ? (statusRaw as WaitingListStatus)
        : undefined;
    const serviceId = request.nextUrl.searchParams.get("serviceId") ?? undefined;
    const items = await listWaitingListEntries(auth.session.organizationId, {
      status,
      serviceId,
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/waiting-list]", error);
    return NextResponse.json({ error: "Impossible de charger la liste." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const customerId = String(raw.customerId ?? "").trim();
    const serviceId = String(raw.serviceId ?? "").trim();
    const preferredDate = String(raw.preferredDate ?? "").trim();
    if (!customerId || !serviceId || !preferredDate) {
      return NextResponse.json(
        { error: "Cliente, service et date requis." },
        { status: 400 },
      );
    }

    const entry = await createWaitingListEntry(
      auth.session.organizationId,
      {
        customerId,
        serviceId,
        staffId: raw.staffId ? String(raw.staffId) : null,
        preferredDate,
        preferredTimeFrom: raw.preferredTimeFrom
          ? String(raw.preferredTimeFrom)
          : null,
        preferredTimeTo: raw.preferredTimeTo ? String(raw.preferredTimeTo) : null,
        notes: raw.notes ? String(raw.notes) : null,
      },
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CUSTOMER_NOT_FOUND") {
        return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
      }
      if (error.message === "SERVICE_NOT_FOUND") {
        return NextResponse.json({ error: "Service introuvable." }, { status: 404 });
      }
      if (error.message === "STAFF_NOT_FOUND") {
        return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
      }
    }
    console.error("[POST /api/waiting-list]", error);
    return NextResponse.json({ error: "Impossible d'ajouter l'entrée." }, { status: 500 });
  }
}
