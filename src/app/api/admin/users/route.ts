import type { NextRequest } from "next/server";
import { adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
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
