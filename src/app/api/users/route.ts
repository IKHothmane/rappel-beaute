import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { listUsersByOrganization } from "@/lib/db/users";

/** Utilisateurs de l'institut — organizationId depuis la session uniquement */
export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;

  try {
    const items = await listUsersByOrganization(auth.session.organizationId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Impossible de charger les utilisateurs." }, { status: 500 });
  }
}
