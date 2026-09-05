import type { NextRequest } from "next/server";
import { adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { listAllOrganizationUsers } from "@/lib/db/admin-organizations";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const items = await listAllOrganizationUsers({
    search: sp.get("search") ?? undefined,
    role: sp.get("role") ?? undefined,
    limit: parseInt(sp.get("limit") ?? "200", 10),
  });
  return adminJson({ items });
}
