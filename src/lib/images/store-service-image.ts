import type { OptimizedServiceImages } from "@/lib/images/service-image";
import { getStorageService } from "@/lib/storage";

/** Enregistre les 2 variantes WebP sous le même horodatage ; ne garde pas l’original. */
export async function storeOptimizedServiceImages(
  variants: OptimizedServiceImages,
  organizationId: string,
): Promise<{ imageUrl: string; thumbUrl: string }> {
  const storage = getStorageService();
  const stamp = Date.now();

  const [main, thumb] = await Promise.all([
    storage.put({
      category: "services",
      organizationId,
      filename: variants.main.filename,
      data: variants.main.data,
      contentType: variants.main.contentType,
      stamp,
    }),
    storage.put({
      category: "services",
      organizationId,
      filename: variants.thumb.filename,
      data: variants.thumb.data,
      contentType: variants.thumb.contentType,
      stamp,
    }),
  ]);

  return { imageUrl: main.url, thumbUrl: thumb.url };
}
