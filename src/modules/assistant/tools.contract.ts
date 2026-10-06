/**
 * Contrat des tools de l'assistant, par surface.
 * Le widget public passe par le contrat Intent → Tool
 * (`widget-tool-contract`) : lecture, proposition, mutation.
 * Le modèle ne choisit ni l'institut, ni la cliente, ni les permissions.
 * Une mutation ne crée pas le rendez-vous : elle propose une AssistantAction.
 * Le parcours public n'utilise pas d'OTP : la widgetSession suffit pour proposer.
 */

export const ASSISTANT_SURFACES = [
  "widget_visitor",
  "widget_verified_customer",
  "dashboard",
  "mobile",
] as const;

export type AssistantSurface = (typeof ASSISTANT_SURFACES)[number];

export const SERVER_AUTHORITY_KEYS = [
  "organizationId",
  "customerId",
  "permissions",
  "verified",
] as const;

export type AssistantServerContext = {
  surface: AssistantSurface;
  organizationId: string;
  customerId: string | null;
  verified: boolean;
};

export type AssistantToolEffect = "read" | "propose";

export type AssistantToolName =
  | "list_services"
  | "list_public_products"
  | "list_promotions"
  | "search_availability"
  | "propose_appointment"
  | "list_my_appointments"
  | "propose_reschedule"
  | "propose_cancel"
  | "get_my_loyalty"
  | "get_customers";

type ToolRule = {
  effect: AssistantToolEffect;
  surfaces: readonly AssistantSurface[];
  requiresVerifiedCustomer: boolean;
};

export const ASSISTANT_TOOLS: Record<AssistantToolName, ToolRule> = {
  list_services: {
    effect: "read",
    surfaces: ["widget_visitor", "widget_verified_customer", "dashboard", "mobile"],
    requiresVerifiedCustomer: false,
  },
  list_public_products: {
    effect: "read",
    surfaces: ["widget_visitor", "widget_verified_customer"],
    requiresVerifiedCustomer: false,
  },
  list_promotions: {
    effect: "read",
    surfaces: ["widget_visitor", "widget_verified_customer", "dashboard", "mobile"],
    requiresVerifiedCustomer: false,
  },
  search_availability: {
    effect: "read",
    surfaces: ["widget_visitor", "widget_verified_customer", "dashboard", "mobile"],
    requiresVerifiedCustomer: false,
  },
  propose_appointment: {
    effect: "propose",
    surfaces: ["widget_visitor", "widget_verified_customer", "dashboard", "mobile"],
    requiresVerifiedCustomer: false,
  },
  list_my_appointments: {
    effect: "read",
    surfaces: ["widget_visitor", "widget_verified_customer"],
    requiresVerifiedCustomer: false,
  },
  propose_reschedule: {
    effect: "propose",
    surfaces: ["widget_visitor", "widget_verified_customer"],
    requiresVerifiedCustomer: false,
  },
  propose_cancel: {
    effect: "propose",
    surfaces: ["widget_visitor", "widget_verified_customer"],
    requiresVerifiedCustomer: false,
  },
  get_my_loyalty: {
    effect: "read",
    surfaces: ["widget_verified_customer"],
    requiresVerifiedCustomer: true,
  },
  get_customers: {
    effect: "read",
    surfaces: ["dashboard", "mobile"],
    requiresVerifiedCustomer: false,
  },
};

export type ToolDecision =
  | { allowed: true; effect: AssistantToolEffect }
  | { allowed: false; reason: "unknown_tool" | "surface_denied" | "customer_not_verified" };

export function authorizeAssistantTool(
  tool: string,
  context: AssistantServerContext,
): ToolDecision {
  if (!isAssistantToolName(tool)) return { allowed: false, reason: "unknown_tool" };
  const rule = ASSISTANT_TOOLS[tool];
  if (!rule.surfaces.includes(context.surface)) {
    return { allowed: false, reason: "surface_denied" };
  }
  if (rule.requiresVerifiedCustomer && (!context.verified || !context.customerId)) {
    return { allowed: false, reason: "customer_not_verified" };
  }
  return { allowed: true, effect: rule.effect };
}

export function isAssistantToolName(tool: string): tool is AssistantToolName {
  return Object.prototype.hasOwnProperty.call(ASSISTANT_TOOLS, tool);
}

/** Retire toute autorité que le modèle ou le visiteur tenterait de fournir. */
export function stripClientAuthority(args: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...args };
  for (const key of SERVER_AUTHORITY_KEYS) delete clean[key];
  return clean;
}
