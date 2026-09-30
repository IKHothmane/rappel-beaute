import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  createPlatformAdmin,
  getPlatformUsersKpis,
  listOrganizationsForFilter,
  listPlatformWideUsers,
} from "@/lib/db/admin-users";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const [items, kpis, organizations] = await Promise.all([
    listPlatformWideUsers({
      search: sp.get("search") ?? undefined,
      role: sp.get("role") ?? undefined,
      status: sp.get("status") ?? undefined,
      organizationId: sp.get("organizationId") ?? undefined,
      limit: parseInt(sp.get("limit") ?? "200", 10),
    }),
    getPlatformUsersKpis(),
    listOrganizationsForFilter(),
  ]);

  return adminJson({ items, kpis, organizations });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  if (!body) return adminError("Requête invalide.", 400);

  try {
    const user = await createPlatformAdmin(auth.session, {
      email: body.email ?? "",
      password: body.password ?? "",
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
    });
    return adminJson({ user }, 201);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "EMAIL_TAKEN") return adminError("Cet e-mail est déjà utilisé.", 409);
    if (code === "EMAIL_INVALID") return adminError("E-mail invalide.", 400);
    if (code === "PASSWORD_SHORT") {
      return adminError("Le mot de passe doit contenir au moins 8 caractères.", 400);
    }
    if (code === "NAME_REQUIRED") return adminError("Le prénom et le nom sont requis.", 400);
    console.error("[POST /api/admin/users]", e);
    return adminError("Création impossible.", 500);
  }
}
