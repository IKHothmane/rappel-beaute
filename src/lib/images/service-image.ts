/** Optimisation des photos de prestations — 2 variantes WebP, sans original. */

export const SERVICE_IMAGE_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const SERVICE_IMAGE_WIDTH = 800;
export const SERVICE_IMAGE_HEIGHT = 600;
export const SERVICE_IMAGE_CARD_WIDTH = 400;
export const SERVICE_IMAGE_CARD_HEIGHT = 300;
export const SERVICE_IMAGE_QUALITY = 75;
export const SERVICE_IMAGE_MIN_QUALITY = 50;
/** Objectif performance : image principale ≤ 120 Ko. */
export const SERVICE_IMAGE_MAIN_MAX_BYTES = 120 * 1024;
/** Objectif performance : miniature ≤ 50 Ko. */
export const SERVICE_IMAGE_THUMB_MAX_BYTES = 50 * 1024;

export type SniffedImageType = "image/jpeg" | "image/png" | "image/webp";

export type ServiceImageVariant = {
  data: Buffer;
  contentType: "image/webp";
  filename: string;
  bytes: number;
};

export type OptimizedServiceImages = {
  main: ServiceImageVariant;
  thumb: ServiceImageVariant;
};

export function sniffServiceImage(buf: Buffer): SniffedImageType | null {
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

type SharpFactory = typeof import("sharp").default;

async function encodeWebpWithinBudget(
  sharpFactory: SharpFactory,
  input: Buffer,
  width: number,
  height: number,
  maxBytes: number,
): Promise<Buffer> {
  let quality = SERVICE_IMAGE_QUALITY;
  let data = Buffer.alloc(0);

  while (quality >= SERVICE_IMAGE_MIN_QUALITY) {
    data = await sharpFactory(input, { failOn: "none" })
      .rotate()
      .resize(width, height, {
        // inside = pas de recadrage (préserve texte type Hydrafacial / Soin visage)
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 5,
      })
      .toBuffer();

    if (data.length <= maxBytes) return data;
    quality -= 5;
  }

  throw new Error("IMAGE_TOO_HEAVY");
}

/**
 * Génère deux WebP (800×600 + 400×300), sans conserver l’original.
 * Rejette si le poids compressé dépasse les budgets même à qualité minimale.
 */
export async function optimizeServiceImage(
  buf: Buffer,
  _contentType: string,
  filenameBase: "service" | "catalog" = "service",
): Promise<OptimizedServiceImages> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(buf, { failOn: "none" }).metadata();
  if ((meta.width ?? 0) > 8000 || (meta.height ?? 0) > 8000) {
    throw new Error("Image trop grande.");
  }

  const [mainData, thumbData] = await Promise.all([
    encodeWebpWithinBudget(
      sharp,
      buf,
      SERVICE_IMAGE_WIDTH,
      SERVICE_IMAGE_HEIGHT,
      SERVICE_IMAGE_MAIN_MAX_BYTES,
    ),
    encodeWebpWithinBudget(
      sharp,
      buf,
      SERVICE_IMAGE_CARD_WIDTH,
      SERVICE_IMAGE_CARD_HEIGHT,
      SERVICE_IMAGE_THUMB_MAX_BYTES,
    ),
  ]);

  return {
    main: {
      data: mainData,
      contentType: "image/webp",
      filename: `${filenameBase}.webp`,
      bytes: mainData.length,
    },
    thumb: {
      data: thumbData,
      contentType: "image/webp",
      filename: `${filenameBase}-thumb.webp`,
      bytes: thumbData.length,
    },
  };
}
