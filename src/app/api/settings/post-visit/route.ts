import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  getOrCreatePostVisitSettings,
  updatePostVisitSettings,
} from "@/lib/db/post-visit";
import { parsePostVisitSettingsBody } from "@/lib/validation/post-visit";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;
  try {
    const settings = await getOrCreatePostVisitSettings(auth.session.organizationId);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[GET /api/settings/post-visit]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "settings");
  if (!auth.ok) return auth.response;
  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const parsed = parsePostVisitSettingsBody(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const settings = await updatePostVisitSettings(
      auth.session.organizationId,
      parsed.data,
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[PATCH /api/settings/post-visit]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
