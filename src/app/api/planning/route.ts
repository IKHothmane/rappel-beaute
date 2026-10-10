import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createOrganizationClosure,
  createStaffOvertime,
  createStaffReplacement,
  deactivateStaffReplacement,
  deleteOrganizationClosure,
  deleteStaffOvertime,
  listOrganizationClosures,
  listOrganizationLeaves,
  listStaffOvertimes,
  listStaffReplacements,
  updateStaffOvertime,
  updateStaffReplacement,
} from "@/lib/db/planning";

function actor(session: { id: string; firstName: string; lastName: string }) {
  return { id: session.id, name: `${session.firstName} ${session.lastName}`.trim() };
}

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const orgId = auth.session.organizationId;
    const history = new URL(request.url).searchParams.get("history") === "1";
    const from = new Date();
    from.setDate(from.getDate() - (history ? 730 : 14));
    const to = new Date();
    to.setDate(to.getDate() + (history ? 400 : 120));

    const [closures, overtimes, replacements, leaves] = await Promise.all([
      listOrganizationClosures(orgId, { from, to }),
      listStaffOvertimes(orgId, { from, to }),
      listStaffReplacements(orgId, { from, to, includeInactive: history }),
      history ? listOrganizationLeaves(orgId, { from, to }) : Promise.resolve([]),
    ]);

    return NextResponse.json({ closures, overtimes, replacements, leaves });
  } catch (error) {
    console.error("[GET /api/planning]", error);
    return NextResponse.json({ error: "Erreur planning." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const kind = String(raw.kind ?? "");
    const a = actor(auth.session);
    const orgId = auth.session.organizationId;

    if (kind === "closure") {
      const item = await createOrganizationClosure(
        orgId,
        {
          startAt: String(raw.startAt),
          endAt: String(raw.endAt),
          reason: raw.reason != null ? String(raw.reason) : null,
        },
        a,
      );
      return NextResponse.json(item, { status: 201 });
    }

    if (kind === "overtime") {
      const item = await createStaffOvertime(
        orgId,
        {
          staffId: String(raw.staffId),
          startAt: String(raw.startAt),
          endAt: String(raw.endAt),
          reason: raw.reason != null ? String(raw.reason) : null,
        },
        a,
      );
      return NextResponse.json(item, { status: 201 });
    }

    if (kind === "replacement") {
      const item = await createStaffReplacement(
        orgId,
        {
          absentStaffId: String(raw.absentStaffId),
          substituteStaffId: String(raw.substituteStaffId),
          startAt: String(raw.startAt),
          endAt: String(raw.endAt),
          reason: raw.reason != null ? String(raw.reason) : null,
        },
        a,
      );
      return NextResponse.json(item, { status: 201 });
    }

    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_RANGE") {
      return NextResponse.json({ error: "Plage horaire invalide." }, { status: 400 });
    }
    if (code === "STAFF_NOT_FOUND") {
      return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
    }
    if (code === "SAME_STAFF") {
      return NextResponse.json(
        { error: "Absente et remplaçante doivent être différentes." },
        { status: 400 },
      );
    }
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    console.error("[POST /api/planning]", error);
    return NextResponse.json({ error: "Erreur création." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const kind = String(raw.kind ?? "");
    const id = String(raw.id ?? "");
    if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

    const a = actor(auth.session);
    const orgId = auth.session.organizationId;

    if (kind === "overtime") {
      const item = await updateStaffOvertime(
        orgId,
        id,
        {
          staffId: raw.staffId != null ? String(raw.staffId) : undefined,
          startAt: raw.startAt != null ? String(raw.startAt) : undefined,
          endAt: raw.endAt != null ? String(raw.endAt) : undefined,
          reason: raw.reason !== undefined ? (raw.reason == null ? null : String(raw.reason)) : undefined,
        },
        a,
      );
      return NextResponse.json(item);
    }

    if (kind === "replacement") {
      const item = await updateStaffReplacement(
        orgId,
        id,
        {
          absentStaffId: raw.absentStaffId != null ? String(raw.absentStaffId) : undefined,
          substituteStaffId: raw.substituteStaffId != null ? String(raw.substituteStaffId) : undefined,
          startAt: raw.startAt != null ? String(raw.startAt) : undefined,
          endAt: raw.endAt != null ? String(raw.endAt) : undefined,
          reason: raw.reason !== undefined ? (raw.reason == null ? null : String(raw.reason)) : undefined,
        },
        a,
      );
      return NextResponse.json(item);
    }

    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_RANGE") {
      return NextResponse.json({ error: "Plage horaire invalide." }, { status: 400 });
    }
    if (code === "STAFF_NOT_FOUND") {
      return NextResponse.json({ error: "Employée introuvable." }, { status: 404 });
    }
    if (code === "SAME_STAFF") {
      return NextResponse.json(
        { error: "Absente et remplaçante doivent être différentes." },
        { status: 400 },
      );
    }
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    console.error("[PATCH /api/planning]", error);
    return NextResponse.json({ error: "Erreur mise à jour." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "agenda");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind") ?? "";
    const id = searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

    const a = actor(auth.session);
    const orgId = auth.session.organizationId;

    if (kind === "closure") await deleteOrganizationClosure(orgId, id, a);
    else if (kind === "overtime") await deleteStaffOvertime(orgId, id, a);
    else if (kind === "replacement") await deactivateStaffReplacement(orgId, id, a);
    else return NextResponse.json({ error: "Type invalide." }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    console.error("[DELETE /api/planning]", error);
    return NextResponse.json({ error: "Erreur suppression." }, { status: 500 });
  }
}
