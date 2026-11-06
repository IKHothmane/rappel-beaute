import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  deleteResourceCatalogDefault,
  listResourceCatalogDefaults,
  upsertResourceCatalogDefault,
} from "@/lib/db/resource-catalog";
import {
  SERVICE_IMAGE_MAX_UPLOAD_BYTES,
  optimizeServiceImage,
  sniffServiceImage,
} from "@/lib/images/service-image";
import { storeOptimizedServiceImages } from "@/lib/images/store-service-image";
import { RESOURCE_TYPES, type ResourceType } from "@/types/resource";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseType(raw: unknown): ResourceType | null {
  const value = String(raw ?? "").trim().toUpperCase();
  return (RESOURCE_TYPES as readonly string[]).includes(value) ? (value as ResourceType) : null;
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const items = await listResourceCatalogDefaults();
    return adminJson({ items });
  } catch (error) {
    console.error("[GET /api/admin/resource-catalog]", error);
    return adminError("Impossible de charger le catalogue ressources.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok || !auth.session) return auth.ok ? adminError("Session invalide.", 401) : auth.response;

  try {
    const form = await request.formData();
    const type = parseType(form.get("type"));
    if (!type) return adminError("Type de ressource inconnu.", 400);

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

    const optimized = await optimizeServiceImage(raw, sniffed, "resource");
    const stored = await storeOptimizedServiceImages(optimized, "platform", "resources");

    const item = await upsertResourceCatalogDefault(
      type,
      stored.imageUrl,
      `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    );
    return adminJson({ item, thumbUrl: stored.thumbUrl });
  } catch (error) {
    console.error("[POST /api/admin/resource-catalog]", error);
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
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const type = parseType(new URL(request.url).searchParams.get("type"));
    if (!type) return adminError("Type de ressource inconnu.", 400);
    await deleteResourceCatalogDefault(type);
    return adminJson({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/resource-catalog]", error);
    return adminError("Impossible de retirer l'image.", 500);
  }
}
