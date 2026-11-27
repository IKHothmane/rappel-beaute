import { NextResponse, type NextRequest } from "next/server";
import { adminError, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { listProspectsForExport } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { prospectsToCsv } from "@/lib/prospects/csv";
import { logProspectFailure } from "@/lib/prospects/http";
import { parseProspectFilters } from "@/lib/prospects/validation";

export const runtime = "nodejs";

/** Export CSV des prospects filtrés (mêmes paramètres que la liste, sans pagination). */
export const GET = platformRoute(async (request: NextRequest) => {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = parseProspectFilters(request.nextUrl.searchParams);
  if (!parsed.ok) return adminError(parsed.error, 400);
  try {
    const items = await listProspectsForExport(parsed.value);
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(prospectsToCsv(items), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prospects-${day}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logProspectFailure("GET /api/admin/prospects/export.csv", error);
    return adminError("Export impossible.", 500);
  }
});
