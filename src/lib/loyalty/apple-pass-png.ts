import { readFileSync } from "fs";
import { deflateSync, inflateSync } from "zlib";

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Buffer) {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

/** PNG RVB opaque. Apple refuse une icône transparente. */
export function rgbPng(width: number, height: number, paint: (x: number, y: number) => [number, number, number]) {
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y);
      const i = 1 + x * 3;
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

type Rgb = [number, number, number];

type Raster = { width: number; height: number; rgb: Uint8Array };

const WHITE: Rgb = [255, 255, 255];
/** Le R du logo, sans le texte, pour l'icône 29 pt. */
const EMBLEM = { x: 128, y: 2, width: 220, height: 168 };

function paeth(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const dl = Math.abs(estimate - left);
  const du = Math.abs(estimate - up);
  const dlu = Math.abs(estimate - upLeft);
  if (dl <= du && dl <= dlu) return left;
  return du <= dlu ? up : upLeft;
}

/** PNG indexé de public/brand/logo.png, aplati sur blanc. Apple refuse une icône transparente. */
function decodeBrandLogo(buffer: Buffer): Raster {
  let offset = 8;
  const parts: Record<string, Buffer[]> = {};
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString();
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    (parts[type] ??= []).push(data);
    offset += 12 + length;
    if (type === "IEND") break;
  }
  const ihdr = Buffer.concat(parts.IHDR ?? []);
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  if (ihdr[8] !== 8 || ihdr[9] !== 3) throw new Error("APPLE_LOGO_PNG");
  const palette = Buffer.concat(parts.PLTE ?? []);
  const alpha = Buffer.concat(parts.tRNS ?? []);
  const raw = inflateSync(Buffer.concat(parts.IDAT ?? []));
  const rgb = new Uint8Array(width * height * 3);
  let cursor = 0;
  const prior = new Uint8Array(width);
  const row = new Uint8Array(width);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    for (let x = 0; x < width; x += 1) {
      const left = x > 0 ? row[x - 1] : 0;
      const up = prior[x] ?? 0;
      const upLeft = x > 0 ? (prior[x - 1] ?? 0) : 0;
      let value = raw[cursor] ?? 0;
      cursor += 1;
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (value + paeth(left, up, upLeft)) & 255;
      row[x] = value;
      const color = value * 3;
      const cover = alpha[value] ?? 255;
      const i = (y * width + x) * 3;
      rgb[i] = Math.round(((palette[color] ?? 0) * cover + WHITE[0] * (255 - cover)) / 255);
      rgb[i + 1] = Math.round(((palette[color + 1] ?? 0) * cover + WHITE[1] * (255 - cover)) / 255);
      rgb[i + 2] = Math.round(((palette[color + 2] ?? 0) * cover + WHITE[2] * (255 - cover)) / 255);
    }
    prior.set(row);
  }
  return { width, height, rgb };
}

function sample(
  source: Raster,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  width: number,
  height: number,
  x: number,
  y: number,
): Rgb {
  const x0 = cropX + Math.floor((x * cropWidth) / width);
  const x1 = cropX + Math.max(Math.floor((x * cropWidth) / width) + 1, Math.floor(((x + 1) * cropWidth) / width));
  const y0 = cropY + Math.floor((y * cropHeight) / height);
  const y1 = cropY + Math.max(Math.floor((y * cropHeight) / height) + 1, Math.floor(((y + 1) * cropHeight) / height));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let py = y0; py < y1 && py < source.height; py += 1) {
    for (let px = x0; px < x1 && px < source.width; px += 1) {
      const i = (py * source.width + px) * 3;
      red += source.rgb[i] ?? 0;
      green += source.rgb[i + 1] ?? 0;
      blue += source.rgb[i + 2] ?? 0;
      count += 1;
    }
  }
  if (!count) return WHITE;
  return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
}

function resize(source: Raster, cropX: number, cropY: number, cropWidth: number, cropHeight: number, width: number, height: number) {
  return rgbPng(width, height, (x, y) => sample(source, cropX, cropY, cropWidth, cropHeight, width, height, x, y));
}

let brand: Raster | null = null;

function brandLogo() {
  if (!brand) brand = decodeBrandLogo(readFileSync("public/brand/logo.png"));
  return brand;
}

function opaqueBounds(source: Raster) {
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const i = (y * source.width + x) * 3;
      const ink = (source.rgb[i] ?? 255) < 250 || (source.rgb[i + 1] ?? 255) < 250 || (source.rgb[i + 2] ?? 255) < 250;
      if (!ink) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Logo et icône du .pkpass, à partir de public/brand/logo.png. */
export function applePassImages() {
  const source = brandLogo();
  const art = opaqueBounds(source);
  const scale = Math.min(160 / art.width, 50 / art.height);
  const logoWidth = Math.max(1, Math.round(art.width * scale));
  const logoHeight = Math.max(1, Math.round(art.height * scale));
  const icon = (size: number) => {
    const fit = Math.min(size / EMBLEM.width, size / EMBLEM.height);
    const width = Math.max(1, EMBLEM.width * fit);
    const height = Math.max(1, EMBLEM.height * fit);
    const ox = (size - width) / 2;
    const oy = (size - height) / 2;
    return rgbPng(size, size, (x, y) => {
      const px = x - ox;
      const py = y - oy;
      if (px < 0 || py < 0 || px >= width || py >= height) return WHITE;
      return sample(
        source,
        EMBLEM.x,
        EMBLEM.y,
        EMBLEM.width,
        EMBLEM.height,
        width,
        height,
        Math.floor(px),
        Math.floor(py),
      );
    });
  };
  const logo = (factor: number) =>
    resize(source, art.x, art.y, art.width, art.height, logoWidth * factor, logoHeight * factor);
  return {
    "icon.png": icon(29),
    "icon@2x.png": icon(58),
    "icon@3x.png": icon(87),
    "logo.png": logo(1),
    "logo@2x.png": logo(2),
    "logo@3x.png": logo(3),
  };
}
