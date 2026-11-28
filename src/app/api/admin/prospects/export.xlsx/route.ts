import { NextResponse, type NextRequest } from "next/server";
import { adminError, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { listProspectsForExport } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { logProspectFailure } from "@/lib/prospects/http";
import { parseProspectFilters } from "@/lib/prospects/validation";
import { prospectsToXlsx } from "@/lib/prospects/xlsx";

export const runtime = "nodejs";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Export .xlsx (Google Sheets, Excel) des prospects filtrés : mêmes paramètres que l'export CSV. */
export const GET = platformRoute(async (request: NextRequest) => {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = parseProspectFilters(request.nextUrl.searchParams);
  if (!parsed.ok) return adminError(parsed.error, 400);
  try {
    const items = await listProspectsForExport(parsed.value);
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(await prospectsToXlsx(items)), {
      status: 200,
      headers: {
        "Content-Type": XLSX_TYPE,
        "Content-Disposition": `attachment; filename="prospects-${day}.xlsx"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logProspectFailure("GET /api/admin/prospects/export.xlsx", error);
    return adminError("Export impossible.", 500);
  }
});
