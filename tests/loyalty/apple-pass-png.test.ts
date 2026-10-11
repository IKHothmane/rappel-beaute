import { describe, expect, it } from "vitest";
import { applePassImages } from "@/lib/loyalty/apple-pass-png";

function size(png: Buffer) {
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("images Apple Wallet", () => {
  it("place le logo Rappel Beauty dans l'icône et le bandeau", () => {
    const images = applePassImages();
    expect(size(images["icon.png"])).toEqual({ width: 29, height: 29 });
    expect(size(images["icon@2x.png"])).toEqual({ width: 58, height: 58 });
    expect(size(images["icon@3x.png"])).toEqual({ width: 87, height: 87 });
    const logo = size(images["logo.png"]);
    expect(logo.height).toBeLessThanOrEqual(50);
    expect(logo.width).toBeLessThanOrEqual(160);
    expect(logo.width).toBeGreaterThan(40);
    expect(size(images["logo@2x.png"])).toEqual({ width: logo.width * 2, height: logo.height * 2 });
    expect(size(images["logo@3x.png"])).toEqual({ width: logo.width * 3, height: logo.height * 3 });
    expect(images["logo.png"].readUInt8(25)).toBe(2);
  });
});
