import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite } from "@/lib/auth/api-guard";
import { getOrganizationLogoUrl, setOrganizationLogoUrl } from "@/lib/db/organization";
import { getStorageService } from "@/lib/storage";
import { validateLogoUpload } from "@/lib/storage/image-upload";
import { tenantRoute } from "@/lib/http/route-scope";

const MAX_BYTES = 2 * 1024 * 1024;

export const GET = tenantRoute(async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "settings");
  if (!auth.ok) return auth.response;
  const logoUrl = await getOrganizationLogoUrl(auth.session.organizationId);
  return NextResponse.json({ logoUrl });
});

export const POST = tenantRoute(async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "settings");
  if (!auth.ok) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choisissez un fichier image." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Le logo ne doit pas dépasser 2 Mo." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    // Type MIME en liste blanche + octets magiques ; extension dérivée du MIME validé.
    const checked = validateLogoUpload(file.type, buf, { maxBytes: MAX_BYTES });
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }
    const stored = await getStorageService().put({
      category: "logos",
      organizationId: auth.session.organizationId,
      filename: checked.filename,
      data: buf,
      contentType: checked.contentType,
    });

    await setOrganizationLogoUrl(auth.session.organizationId, stored.url);
    return NextResponse.json({ ok: true, logoUrl: stored.url });
  } catch (error) {
    console.error("[POST /api/settings/logo]", error);
    return NextResponse.json({ error: "Impossible d'enregistrer le logo." }, { status: 500 });
  }
});
