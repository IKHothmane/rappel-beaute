import { deflateSync } from "zlib";

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

const GLYPHS: Record<string, string[]> = {
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
};

function drawWord(
  width: number,
  height: number,
  word: string,
  scale: number,
  ink: [number, number, number],
  paper: [number, number, number],
) {
  const glyphWidth = 5 * scale;
  const gap = scale;
  const textWidth = word.length * glyphWidth + (word.length - 1) * gap;
  const textHeight = 7 * scale;
  const originX = Math.floor((width - textWidth) / 2);
  const originY = Math.floor((height - textHeight) / 2);
  return (x: number, y: number): [number, number, number] => {
    const gx = x - originX;
    const gy = y - originY;
    if (gx < 0 || gy < 0 || gx >= textWidth || gy >= textHeight) return paper;
    let cursor = 0;
    for (const letter of word) {
      const glyph = GLYPHS[letter];
      if (gx >= cursor && gx < cursor + glyphWidth && glyph) {
        const col = Math.floor((gx - cursor) / scale);
        const row = Math.floor(gy / scale);
        if (glyph[row]?.[col] === "1") return ink;
      }
      cursor += glyphWidth + gap;
    }
    return paper;
  };
}

const PINK: [number, number, number] = [186, 0, 73];
const WHITE: [number, number, number] = [255, 255, 255];

export function applePassImages() {
  const icon = (size: number, scale: number) => rgbPng(size, size, drawWord(size, size, "R", scale, WHITE, PINK));
  const logo = (width: number, height: number, scale: number) =>
    rgbPng(width, height, drawWord(width, height, "RB", scale, WHITE, PINK));
  return {
    "icon.png": icon(29, 2),
    "icon@2x.png": icon(58, 4),
    "icon@3x.png": icon(87, 6),
    "logo.png": logo(160, 50, 4),
    "logo@2x.png": logo(320, 100, 8),
    "logo@3x.png": logo(480, 150, 12),
  };
}
