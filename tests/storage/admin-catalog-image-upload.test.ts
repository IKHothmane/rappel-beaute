import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Catalogues admin (services / ressources) : le type MIME déclaré est normalisé (casse, alias)
 * et les octets doivent correspondre au format annoncé avant tout traitement ou stockage.
 */
const mocks = vi.hoisted(() => ({
  optimize: vi.fn(),
  store: vi.fn(),
  upsertService: vi.fn(),
  upsertResource: vi.fn(),
}));

vi.mock("@/lib/http/route-scope", () => ({ platformRoute: <T,>(h: T) => h }));
vi.mock("@/lib/admin/api-helpers", async () => {
  const { NextResponse } = await import("next/server");
  return {
    adminJson: (data: unknown, status = 200) => NextResponse.json(data, { status }),
    adminError: (message: string, status: number) => NextResponse.json({ error: message }, { status }),
    requireAdmin: async () => ({ ok: true, session: { id: "admin", firstName: "T", lastName: "A" } }),
  };
});
vi.mock("@/lib/images/service-image", async () => {
  const actual = await vi.importActual<typeof import("@/lib/images/service-image")>("@/lib/images/service-image");
  return { ...actual, optimizeServiceImage: mocks.optimize };
});
vi.mock("@/lib/images/store-service-image", () => ({ storeOptimizedServiceImages: mocks.store }));
vi.mock("@/lib/db/service-catalog", () => ({
  SERVICE_NAME_MAX_LENGTH: 120,
  deleteServiceCatalogDefault: vi.fn(),
  listServiceCatalogDefaults: vi.fn(),
  upsertServiceCatalogDefault: mocks.upsertService,
}));
vi.mock("@/lib/db/resource-catalog", () => ({
  deleteResourceCatalogDefault: vi.fn(),
  listResourceCatalogDefaults: vi.fn(),
  upsertResourceCatalogDefault: mocks.upsertResource,
}));

import { POST as postService } from "@/app/api/admin/service-catalog/route";
import { POST as postResource } from "@/app/api/admin/resource-catalog/route";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]);
const SVG = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>");

function upload(url: string, fields: Record<string, string>, bytes: Uint8Array, type: string) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  form.set("image", new File([bytes], "photo.bin", { type }));
  return new NextRequest(`http://localhost${url}`, { method: "POST", body: form });
}
const service = (bytes: Uint8Array, type: string) =>
  postService(upload("/api/admin/service-catalog", { name: "Soin visage" }, bytes, type));
const resource = (bytes: Uint8Array, type: string) =>
  postResource(upload("/api/admin/resource-catalog", { type: "CABINE" }, bytes, type));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.optimize.mockResolvedValue({ main: {}, thumb: {} });
  mocks.store.mockResolvedValue({ imageUrl: "/img/a.webp", thumbUrl: "/img/a-thumb.webp" });
  mocks.upsertService.mockResolvedValue({ name: "Soin visage" });
  mocks.upsertResource.mockResolvedValue({ type: "CABINE" });
});

describe.each([
  ["service-catalog", service],
  ["resource-catalog", resource],
])("POST /api/admin/%s", (_name, send) => {
  it("accepte une image valide, y compris avec un MIME en majuscules ou un alias courant", async () => {
    for (const [bytes, type] of [[PNG, "image/png"], [JPEG, "image/jpeg"], [JPEG, "IMAGE/JPEG"], [JPEG, "image/jpg"], [PNG, " image/png "]] as const) {
      mocks.optimize.mockClear();
      const res = await send(bytes, type);
      expect(res.status, type).toBe(200);
      expect(mocks.optimize).toHaveBeenCalledOnce();
    }
  });

  it("refuse un format hors liste (GIF, SVG, vide) sans optimiser ni stocker", async () => {
    for (const [bytes, type] of [[GIF, "image/gif"], [SVG, "image/svg+xml"], [PNG, ""], [PNG, "application/octet-stream"]] as const) {
      const res = await send(bytes, type);
      expect(res.status, type).toBe(400);
    }
    expect(mocks.optimize).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it("refuse des octets qui ne correspondent pas au format annoncé", async () => {
    const res = await send(GIF, "image/png");
    expect(res.status).toBe(400);
    const res2 = await send(PNG, "image/jpeg");
    expect(res2.status).toBe(400);
    expect(mocks.optimize).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
  });
});
