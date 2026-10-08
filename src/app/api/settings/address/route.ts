import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite } from "@/lib/auth/api-guard";
import { getOrganizationAddress, setOrganizationAddress } from "@/lib/db/organization";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;
  const address = await getOrganizationAddress(auth.session.organizationId);
  return NextResponse.json({ address });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "settings");
  if (!auth.ok) return auth.response;

  let body: { address?: unknown };
  try {
    body = (await request.json()) as { address?: unknown };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (typeof body.address !== "string") {
    return NextResponse.json({ error: "Indiquez l'adresse." }, { status: 400 });
  }
  const trimmed = body.address.trim();
  if (trimmed.length > 200) {
    return NextResponse.json({ error: "L'adresse est trop longue." }, { status: 400 });
  }

  const address = trimmed || null;
  await setOrganizationAddress(auth.session.organizationId, address);
  return NextResponse.json({ address });
}
