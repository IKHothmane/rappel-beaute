import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  deleteServiceCatalogDefault,
  listServiceCatalogDefaults,
  upsertServiceCatalogDefault,
} from "@/lib/db/service-catalog";
import { SERVICE_NAME_SUGGESTIONS } from "@/lib/services/catalog-names";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2400;

function sniffImage(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function optimizeImage(buf: Buffer, contentType: string) {
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    return { data, contentType: "image/webp", filename: "catalog.webp" };
  } catch {
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    return { data: buf, contentType, filename: `catalog.${ext}` };
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const items = await listServiceCatalogDefaults();
    return adminJson({ items });
  } catch (error) {
    console.error("[GET /api/admin/service-catalog]", error);
    return adminError("Impossible de charger le catalogue.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
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
    if (file.size > MAX_BYTES) return adminError("L'image ne doit pas dépasser 2 Mo.", 400);

    const raw = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImage(raw);
    if (!sniffed) return adminError("Fichier image invalide.", 400);

    const optimized = await optimizeImage(raw, sniffed);
    const stored = await getStorageService().put({
      category: "services",
      organizationId: "platform",
      filename: optimized.filename,
      data: optimized.data,
      contentType: optimized.contentType,
    });

    const item = await upsertServiceCatalogDefault(
      name,
      stored.url,
      `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    );
    return adminJson({ item });
  } catch (error) {
    console.error("[POST /api/admin/service-catalog]", error);
    return adminError("Impossible d'enregistrer l'image.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
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
}
