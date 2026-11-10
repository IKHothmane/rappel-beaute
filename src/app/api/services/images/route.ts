import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite } from "@/lib/auth/api-guard";
import {
  SERVICE_IMAGE_MAX_UPLOAD_BYTES,
  optimizeServiceImage,
  sniffServiceImage,
} from "@/lib/images/service-image";
import { storeOptimizedServiceImages } from "@/lib/images/store-service-image";
import { tenantRoute } from "@/lib/http/route-scope";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function optimizeErrorMessage(error: unknown): { message: string; status: number } {
  if (!(error instanceof Error)) {
    return { message: "Impossible d'enregistrer l'image.", status: 500 };
  }
  if (error.message === "Image trop grande.") {
    return { message: error.message, status: 400 };
  }
  if (error.message === "IMAGE_TOO_HEAVY") {
    return {
      message:
        "L'image compressée dépasse encore 120 Ko. Utilisez une photo plus légère (idéalement 800×600).",
      status: 400,
    };
  }
  return { message: "Impossible d'enregistrer l'image.", status: 500 };
}

export const POST = tenantRoute(async function POST(request: NextRequest) {
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
    if (file.size > SERVICE_IMAGE_MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 2 Mo." }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffServiceImage(raw);
    if (!sniffed) {
      return NextResponse.json({ error: "Fichier image invalide." }, { status: 400 });
    }

    const optimized = await optimizeServiceImage(raw, sniffed, "service");
    const stored = await storeOptimizedServiceImages(optimized, auth.session.organizationId);

    return NextResponse.json({
      ok: true,
      imageUrl: stored.imageUrl,
      thumbUrl: stored.thumbUrl,
    });
  } catch (error) {
    console.error("[POST /api/services/images]", error);
    const { message, status } = optimizeErrorMessage(error);
    return NextResponse.json({ error: message }, { status });
  }
});
