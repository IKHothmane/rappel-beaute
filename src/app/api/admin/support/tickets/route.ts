import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  adminCreateSupportTicket,
  adminListSupportTickets,
  adminSupportAnalytics,
  adminSupportAttention,
  adminSupportKpis,
  formatDurationMinutes,
  listOrgsForSupportPicker,
  listPlatformAssignees,
  parseCategory,
  parsePriority,
  parseStatus,
  serializeTicket,
  type AdminSupportFilters,
} from "@/lib/db/support-tickets";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const sp = request.nextUrl.searchParams;
    const att = sp.get("attention");
    const filters: AdminSupportFilters = {
      status: parseStatus(sp.get("status")) ?? undefined,
      priority: parsePriority(sp.get("priority")) ?? undefined,
      category: parseCategory(sp.get("category")) ?? undefined,
      organizationId: sp.get("organizationId") || undefined,
      search: sp.get("q") || undefined,
      attention:
        att === "urgent" || att === "high" || att === "waiting" || att === "stale"
          ? att
          : undefined,
    };

    const [kpis, attention, items, assignees, orgs] = await Promise.all([
      adminSupportKpis(),
      adminSupportAttention(),
      adminListSupportTickets(filters),
      listPlatformAssignees(),
      listOrgsForSupportPicker(),
    ]);

    return adminJson({
      kpis: {
        ...kpis,
        avgFirstResponseLabel: formatDurationMinutes(kpis.avgFirstResponseMinutes),
        avgResolutionLabel: formatDurationMinutes(kpis.avgResolutionMinutes),
      },
      attention,
      assignees,
      orgs,
      items: items.map(serializeTicket),
    });
  } catch (error) {
    console.error("[GET /api/admin/support/tickets]", error);
    return adminError("Impossible de charger les tickets.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      organizationId?: string;
      createdByUserId?: string;
      subject?: string;
      category?: string;
      priority?: string;
      message?: string;
      assignedToPlatformUserId?: string | null;
    };

    const category = parseCategory(body.category);
    const priority = parsePriority(body.priority) ?? "NORMAL";
    if (!body.organizationId || !body.createdByUserId || !category) {
      return adminError("Organisation, utilisateur et catégorie requis.", 400);
    }

    const ticket = await adminCreateSupportTicket({
      organizationId: body.organizationId,
      createdByUserId: body.createdByUserId,
      subject: String(body.subject ?? ""),
      category,
      priority,
      message: String(body.message ?? ""),
      platformUserId: auth.session.id,
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      assignedToPlatformUserId: body.assignedToPlatformUserId,
    });

    return adminJson({ ticket: serializeTicket(ticket) }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_INPUT") return adminError("Champs invalides.", 400);
      if (error.message === "USER_NOT_IN_ORG") {
        return adminError("Utilisateur hors organisation.", 400);
      }
    }
    console.error("[POST /api/admin/support/tickets]", error);
    return adminError("Impossible de créer le ticket.", 500);
  }
}
