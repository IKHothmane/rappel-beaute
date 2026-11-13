import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { platformRoute } from "@/lib/http/route-scope";
import { addEditorialQuestion, linkEditorialQuestion, listEditorialArticles } from "@/lib/db/blog";
import { validateEditorialQuestion } from "@/lib/blog/validation";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { editorialMutationAllowed } from "@/lib/blog/mutation";

export const runtime = "nodejs";
export const POST = platformRoute(async (request: NextRequest) => {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  if (!editorialMutationAllowed(request)) return adminError("Requête refusée.", 403);
  const raw = await request.text();
  if (raw.length > 3000) return adminError("Question trop longue.", 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return adminError("Requête invalide.", 400);
  }
  const issue = validateEditorialQuestion(body?.question, body?.anonymized);
  if (issue) return adminError(issue, 400);
  if (!BLOG_CATEGORIES.some((c) => c.id === body.category))
    return adminError("Thème invalide.", 400);
  try {
    await addEditorialQuestion(body.question, body.category);
    return adminJson({ ok: true }, 201);
  } catch {
    return adminError("Impossible d’enregistrer la question. Vérifiez le stockage éditorial.", 503);
  }
});
export const PATCH = platformRoute(async (request: NextRequest) => {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  if (!editorialMutationAllowed(request)) return adminError("Requête refusée.", 403);
  const raw = await request.text();
  if (raw.length > 1000) return adminError("Requête trop longue.", 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return adminError("Requête invalide.", 400);
  }
  if (
    typeof body?.id !== "string" ||
    body.id.length > 100 ||
    !(body.slug === null || (typeof body.slug === "string" && body.slug.length <= 100))
  )
    return adminError("Référence invalide.", 400);
  try {
    if (body.slug && !(await listEditorialArticles()).some((a) => a.slug === body.slug))
      return adminError("Article introuvable.", 404);
    if (!(await linkEditorialQuestion(body.id, body.slug)))
      return adminError("Question introuvable.", 404);
    return adminJson({ ok: true });
  } catch {
    return adminError("Impossible de relier cette question.", 503);
  }
});
