import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { platformRoute } from "@/lib/http/route-scope";
import { listEditorialArticles, listEditorialQuestions, saveEditorialArticle } from "@/lib/db/blog";
import { validateBlogContent } from "@/lib/blog/validation";
import type { BlogContent } from "@/lib/blog/types";
import { editorialMutationAllowed } from "@/lib/blog/mutation";

export const runtime = "nodejs";
function storageError() {
  return adminError(
    "Le stockage éditorial est indisponible. Vérifiez la connexion et la migration du blog.",
    503,
  );
}
export const GET = platformRoute(async (request: NextRequest) => {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const [articles, questions] = await Promise.all([
      listEditorialArticles(),
      listEditorialQuestions(),
    ]);
    return adminJson({ articles, questions });
  } catch {
    return storageError();
  }
});
export const PUT = platformRoute(async (request: NextRequest) => {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  // Les mutations de ce nouvel éditeur sont réservées aux requêtes JSON de même origine.
  if (!editorialMutationAllowed(request)) return adminError("Requête refusée.", 403);
  const raw = await request.text();
  if (raw.length > 160000) return adminError("Article trop volumineux.", 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return adminError("Requête invalide.", 400);
  }
  const issue = validateBlogContent(body?.content, body?.status === "published");
  if (issue) return adminError(issue, 400);
  if (
    !Number.isInteger(body.version) ||
    body.version < 0 ||
    !["draft", "published"].includes(body.status)
  )
    return adminError("Version ou statut invalide.", 400);
  if (body.status === "published" && body.reviewed !== true)
    return adminError("La relecture humaine doit être confirmée avant publication.", 400);
  const { slug, title, description, category, answer, sections, faqs, links, sources } =
    body.content as BlogContent;
  const content = { slug, title, description, category, answer, sections, faqs, links, sources };
  try {
    const article = await saveEditorialArticle(content, body.status, body.version, auth.session.id);
    if (!article)
      return adminError(
        "Cet article a changé. Rechargez sa dernière version avant d’enregistrer.",
        409,
      );
    return adminJson({ article });
  } catch {
    return storageError();
  }
});
