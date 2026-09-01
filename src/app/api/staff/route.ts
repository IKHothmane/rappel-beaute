import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createStaff, listStaff } from "@/lib/db/staff";
import { parseStaffListQuery, validateCreateStaff } from "@/lib/validation/staff";
import { enforceCreateStaff } from "@/lib/subscriptions/guards";
import type { StaffStatus } from "@/types/staff";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "staff");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, status, serviceId, agenda } = parseStaffListQuery(searchParams);

    const { items, total } = await listStaff(auth.session.organizationId, {
      page,
      limit,
      search: search || undefined,
      status: status as StaffStatus | null,
      serviceId,
      agenda,
    });

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[GET /api/staff]", error);
    return NextResponse.json(
      { error: "Impossible de charger les employées." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "staff");
  if (!auth.ok) return auth.response;

  const limitAuth = await enforceCreateStaff(request);
  if (!limitAuth.ok) return limitAuth.response;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const validated = validateCreateStaff(raw);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Données invalides.", details: validated.errors },
        { status: 400 },
      );
    }

    const staff = await createStaff(auth.session.organizationId, validated.data);
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error("[POST /api/staff]", error);
    return NextResponse.json(
      { error: "Impossible de créer l'employée." },
      { status: 500 },
    );
  }
}
