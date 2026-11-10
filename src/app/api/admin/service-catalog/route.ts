import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  deleteServiceCatalogDefault,
  listServiceCatalogDefaults,
  upsertServiceCatalogDefault,
} from "@/lib/db/service-catalog";
import {
  SERVICE_IMAGE_MAX_UPLOAD_BYTES,
  optimizeServiceImage,
  sniffServiceImage,
} from "@/lib/images/service-image";
import { storeOptimizedServiceImages } from "@/lib/images/store-service-image";
import { SERVICE_NAME_SUGGESTIONS } from "@/lib/services/catalog-names";
import { platformRoute } from "@/lib/http/route-scope";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export const GET = platformRoute(async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const items = await listServiceCatalogDefaults();
    return adminJson({ items });
  } catch (error) {
    console.error("[GET /api/admin/service-catalog]", error);
    return adminError("Impossible de charger le catalogue.", 500);
  }
});

export const POST = platformRoute(async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok || !auth.session) return auth.ok ? adminError("Session invalide.", 401) : auth.response;

  try {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!(SERVICE_NAME_SUGGESTIONS as readonly string[]).includes(name)) {
      return adminError("Nom de service inconnu.", 400);
    }

    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return adminError("Choisissez une image.", 400);
    }
    if (!ALLOWED.has(file.type)) return adminError("Formats autorisés : JPG, PNG et WebP.", 400);
    if (file.size > SERVICE_IMAGE_MAX_UPLOAD_BYTES) {
      return adminError("L'image ne doit pas dépasser 2 Mo.", 400);
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffServiceImage(raw);
    if (!sniffed) return adminError("Fichier image invalide.", 400);

    const optimized = await optimizeServiceImage(raw, sniffed, "catalog");
    const stored = await storeOptimizedServiceImages(optimized, "platform", "services", {
      stableId: name,
    });

    const item = await upsertServiceCatalogDefault(
      name,
      stored.imageUrl,
      `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    );
    return adminJson({ item, thumbUrl: stored.thumbUrl });
  } catch (error) {
    console.error("[POST /api/admin/service-catalog]", error);
    if (error instanceof Error && error.message === "IMAGE_TOO_HEAVY") {
      return adminError(
        "L'image compressée dépasse encore 120 Ko. Utilisez une photo plus légère (idéalement 800×600).",
        400,
      );
    }
    if (error instanceof Error && error.message === "Image trop grande.") {
      return adminError(error.message, 400);
    }
    return adminError("Impossible d'enregistrer l'image.", 500);
  }
});

export const DELETE = platformRoute(async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
    if (!(SERVICE_NAME_SUGGESTIONS as readonly string[]).includes(name)) {
      return adminError("Nom de service inconnu.", 400);
    }
    await deleteServiceCatalogDefault(name);
    return adminJson({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/service-catalog]", error);
    return adminError("Impossible de retirer l'image.", 500);
  }
});
