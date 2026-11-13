import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { BLOG_DRAFTS } from "@/lib/blog/articles";
const fakes = vi.hoisted(() => ({
  auth: vi.fn(),
  save: vi.fn(),
  list: vi.fn(),
  questions: vi.fn(),
  add: vi.fn(),
  link: vi.fn(),
}));
vi.mock("@/lib/admin/api-helpers", () => ({
  requireSuperAdmin: fakes.auth,
  adminJson: (data: unknown, status = 200) => NextResponse.json(data, { status }),
  adminError: (error: string, status: number) => NextResponse.json({ error }, { status }),
}));
vi.mock("@/lib/db/blog", () => ({
  listEditorialArticles: fakes.list,
  listEditorialQuestions: fakes.questions,
  saveEditorialArticle: fakes.save,
  addEditorialQuestion: fakes.add,
  linkEditorialQuestion: fakes.link,
}));
import { GET, PUT } from "@/app/api/admin/blog/route";
import { POST, PATCH } from "@/app/api/admin/blog/questions/route";
function request(method: string, body: unknown, extra: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/blog/", {
    method,
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  fakes.auth.mockResolvedValue({ ok: true, session: { id: "real-reviewer", role: "SUPER_ADMIN" } });
  fakes.list.mockResolvedValue(BLOG_DRAFTS);
  fakes.questions.mockResolvedValue([]);
  fakes.save.mockResolvedValue({ ...BLOG_DRAFTS[0], version: 1 });
  fakes.link.mockResolvedValue(true);
});
describe("Autorisations et validation du blog", () => {
  it.each([401, 403])("refuse toutes les opérations avec un accès %s", async (status) => {
    fakes.auth.mockImplementation(async () => ({
      ok: false,
      response: NextResponse.json({ error: "refusé" }, { status }),
    }));
    expect((await GET(request("GET", undefined))).status).toBe(status);
    expect((await PUT(request("PUT", {}))).status).toBe(status);
    expect((await POST(request("POST", {}))).status).toBe(status);
    expect((await PATCH(request("PATCH", {}))).status).toBe(status);
    expect(fakes.save).not.toHaveBeenCalled();
    expect(fakes.list).not.toHaveBeenCalled();
    expect(fakes.add).not.toHaveBeenCalled();
  });
  it("exige une relecture explicite pour publier", async () => {
    const response = await PUT(
      request("PUT", { content: BLOG_DRAFTS[0], status: "published", version: 0 }),
    );
    expect(response.status).toBe(400);
    expect(fakes.save).not.toHaveBeenCalled();
  });
  it("utilise l’identité authentifiée et ignore les attributs de publication fournis dans le contenu", async () => {
    const response = await PUT(
      request("PUT", {
        content: {
          ...BLOG_DRAFTS[0],
          reviewedBy: "fake",
          publishedAt: "2027-01-01",
          author: "fake",
        },
        status: "published",
        version: 0,
        reviewed: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(fakes.save.mock.calls[0][0]).not.toHaveProperty("reviewedBy");
    expect(fakes.save.mock.calls[0][0]).not.toHaveProperty("publishedAt");
    expect(fakes.save.mock.calls[0][3]).toBe("real-reviewer");
  });
  it("enregistre un brouillon incomplet sans le publier", async () => {
    expect(
      (
        await PUT(
          request("PUT", {
            content: { ...BLOG_DRAFTS[0], sections: [], answer: "", faqs: [], description: "" },
            status: "draft",
            version: 0,
          }),
        )
      ).status,
    ).toBe(200);
    expect(fakes.save.mock.calls[0][1]).toBe("draft");
  });
  it("signale les éditions concurrentes au lieu d’écraser", async () => {
    fakes.save.mockResolvedValue(null);
    expect(
      (await PUT(request("PUT", { content: BLOG_DRAFTS[0], status: "draft", version: 2 }))).status,
    ).toBe(409);
  });
  it("rejette les requêtes cross-site et les corps invalides", async () => {
    expect((await PUT(request("PUT", {}, { origin: "https://example.invalid" }))).status).toBe(403);
    expect((await PUT(request("PUT", {}, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await PUT(request("PUT", null))).status).toBe(400);
    expect(
      (
        await POST(
          request("POST", {
            question: "Contact : personne@example.com",
            category: "stock",
            anonymized: true,
          }),
        )
      ).status,
    ).toBe(400);
    expect(fakes.add).not.toHaveBeenCalled();
  });
  it("enregistre les questions générales sans copier d’identité cliente", async () => {
    expect(
      (
        await POST(
          request("POST", {
            question: "Comment organiser les livraisons de produits ?",
            category: "stock",
            anonymized: true,
            customerId: "ignored",
          }),
        )
      ).status,
    ).toBe(201);
    expect(fakes.add).toHaveBeenCalledWith(
      "Comment organiser les livraisons de produits ?",
      "stock",
    );
  });
  it("ne rattache pas une question à un article inexistant", async () => {
    expect((await PATCH(request("PATCH", { id: "question", slug: "inconnu" }))).status).toBe(404);
    expect(fakes.link).not.toHaveBeenCalled();
  });
  it("retourne une indisponibilité claire sans exposer l’erreur SQL", async () => {
    fakes.list.mockRejectedValue(new Error("postgres password private"));
    const response = await GET(request("GET", undefined));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
});
