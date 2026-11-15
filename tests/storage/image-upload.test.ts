import { describe, expect, it } from "vitest";
import {
  extensionForMime,
  matchesRasterSignature,
  svgRejectionReason,
  validateLogoUpload,
} from "@/lib/storage/image-upload";
import { safeStorageFilename } from "@/lib/storage/local";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const GIF = Buffer.from("GIF89a\u0001\u0000\u0001\u0000", "latin1");
const svg = (body: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

describe("validateLogoUpload", () => {
  it("accepte png/jpeg/webp valides avec extension dérivée du MIME", () => {
    expect(validateLogoUpload("image/png", PNG)).toMatchObject({ ok: true, filename: "logo.png" });
    expect(validateLogoUpload("image/jpeg", JPEG)).toMatchObject({ ok: true, filename: "logo.jpg" });
    expect(validateLogoUpload("image/webp", WEBP)).toMatchObject({ ok: true, filename: "logo.webp" });
  });

  it("refuse un contenu dont les octets magiques ne correspondent pas", () => {
    expect(validateLogoUpload("image/png", JPEG).ok).toBe(false);
    expect(validateLogoUpload("image/jpeg", Buffer.from("<html>"))).toMatchObject({ ok: false });
    expect(validateLogoUpload("image/webp", PNG).ok).toBe(false);
  });

  it("refuse un type hors liste blanche (y compris gif non proposé)", () => {
    expect(validateLogoUpload("text/html", Buffer.from("<html>")).ok).toBe(false);
    expect(validateLogoUpload("image/gif", GIF).ok).toBe(false);
    expect(validateLogoUpload("", PNG).ok).toBe(false);
  });

  it("refuse un fichier vide ou trop gros", () => {
    expect(validateLogoUpload("image/png", Buffer.alloc(0)).ok).toBe(false);
    expect(validateLogoUpload("image/png", PNG, { maxBytes: 4 }).ok).toBe(false);
  });

  it("accepte un SVG inerte", () => {
    const res = validateLogoUpload("image/svg+xml", svg('<circle cx="5" cy="5" r="4" fill="#c00"/>'));
    expect(res).toMatchObject({ ok: true, filename: "logo.svg" });
  });
});

describe("SVG actif refusé", () => {
  it.each([
    ["script", "<script>alert(1)</script>"],
    ["script en casse mixte", "<ScRiPt>alert(1)</ScRiPt>"],
    ["gestionnaire on*", '<circle onload="alert(1)" r="1"/>'],
    ["gestionnaire espacé", '<circle onclick = "x" r="1"/>'],
    ["javascript:", '<a href="javascript:alert(1)"><rect/></a>'],
    ["javascript: encodé", '<a href="&#106;avascript:alert(1)"><rect/></a>'],
    ["javascript: avec tabulation", '<a href="java&#x09;script:alert(1)"><rect/></a>'],
    ["foreignObject", "<foreignObject><div/></foreignObject>"],
    ["iframe", "<iframe src='x'/>"],
  ])("%s", (_label, body) => {
    const buf = svg(body);
    expect(svgRejectionReason(buf)).not.toBeNull();
    expect(validateLogoUpload("image/svg+xml", buf).ok).toBe(false);
  });

  it("entité XML", () => {
    const buf = Buffer.from('<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(svgRejectionReason(buf)).not.toBeNull();
  });

  it("refuse un contenu non SVG ou non UTF-8", () => {
    expect(svgRejectionReason(Buffer.from("<html></html>"))).not.toBeNull();
    expect(svgRejectionReason(Buffer.from([0x3c, 0x00, 0x73, 0x00]))).not.toBeNull();
  });

  it("n'a pas de faux positif sur des attributs SVG usuels", () => {
    const ok = svg('<g font-family="Arial" stroke-linejoin="round" version="1.1"><path d="M0 0"/></g>');
    expect(svgRejectionReason(ok)).toBeNull();
  });
});

describe("extension dérivée du MIME", () => {
  it("n'utilise que la liste blanche", () => {
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/svg+xml")).toBe("svg");
    expect(extensionForMime("text/html")).toBeNull();
    expect(extensionForMime("constructor")).toBeNull();
    expect(extensionForMime("__proto__")).toBeNull();
  });

  it("matchesRasterSignature reconnaît gif", () => {
    expect(matchesRasterSignature("image/gif", GIF)).toBe(true);
  });

  it("le stockage local ignore l'extension client pour un MIME image", () => {
    expect(safeStorageFilename("evil.svg", "image/png")).toBe("evil.png");
    expect(safeStorageFilename("logo.html", "image/jpeg")).toBe("logo.jpg");
    expect(safeStorageFilename("noext", "image/webp")).toBe("noext.webp");
    expect(safeStorageFilename("a b/../c.svg", "image/png")).toBe("a_b_.._c.png");
  });

  it("conserve le comportement pour les types non image", () => {
    expect(safeStorageFilename("rapport 1.csv", "text/csv")).toBe("rapport_1.csv");
  });
});
