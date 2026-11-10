import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { getOrganizationById } from "@/lib/db/admin-organizations";
import { setLoyaltyCardBackground } from "@/lib/db/loyalty";
import { cardColorFromImage } from "@/lib/loyalty/card-color";
import { getStorageService } from "@/lib/storage";
import { platformRoute } from "@/lib/http/route-scope";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function actorName(session: { firstName: string; lastName: string }) {
  return `${session.firstName} ${session.lastName}`.trim();
}

export const POST = platformRoute(async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok || !auth.session) return auth.ok ? adminError("Session invalide.", 401) : auth.response;

  try {
    const form = await request.formData();
    const organizationId = String(form.get("organizationId") ?? "");
    if (!organizationId) return adminError("Institut manquant.", 400);
    const org = await getOrganizationById(organizationId);
    if (!org) return adminError("Institut introuvable.", 404);

    const file = form.get("background");
    if (!(file instanceof File) || file.size === 0) return adminError("Choisissez une image.", 400);
    if (!ALLOWED.has(file.type)) return adminError("Formats acceptés : PNG, JPG ou WEBP.", 400);
    if (file.size > MAX_BYTES) return adminError("L'image ne doit pas dépasser 2 Mo.", 400);

    const bytes = Buffer.from(await file.arrayBuffer());
    // Sans stockage objet (S3/R2), un fichier local n'existerait pas sur le serveur de production :
    // l'image est alors conservée directement en base (data URI, 2 Mo max).
    const hasObjectStorage = Boolean(process.env.S3_BUCKET && process.env.S3_ENDPOINT);
    const imageUrl = hasObjectStorage
      ? (
          await getStorageService().put({
            category: "loyalty",
            organizationId,
            filename: file.name || "carte-fond.png",
            data: bytes,
            contentType: file.type,
          })
        ).url
      : `data:${file.type};base64,${bytes.toString("base64")}`;
    const program = await setLoyaltyCardBackground(
      organizationId,
      imageUrl,
      {
        id: auth.session.id,
        name: actorName(auth.session),
      },
      cardColorFromImage(bytes, file.type),
    );
    return adminJson({ cardBackgroundUrl: program.cardBackgroundUrl });
  } catch (error) {
    console.error("[POST admin card-background]", error instanceof Error ? error.message : "upload");
    return adminError("Impossible d'enregistrer l'image.", 500);
  }
});

export const DELETE = platformRoute(async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok || !auth.session) return auth.ok ? adminError("Session invalide.", 401) : auth.response;
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? "";
  if (!organizationId) return adminError("Institut manquant.", 400);
  const org = await getOrganizationById(organizationId);
  if (!org) return adminError("Institut introuvable.", 404);
  await setLoyaltyCardBackground(organizationId, null, {
    id: auth.session.id,
    name: actorName(auth.session),
  });
  return adminJson({ cardBackgroundUrl: null });
});
