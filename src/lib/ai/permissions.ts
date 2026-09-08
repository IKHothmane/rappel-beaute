import type { AppFeature, AppRole } from "@/lib/rbac";
import { canReadFeature, getFeatureAccess } from "@/lib/rbac";
import type { AIToolName } from "@/types/ai";

/** Feature métier minimale pour exécuter un tool */
export const AI_TOOL_FEATURE: Record<AIToolName, AppFeature> = {
  getRevenue: "analytics",
  getDashboard: "analytics",
  getCustomers: "customers",
  getCustomerStats: "customers",
  getAppointments: "agenda",
  getStaffPerformance: "analytics",
  getInventory: "stock",
  getMarketingStats: "marketing",
  getLoyaltyStats: "loyalty",
  getReviewStats: "reviews",
  searchCustomers: "customers",
  searchServices: "services",
};

/** Tools finance / CA globaux — refusés pour STAFF même si analytics limited */
const FINANCE_TOOLS: AIToolName[] = ["getRevenue", "getDashboard"];

export function canUseAITool(role: AppRole, tool: AIToolName): boolean {
  const feature = AI_TOOL_FEATURE[tool];
  if (!canReadFeature(role, feature)) return false;

  if (FINANCE_TOOLS.includes(tool)) {
    const level = getFeatureAccess(role, "analytics");
    // STAFF / CASHIER : analytics limited → pas de CA global
    if (role === "STAFF" || role === "CASHIER") return false;
    if (level === "none") return false;
  }

  if (tool === "getInventory" && !canReadFeature(role, "stock")) return false;
  return true;
}

export function listAllowedAITools(role: AppRole): AIToolName[] {
  return (Object.keys(AI_TOOL_FEATURE) as AIToolName[]).filter((t) =>
    canUseAITool(role, t),
  );
}

export const AI_TOOL_DESCRIPTIONS: Record<AIToolName, string> = {
  getRevenue: "CA et paiements sur une période",
  getDashboard: "Vue d'ensemble KPI institut",
  getCustomers: "Statistiques clientes",
  getCustomerStats: "Alias getCustomers",
  getAppointments: "Stats rendez-vous / no-shows",
  getStaffPerformance: "Performance employées",
  getInventory: "Stock, ruptures, consommation",
  getMarketingStats: "Campagnes marketing",
  getLoyaltyStats: "Fidélité / forfaits",
  getReviewStats: "Avis clientes",
  searchCustomers: "Recherche clientes (nom / téléphone)",
  searchServices: "Recherche services",
};
