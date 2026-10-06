import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite } from "@/lib/auth/api-guard";
import { getOrganizationWebsite, setOrganizationWebsite } from "@/lib/db/organization";

function normalizeWebsite(raw: string): string | null | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "Site web invalide." };
    }
    if (url.hostname.length < 3 || !url.hostname.includes(".")) {
      return { error: "Site web invalide." };
    }
    return url.toString();
  } catch {
    return { error: "Site web invalide." };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;
  const website = await getOrganizationWebsite(auth.session.organizationId);
  return NextResponse.json({ website });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "settings");
  if (!auth.ok) return auth.response;

  let body: { website?: unknown };
  try {
    body = (await request.json()) as { website?: unknown };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (typeof body.website !== "string") {
    return NextResponse.json({ error: "Indiquez l'adresse du site." }, { status: 400 });
  }
  if (body.website.trim().length > 200) {
    return NextResponse.json({ error: "L'adresse est trop longue." }, { status: 400 });
  }

  const website = normalizeWebsite(body.website);
  if (website && typeof website === "object") {
    return NextResponse.json({ error: website.error }, { status: 400 });
  }

  await setOrganizationWebsite(auth.session.organizationId, website);
  return NextResponse.json({ website });
}
