import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { storageResponseHeaders } from "@/lib/storage/response-headers";

const CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

describe("storageResponseHeaders", () => {
  it("neutralise le contenu actif d'un SVG ouvert directement", () => {
    const h = storageResponseHeaders("image/svg+xml");
    expect(h["Content-Type"]).toBe("image/svg+xml");
    expect(h["Content-Security-Policy"]).toBe(CSP);
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("applique les mêmes en-têtes par défaut et garde le cache", () => {
    const h = storageResponseHeaders(undefined);
    expect(h["Content-Type"]).toBe("application/octet-stream");
    expect(h["Content-Security-Policy"]).toContain("sandbox");
    expect(h["Cache-Control"]).toContain("must-revalidate");
  });
});

describe("GET /api/storage/local/[...key]", () => {
  let dir: string;
  const previous = process.env.STORAGE_LOCAL_DIR;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rb-storage-"));
    fs.mkdirSync(path.join(dir, "logos", "org1"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "logos", "org1", "1_logo.svg"),
      "<svg xmlns='http://www.w3.org/2000/svg'/>",
    );
    fs.writeFileSync(path.join(dir, "logos", "org1", "1_logo.png"), Buffer.from([0x89, 0x50]));
    process.env.STORAGE_LOCAL_DIR = dir;
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.STORAGE_LOCAL_DIR;
    else process.env.STORAGE_LOCAL_DIR = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("sert les SVG et PNG avec CSP sandbox et nosniff", async () => {
    const { GET } = await import("@/app/api/storage/local/[...key]/route");
    for (const [file, type] of [
      ["1_logo.svg", "image/svg+xml"],
      ["1_logo.png", "image/png"],
    ]) {
      const res = await GET(new Request("http://localhost/x"), {
        params: Promise.resolve({ key: ["logos", "org1", file] }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(type);
      expect(res.headers.get("content-security-policy")).toBe(CSP);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });
});
