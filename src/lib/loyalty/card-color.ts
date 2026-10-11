import { inflateSync } from "zlib";

const DEFAULT_CARD_COLOR = "#ba0049";

export function loyaltyCardHex(color: string | null | undefined) {
  return /^#[0-9A-Fa-f]{6}$/.test(color || "") ? color!.toLowerCase() : DEFAULT_CARD_COLOR;
}

export function hexToRgb(color: string) {
  const hex = loyaltyCardHex(color).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Couleur dominante d'un PNG, en ignorant les reflets trop clairs et le noir. */
export function cardColorFromImage(data: Buffer, contentType: string): string | null {
  if (contentType !== "image/png" && data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  try {
    return pngCardColor(data);
  } catch {
    return null;
  }
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function pngCardColor(data: Buffer): string | null {
  let offset = 8;
  const idat: Buffer[] = [];
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 0;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
    } else if (type === "IDAT") {
      idat.push(Buffer.from(chunk));
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height || bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) return null;
  const bpp = colorType === 2 ? 3 : 4;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const rows: Buffer[] = [];
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const row = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    const prev = rows[y - 1];
    if (filter === 1) {
      for (let i = 0; i < stride; i += 1) row[i] = (row[i] + (i >= bpp ? row[i - bpp] : 0)) & 255;
    } else if (filter === 2 && prev) {
      for (let i = 0; i < stride; i += 1) row[i] = (row[i] + prev[i]) & 255;
    } else if (filter === 3) {
      for (let i = 0; i < stride; i += 1) {
        const left = i >= bpp ? row[i - bpp] : 0;
        const up = prev ? prev[i] : 0;
        row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
      }
    } else if (filter === 4) {
      for (let i = 0; i < stride; i += 1) {
        const left = i >= bpp ? row[i - bpp] : 0;
        const up = prev ? prev[i] : 0;
        const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
        row[i] = (row[i] + paeth(left, up, upLeft)) & 255;
      }
    }
    rows.push(row);
  }

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const stepX = Math.max(1, Math.floor(width / 48));
  const stepY = Math.max(1, Math.floor(height / 48));
  for (let y = 0; y < height; y += stepY) {
    const row = rows[y];
    for (let x = 0; x < width; x += stepX) {
      const i = x * bpp;
      const r = row[i];
      const g = row[i + 1];
      const b = row[i + 2];
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luminance < 28 || luminance > 185) continue;
      red += r;
      green += g;
      blue += b;
      count += 1;
    }
  }
  if (count < 8) return null;
  const hex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${hex(red / count)}${hex(green / count)}${hex(blue / count)}`;
}
