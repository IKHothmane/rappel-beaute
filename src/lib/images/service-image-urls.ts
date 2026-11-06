/**
 * Helpers d’URL côté client (sans Sharp).
 * Convention : `…_catalog.webp` + `…_catalog-thumb.webp` (même horodatage).
 */

export function serviceImageUrls(imageUrl: string): { main: string; thumb: string } {
  const main = imageUrl.replace(/-thumb\.(webp|png|jpe?g)(\?.*)?$/i, ".$1$2");
  if (/-thumb\.(webp|png|jpe?g)(\?.*)?$/i.test(imageUrl)) {
    return { main, thumb: imageUrl };
  }
  const thumb = imageUrl.replace(/\.(webp|png|jpe?g)(\?.*)?$/i, "-thumb.$1$2");
  return { main, thumb };
}
