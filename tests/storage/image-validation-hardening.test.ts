import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { put, getOrg, setBackground } = vi.hoisted(() => ({
  put: vi.fn(),
  getOrg: vi.fn(),
  setBackground: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({ getStorageService: () => ({ put }) }));
vi.mock("@/lib/admin/api-helpers", () => ({
  requireAdmin: vi.fn(async () => ({
    ok: true,
    session: { id: "pu_1", firstName: "Root", lastName: "Admin" },
  })),
  adminError: (message: string, status: number) => Response.json({ error: message }, { status }),
  adminJson: (data: unknown) => Response.json(data),
}));
vi.mock("@/lib/db/admin-organizations", () => ({ getOrganizationById: getOrg }));
vi.mock("@/lib/db/loyalty", () => ({ setLoyaltyCardBackground: setBackground }));
vi.mock("@/lib/http/route-scope", () => ({
  platformRoute: <T>(handler: T) => handler,
  publicRoute: <T>(handler: T) => handler,
}));

import { storeOptimizedServiceImages } from "@/lib/images/store-service-image";
import {
  normalizeImageMime,
  svgRejectionReason,
  validateImageBytes,
  validateLogoUpload,
} from "@/lib/storage/image-upload";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const svg = (body: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

describe("regle SVG : gestionnaires d'evenements uniquement dans les balises", () => {
  it.each([
    ["texte « Online = »", "<text>Online = 5</text>"],
    ["texte avec phrase et apostrophe", "<text>Don't stop. Our online = better</text>"],
    ["valeur de titre", '<g><title>Station = online</title></g>'],
    ["commentaire", "<!-- onclick = nothing --><rect/>"],
    ["CDATA dans style", "<style><![CDATA[ .a { content: 'onload=1' } ]]></style>"],
    ["fin de base64 en data URI", '<image href="data:image/png;base64,QUJD/onAA=" width="1" height="1"/>'],
    ["valeur d'attribut contenant on…=", '<rect data-note="see /onfoo=1 and  online=2"/>'],
    ["attribut usuel", '<g font-family="Arial" stroke-linejoin="round" version="1.1"/>'],
  ])("accepte un SVG légitime : %s", (_label, body) => {
    const buf = svg(body);
    expect(svgRejectionReason(buf)).toBeNull();
    expect(validateLogoUpload("image/svg+xml", buf)).toMatchObject({ ok: true });
  });

  it.each([
    ["onload", '<svg onload="alert(1)"/>'],
    ["onclick espacé", '<circle onclick = "x" r="1"/>'],
    ["ONCLICK en casse mixte", '<circle OnClick="x" r="1"/>'],
    ["sans espace après /", "<svg/onload=alert(1)>"],
    ["valeur non guillemetée", "<rect onmouseover=alert(1) />"],
    ["après un attribut contenant >", '<a title="a>b" onclick="x"><rect/></a>'],
    ["derrière un guillemet isolé", '<a x=a"b onclick=1>t</a>'],
    ["dans une balise fermante", "<g></g onclick=1>"],
    ["référence numérique", '<rect &#111;nclick="x"/>'],
    ["valeur jamais fermée", '<rect x="1 onclick=/>'],
    ["balise multi-ligne", '<rect\n  width="1"\n  onfocus="x"\n/>'],
  ])("rejette toujours un vrai gestionnaire : %s", (_label, body) => {
    const buf = svg(body);
    expect(svgRejectionReason(buf)).not.toBeNull();
    expect(validateLogoUpload("image/svg+xml", buf).ok).toBe(false);
  });

  it("reste linéaire sur une entrée hostile (nombreux « < » sans fermeture)", () => {
    const hostile = svg("<".repeat(200_000) + "a ".repeat(50_000));
    const start = Date.now();
    svgRejectionReason(hostile);
    expect(Date.now() - start).toBeLessThan(2_000);
  });
});

describe("normalisation des MIME images", () => {
  it("ramène les alias au type canonique et refuse vide/inconnu", () => {
    expect(normalizeImageMime("image/jpg")).toBe("image/jpeg");
    expect(normalizeImageMime(" IMAGE/PJPEG ")).toBe("image/jpeg");
    expect(normalizeImageMime("image/x-png")).toBe("image/png");
    expect(normalizeImageMime("")).toBe("");

    expect(validateLogoUpload("image/jpg", JPEG)).toMatchObject({ ok: true, contentType: "image/jpeg", filename: "logo.jpg" });
    expect(validateLogoUpload("image/pjpeg", JPEG)).toMatchObject({ ok: true, contentType: "image/jpeg" });
    expect(validateLogoUpload("image/x-png", PNG)).toMatchObject({ ok: true, contentType: "image/png", filename: "logo.png" });
    expect(validateLogoUpload("", PNG).ok).toBe(false);
    expect(validateLogoUpload("image/bmp", PNG).ok).toBe(false);
    expect(validateLogoUpload("application/octet-stream", PNG).ok).toBe(false);
    // L'alias ne dispense pas du contrôle des octets magiques.
    expect(validateLogoUpload("image/jpg", PNG).ok).toBe(false);
    expect(validateLogoUpload("image/x-png", JPEG).ok).toBe(false);
  });

  it("validateImageBytes applique liste blanche, octets magiques et règles SVG", () => {
    const raster = new Set(["image/png", "image/jpeg", "image/webp"]);
    expect(validateImageBytes("image/jpg", JPEG, raster)).toMatchObject({ ok: true, contentType: "image/jpeg" });
    expect(validateImageBytes("image/png", JPEG, raster).ok).toBe(false);
    expect(validateImageBytes("image/svg+xml", svg("<rect/>"), raster).ok).toBe(false);
    expect(validateImageBytes("", PNG, raster).ok).toBe(false);
    expect(validateImageBytes("image/png", Buffer.alloc(0), raster).ok).toBe(false);
    const withSvg = new Set([...raster, "image/svg+xml"]);
    expect(validateImageBytes("image/svg+xml", svg("<rect/>"), withSvg).ok).toBe(true);
    expect(validateImageBytes("image/svg+xml", svg("<script/>"), withSvg).ok).toBe(false);
  });
});

describe("storeOptimizedServiceImages", () => {
  const variant = (data: Buffer, contentType = "image/webp") => ({
    data,
    contentType: contentType as "image/webp",
    filename: "x.webp",
    bytes: data.length,
  });
  const saved = { ...process.env };

  beforeEach(() => {
    put.mockReset();
    put.mockImplementation(async (input: { filename: string }) => ({ url: `/u/${input.filename}` }));
  });
  afterAll(() => {
    process.env = saved;
  });

  it("stocke deux variantes WebP valides (comportement inchangé)", async () => {
    process.env.S3_BUCKET = "b";
    process.env.S3_ENDPOINT = "https://s3.example.test";
    const res = await storeOptimizedServiceImages({ main: variant(WEBP), thumb: variant(WEBP) }, "org_1", "services");
    expect(put).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ imageUrl: "/u/x.webp", thumbUrl: "/u/x.webp" });
  });

  it("refuse des octets non WebP avant tout stockage objet", async () => {
    process.env.S3_BUCKET = "b";
    process.env.S3_ENDPOINT = "https://s3.example.test";
    await expect(
      storeOptimizedServiceImages({ main: variant(WEBP), thumb: variant(Buffer.from("<html>")) }, "org_1"),
    ).rejects.toThrow(/invalide/);
    expect(put).not.toHaveBeenCalled();
  });

  it("valide aussi le chemin data URI (sans stockage objet)", async () => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
    const ok = await storeOptimizedServiceImages({ main: variant(WEBP), thumb: variant(WEBP) }, "org_1");
    expect(ok.imageUrl.startsWith("data:image/webp;base64,")).toBe(true);
    await expect(
      storeOptimizedServiceImages({ main: variant(PNG), thumb: variant(WEBP) }, "org_1"),
    ).rejects.toThrow(/invalide/);
  });
});

