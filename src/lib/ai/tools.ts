import {
  getAIMarketingAnalytics,
  getAnalyticsOverview,
  getAppointmentAnalytics,
  getCustomerAnalytics,
  getInventoryAnalytics,
  getLoyaltyAnalytics,
  getMarketingAnalytics,
  getPostVisitAnalyticsSummary,
  getRevenueAnalytics,
  getReviewAnalytics,
  getServiceAnalytics,
  getStaffAnalytics,
} from "@/lib/db/analytics";
import { listCustomers } from "@/lib/db/customers";
import { listServices } from "@/lib/db/services";
import { canUseAITool } from "@/lib/ai/permissions";
import { resolvePreset, type AnalyticsPeriodPreset } from "@/lib/analytics/period";
import type { AIRequestContext, AIToolName, AIToolResult } from "@/types/ai";
import type { AnalyticsFilters } from "@/types/analytics";

function defaultFilters(preset: AnalyticsPeriodPreset = "month"): AnalyticsFilters {
  return {
    period: resolvePreset(preset),
    compare: true,
    staffId: null,
    serviceId: null,
    resourceId: null,
  };
}

function deny(tool: AIToolName, message: string): AIToolResult {
  return { ok: false, tool, error: message };
}

/**
 * Exécute un tool IA via les services métier — jamais SQL direct depuis le LLM.
 * organizationId vient exclusivement du contexte session.
 */
export async function executeAITool(
  ctx: AIRequestContext,
  tool: AIToolName,
  args: Record<string, unknown> = {},
): Promise<AIToolResult> {
  if (!canUseAITool(ctx.role, tool)) {
    return deny(
      tool,
      tool === "getRevenue" || tool === "getDashboard"
        ? "Vous n'avez pas accès aux données financières globales."
        : "Outil non autorisé pour votre rôle.",
    );
  }

  const periodRaw = typeof args.period === "string" ? args.period : "month";
  const period = (
    ["today", "week", "month", "prev_month", "year"].includes(periodRaw)
      ? periodRaw
      : "month"
  ) as AnalyticsPeriodPreset;
  const filters = defaultFilters(period);
  const orgId = ctx.organizationId;

  try {
    switch (tool) {
      case "getRevenue": {
        const data = await getRevenueAnalytics(orgId, filters);
        return { ok: true, tool, data };
      }
      case "getDashboard": {
        const data = await getAnalyticsOverview(orgId, filters);
        return { ok: true, tool, data };
      }
      case "getCustomers":
      case "getCustomerStats": {
        const data = await getCustomerAnalytics(orgId, filters);
        return { ok: true, tool, data };
      }
      case "getAppointments": {
        const data = await getAppointmentAnalytics(orgId, filters);
        return { ok: true, tool, data };
      }
      case "getStaffPerformance": {
        const data = await getStaffAnalytics(orgId, filters);
        return { ok: true, tool, data };
      }
      case "getInventory": {
        const data = await getInventoryAnalytics(orgId, filters);
        return { ok: true, tool, data };
      }
      case "getMarketingStats": {
        const [campaigns, postVisit, aiMarketing] = await Promise.all([
          getMarketingAnalytics(orgId, filters),
          getPostVisitAnalyticsSummary(orgId, filters),
          getAIMarketingAnalytics(orgId, filters),
        ]);
        return { ok: true, tool, data: { campaigns, postVisit, aiMarketing } };
      }
      case "getLoyaltyStats": {
        const data = await getLoyaltyAnalytics(orgId, filters);
        return { ok: true, tool, data };
      }
      case "getReviewStats": {
        const data = await getReviewAnalytics(orgId, filters);
        return { ok: true, tool, data };
      }
      case "searchCustomers": {
        const q = String(args.q ?? args.query ?? "").trim();
        if (q.length < 2) {
          return deny(tool, "Requête trop courte (min. 2 caractères).");
        }
        const list = await listCustomers(orgId, { page: 1, limit: 10, search: q });
        return {
          ok: true,
          tool,
          data: {
            items: list.items.map((c) => ({
              id: c.id,
              name: `${c.firstName} ${c.lastName}`.trim(),
              phone: c.phone,
              status: c.status,
            })),
            total: list.total,
          },
        };
      }
      case "searchServices": {
        const q = String(args.q ?? args.query ?? "").trim();
        const list = await listServices(orgId, {
          page: 1,
          limit: 20,
          search: q || undefined,
          active: true,
        });
        return {
          ok: true,
          tool,
          data: {
            items: list.items.map((s) => ({
              id: s.id,
              name: s.name,
              price: s.price,
              durationMin: s.durationMin,
              active: s.active,
            })),
            total: list.total,
          },
        };
      }
      default:
        return deny(tool, "Outil inconnu.");
    }
  } catch (e) {
    console.error(`[executeAITool] ${tool}`, e);
    return deny(tool, "Erreur lors de la lecture des données.");
  }
}

/** Heuristique simple pour choisir des tools à partir d'une question FR */
export function inferToolsFromQuestion(question: string): AIToolName[] {
  const q = question.toLowerCase();
  const tools: AIToolName[] = [];

  if (/ca\b|chiffre|revenu|recette|panier|paiement|r[eé]alis[eé]/.test(q)) {
    tools.push("getRevenue", "getDashboard");
  }
  if (/cliente|client\b|inactiv|relanc|vip|60\s*jours/.test(q)) {
    tools.push("getCustomers");
  }
  if (/rdv|rendez|no-?show|occupation|cr[eé]neau/.test(q)) {
    tools.push("getAppointments");
  }
  if (/service|hydrafacial|prestation/.test(q)) {
    tools.push("getDashboard");
    // service analytics via getDashboard overview; also run staff for demand
  }
  if (/stock|rupture|produit|inventaire/.test(q)) {
    tools.push("getInventory");
  }
  if (/employ|staff|performance|book[eé]/.test(q)) {
    tools.push("getStaffPerformance");
  }
  if (/marketing|campagne/.test(q)) {
    tools.push("getMarketingStats");
  }
  if (/fid[eé]lit|loyalty|forfait/.test(q)) {
    tools.push("getLoyaltyStats");
  }
  if (/avis|review|satisfaction/.test(q)) {
    tools.push("getReviewStats");
  }
  if (/cherche|trouver|recherche/.test(q) && /cliente|client/.test(q)) {
    tools.push("searchCustomers");
  }

  if (tools.length === 0) tools.push("getDashboard");
  return Array.from(new Set(tools));
}

export function summarizeToolResults(results: AIToolResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    if (!r.ok) {
      lines.push(`• ${r.tool}: ${r.error}`);
      continue;
    }
    lines.push(`• ${r.tool}: ${JSON.stringify(r.data).slice(0, 1200)}`);
  }
  return lines.join("\n");
}

/** Expose getServiceAnalytics pour insights dashboard (interne) */
export async function loadTopServiceShare(
  organizationId: string,
  preset: AnalyticsPeriodPreset = "month",
) {
  const rows = await getServiceAnalytics(organizationId, defaultFilters(preset));
  const total = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const top = rows[0];
  if (!top || total <= 0) {
    return { name: null as string | null, share: null as number | null };
  }
  return {
    name: top.serviceName,
    share: Math.round((top.revenue / total) * 1000) / 10,
  };
}

export function inferPeriodFromQuestion(question: string): AnalyticsPeriodPreset {
  const q = question.toLowerCase();
  if (/aujourd|today/.test(q)) return "today";
  if (/semaine|week/.test(q)) return "week";
  if (/ann[eé]e|year/.test(q)) return "year";
  return "month";
}
