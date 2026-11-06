import type { OptimizedServiceImages } from "@/lib/images/service-image";
import { getStorageService, type StorageCategory } from "@/lib/storage";

/** Enregistre les 2 variantes WebP sous le même horodatage ; ne garde pas l’original. */
export async function storeOptimizedServiceImages(
  variants: OptimizedServiceImages,
  organizationId: string,
  category: StorageCategory = "services",
): Promise<{ imageUrl: string; thumbUrl: string }> {
  const storage = getStorageService();
  const stamp = Date.now();

  const [main, thumb] = await Promise.all([
    storage.put({
      category,
      organizationId,
      filename: variants.main.filename,
      data: variants.main.data,
      contentType: variants.main.contentType,
      stamp,
    }),
    storage.put({
      category,
      organizationId,
      filename: variants.thumb.filename,
      data: variants.thumb.data,
      contentType: variants.thumb.contentType,
      stamp,
    }),
  ]);

  return { imageUrl: main.url, thumbUrl: thumb.url };
}
