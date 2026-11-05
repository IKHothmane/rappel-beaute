import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite } from "@/lib/auth/api-guard";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2400;

function sniffImage(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
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

async function optimizeImage(buf: Buffer, contentType: string): Promise<{ data: Buffer; contentType: string; filename: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(buf, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    if ((meta.width ?? 0) > 8000 || (meta.height ?? 0) > 8000) {
      throw new Error("Image trop grande.");
    }
    const data = await image
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    return { data, contentType: "image/webp", filename: "service.webp" };
  } catch (error) {
    if (error instanceof Error && error.message === "Image trop grande.") throw error;
    // Fallback sans sharp : on conserve le fichier d’origine déjà validé.
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    return { data: buf, contentType, filename: `service.${ext}` };
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "services");
  if (!auth.ok) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choisissez une image." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Formats autorisés : JPG, PNG et WebP." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 2 Mo." }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImage(raw);
    if (!sniffed) {
      return NextResponse.json({ error: "Fichier image invalide." }, { status: 400 });
    }

    const optimized = await optimizeImage(raw, sniffed);
    const stored = await getStorageService().put({
      category: "services",
      organizationId: auth.session.organizationId,
      filename: optimized.filename,
      data: optimized.data,
      contentType: optimized.contentType,
    });

    return NextResponse.json({ ok: true, imageUrl: stored.url });
  } catch (error) {
    console.error("[POST /api/services/images]", error);
    const message = error instanceof Error && error.message === "Image trop grande."
      ? error.message
      : "Impossible d'enregistrer l'image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