describe("POST /api/admin/organizations/card-background", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    put.mockReset();
    put.mockResolvedValue({ url: "/api/storage/local/loyalty/org_1/bg.png" });
    getOrg.mockReset();
    getOrg.mockResolvedValue({ id: "org_1" });
    setBackground.mockReset();
    setBackground.mockResolvedValue({ cardBackgroundUrl: "ok" });
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
  });
  afterAll(() => {
    process.env = saved;
  });

  async function post(data: Buffer, type: string, name = "bg.png") {
    const { POST } = await import("@/app/api/admin/organizations/card-background/route");
    const form = new FormData();
    form.set("organizationId", "org_1");
    form.set("background", new File([new Uint8Array(data)], name, { type }));
    return (POST as unknown as (r: Request) => Promise<Response>)(
      new Request("http://localhost/api/admin/organizations/card-background", { method: "POST", body: form }),
    );
  }

  it("accepte une image valide et stocke un data URI avec le type canonique", async () => {
    const res = await post(JPEG, "image/jpg", "bg.jpg");
    expect(res.status).toBe(200);
    const [, url] = setBackground.mock.calls[0];
    expect(url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("transmet le type canonique au stockage objet", async () => {
    process.env.S3_BUCKET = "b";
    process.env.S3_ENDPOINT = "https://s3.example.test";
    const res = await post(PNG, "image/x-png");
    expect(res.status).toBe(200);
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ contentType: "image/png" }));
  });

  it("refuse des octets qui ne correspondent pas au type annoncé", async () => {
    for (const [data, type] of [
      [Buffer.from("<html><script>1</script></html>"), "image/png"],
      [PNG, "image/jpeg"],
      [JPEG, "image/webp"],
    ] as const) {
      const res = await post(data, type);
      expect(res.status).toBe(400);
    }
    expect(setBackground).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("refuse SVG, GIF, type vide ou inconnu", async () => {
    for (const type of ["image/svg+xml", "image/gif", "", "application/octet-stream"]) {
      const res = await post(PNG, type);
      expect(res.status).toBe(400);
    }
    expect(setBackground).not.toHaveBeenCalled();
  });
});

describe("GET /api/storage/local/[...key] avec % mal formé", () => {
  let dir: string;
  const previous = process.env.STORAGE_LOCAL_DIR;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rb-storage-pct-"));
    fs.mkdirSync(path.join(dir, "logos", "org1"), { recursive: true });
    fs.writeFileSync(path.join(dir, "logos", "org1", "1_logo.png"), PNG);
    process.env.STORAGE_LOCAL_DIR = dir;
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.STORAGE_LOCAL_DIR;
    else process.env.STORAGE_LOCAL_DIR = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("répond 404 (et non 500) pour un % mal formé, y compris dans le dossier", async () => {
    const { GET } = await import("@/app/api/storage/local/[...key]/route");
    const call = (key: string[]) =>
      (GET as unknown as (r: Request, c: unknown) => Promise<Response>)(new Request("http://localhost/x"), {
        params: Promise.resolve({ key }),
      });
    for (const key of [
      ["logos", "org1", "%E0%A4%A"],
      ["logos", "%", "1_logo.png"],
      ["logos", "org1", "%zz"],
    ]) {
      const res = await call(key);
      expect(res.status).toBe(404);
    }
    // Un segment correctement encodé continue de fonctionner.
    expect((await call(["logos", "org1", "1_logo.png"])).status).toBe(200);
    expect((await call(["logos", "org1", "1%5Flogo.png"])).status).toBe(200);
  });
});
