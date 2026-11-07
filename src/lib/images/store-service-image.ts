import type { OptimizedServiceImages } from "@/lib/images/service-image";
import { getStorageService, type StorageCategory } from "@/lib/storage";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

function toDataUri(contentType: string, data: Buffer): string {
  return `data:${contentType};base64,${data.toString("base64")}`;
}

function hasObjectStorage(): boolean {
  return Boolean(process.env.S3_BUCKET?.trim() && process.env.S3_ENDPOINT?.trim());
}

/**
 * Enregistre les 2 variantes WebP.
 * Avec S3/R2 → URLs objet. Sinon → data URI (évite les 404 prod quand
 * la DB distante pointe vers /api/storage/local sans fichiers sur Railway).
 */
export async function storeOptimizedServiceImages(
  variants: OptimizedServiceImages,
  organizationId: string,
  category: StorageCategory = "services",
  opts?: { stableId?: string },
): Promise<{ imageUrl: string; thumbUrl: string }> {
  if (!hasObjectStorage()) {
    return {
      imageUrl: toDataUri(variants.main.contentType, variants.main.data),
      thumbUrl: toDataUri(variants.thumb.contentType, variants.thumb.data),
    };
  }

  const storage = getStorageService();
  const stamp = Date.now();
  const slug = opts?.stableId ? slugify(opts.stableId) : null;
  const base = slug ? `catalog__${slug}` : null;

  const [main, thumb] = await Promise.all([
    storage.put({
      category,
      organizationId,
      filename: variants.main.filename,
      data: variants.main.data,
      contentType: variants.main.contentType,
      stamp,
      fixedKey: base ? `${base}.webp` : undefined,
    }),
    storage.put({
      category,
      organizationId,
      filename: variants.thumb.filename,
      data: variants.thumb.data,
      contentType: variants.thumb.contentType,
      stamp,
      fixedKey: base ? `${base}-thumb.webp` : undefined,
    }),
  ]);

  return { imageUrl: main.url, thumbUrl: thumb.url };
}
