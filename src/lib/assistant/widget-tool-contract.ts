/**
 * Contrat Intent → Tool du widget public.
 * Lecture, proposition et mutation sont distinctes.
 * Le modèle peut demander une lecture ou une proposition.
 * Il ne peut pas confirmer : la mutation n'est ouverte que par le serveur,
 * après un oui explicite du visiteur, sur l'action déjà en attente.
 * organizationId, customerId et le personnel ne sont jamais des paramètres.
 */

import { intentFromModel, type VisitorIntent } from "@/lib/assistant/interpret";

export const WIDGET_TOOL_NAMES = [
  "GET_SERVICES",
  "GET_PRODUCTS",
  "GET_PROMOTIONS",
  "GET_AVAILABILITY",
  "FIND_APPOINTMENT",
  "PROPOSE_APPOINTMENT",
  "CONFIRM_APPOINTMENT",
  "PROPOSE_RESCHEDULE",
  "CONFIRM_RESCHEDULE",
  "PROPOSE_CANCEL",
  "CONFIRM_CANCEL",
] as const;

export type WidgetToolName = (typeof WIDGET_TOOL_NAMES)[number];

export type WidgetToolEffect = "read" | "propose" | "mutate";

export const CLIENT_AUTHORITY_ARGS = [
  "organizationId",
  "customerId",
  "employeeId",
  "staffId",
  "appointmentId",
  "price",
  "permissions",
  "verified",
] as const;

type ParamFormat = "date" | "time" | "phone" | "reference" | "name" | "serviceId" | "actionId";

type ParamSpec = { name: string; required: boolean; format: ParamFormat };

type ToolSpec = {
  effect: WidgetToolEffect;
  modelCallable: boolean;
  params: readonly ParamSpec[];
};

const dateParam = (required: boolean): ParamSpec => ({ name: "date", required, format: "date" });
const timeParam = (required: boolean): ParamSpec => ({ name: "time", required, format: "time" });
const phoneParam: ParamSpec = { name: "phone", required: true, format: "phone" };
const referenceParam: ParamSpec = { name: "reference", required: true, format: "reference" };
const serviceParam: ParamSpec = { name: "serviceId", required: true, format: "serviceId" };
const actionParam: ParamSpec = { name: "actionId", required: true, format: "actionId" };

export const WIDGET_TOOLS: Record<WidgetToolName, ToolSpec> = {
  GET_SERVICES: { effect: "read", modelCallable: true, params: [] },
  GET_PRODUCTS: { effect: "read", modelCallable: true, params: [] },
  GET_PROMOTIONS: { effect: "read", modelCallable: true, params: [] },
  GET_AVAILABILITY: {
    effect: "read",
    modelCallable: true,
    params: [serviceParam, dateParam(true), timeParam(false)],
  },
  FIND_APPOINTMENT: { effect: "read", modelCallable: true, params: [referenceParam, phoneParam] },
  PROPOSE_APPOINTMENT: {
    effect: "propose",
    modelCallable: true,
    params: [
      serviceParam,
      dateParam(true),
      timeParam(true),
      { name: "firstName", required: true, format: "name" },
      { name: "lastName", required: true, format: "name" },
      phoneParam,
    ],
  },
  CONFIRM_APPOINTMENT: { effect: "mutate", modelCallable: false, params: [actionParam] },
  PROPOSE_RESCHEDULE: {
    effect: "propose",
    modelCallable: true,
    params: [referenceParam, phoneParam, dateParam(true), timeParam(true)],
  },
  CONFIRM_RESCHEDULE: { effect: "mutate", modelCallable: false, params: [actionParam] },
  PROPOSE_CANCEL: { effect: "propose", modelCallable: true, params: [referenceParam, phoneParam] },
  CONFIRM_CANCEL: { effect: "mutate", modelCallable: false, params: [actionParam] },
};

export type WidgetCallDenial =
  | "unknown_tool"
  | "model_cannot_mutate"
  | "client_authority"
  | "unexpected_argument"
  | "invalid_argument";

export type PreparedWidgetCall =
  | { ok: false; reason: WidgetCallDenial }
  | { ok: true; ready: false; tool: WidgetToolName; effect: WidgetToolEffect; missing: string[] }
  | { ok: true; ready: true; tool: WidgetToolName; effect: WidgetToolEffect; args: Record<string, string> };

export function isWidgetToolName(value: string): value is WidgetToolName {
  return Object.prototype.hasOwnProperty.call(WIDGET_TOOLS, value);
}

export function prepareWidgetToolCall(input: {
  tool: string;
  args?: unknown;
  caller: "model" | "server";
}): PreparedWidgetCall {
  if (!isWidgetToolName(input.tool)) return { ok: false, reason: "unknown_tool" };
  const spec = WIDGET_TOOLS[input.tool];
  if (!spec.modelCallable && input.caller !== "server") {
    return { ok: false, reason: "model_cannot_mutate" };
  }
  const raw = input.args === undefined ? {} : input.args;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "invalid_argument" };
  }
  const record = raw as Record<string, unknown>;
  if (CLIENT_AUTHORITY_ARGS.some((key) => Object.prototype.hasOwnProperty.call(record, key))) {
    return { ok: false, reason: "client_authority" };
  }
  const allowed = new Set(spec.params.map((param) => param.name));
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    return { ok: false, reason: "unexpected_argument" };
  }

  const args: Record<string, string> = {};
  const missing: string[] = [];
  for (const param of spec.params) {
    const value = record[param.name];
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      if (param.required) missing.push(param.name);
      continue;
    }
    if (typeof value !== "string") return { ok: false, reason: "invalid_argument" };
    const normalized = normalizeParam(param.format, value);
    if (!normalized) return { ok: false, reason: "invalid_argument" };
    args[param.name] = normalized;
  }
  if (missing.length) {
    return { ok: true, ready: false, tool: input.tool, effect: spec.effect, missing };
  }
  return { ok: true, ready: true, tool: input.tool, effect: spec.effect, args };
}

const TOOL_TO_INTENT: Partial<Record<WidgetToolName, VisitorIntent["intent"]>> = {
  GET_SERVICES: "services",
  GET_PRODUCTS: "products",
  GET_PROMOTIONS: "promotions",
  GET_AVAILABILITY: "availability",
  FIND_APPOINTMENT: "find",
  PROPOSE_APPOINTMENT: "book",
  PROPOSE_RESCHEDULE: "reschedule",
  PROPOSE_CANCEL: "cancel",
};

export type ModelChoice =
  | { accepted: true; intent: VisitorIntent }
  | { accepted: false; reason: "model_cannot_mutate" };

/** Le modèle ne peut choisir qu'une intention. Une confirmation est refusée avant tout outil. */
export function parseModelChoice(content: string, now: Date): ModelChoice | null {
  const json = content.match(/\{[\s\S]*\}/);
  if (!json) return null;
  let parsed: { intent?: unknown; tool?: unknown; args?: unknown };
  try {
    parsed = JSON.parse(json[0]) as { intent?: unknown; tool?: unknown; args?: unknown };
  } catch {
    return null;
  }
  const named = [parsed.tool, parsed.intent].filter((value): value is string => typeof value === "string");
  if (named.some((value) => isMutatingChoice(value))) return { accepted: false, reason: "model_cannot_mutate" };

  const tool = named.find((value): value is WidgetToolName => isWidgetToolName(value));
  if (tool) {
    const intentName = TOOL_TO_INTENT[tool];
    if (!intentName) return { accepted: false, reason: "model_cannot_mutate" };
    const args = parsed.args && typeof parsed.args === "object" && !Array.isArray(parsed.args)
      ? (parsed.args as Record<string, unknown>)
      : {};
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if ((CLIENT_AUTHORITY_ARGS as readonly string[]).includes(key)) continue;
      if (key === "actionId" || key === "serviceId" || key === "appointmentId") continue;
      safe[key] = value;
    }
    const rewritten = JSON.stringify({ intent: intentName, args: safe });
    const intent = intentFromModel(rewritten, now);
    if (!intent) return null;
    return { accepted: true, intent };
  }

  const intent = intentFromModel(content, now);
  if (!intent) return null;
  return { accepted: true, intent };
}

function isMutatingChoice(value: string): boolean {
  const folded = value.trim().toUpperCase();
  return (
    folded === "CONFIRM" ||
    folded === "EXECUTE" ||
    folded === "MUTATE" ||
    folded.startsWith("CONFIRM_")
  );
}

function normalizeParam(format: ParamFormat, value: string): string | null {
  const text = value.trim();
  if (format === "date") return /^\d{4}-\d{2}-\d{2}$/.test(text) && validDay(text) ? text : null;
  if (format === "time") return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
  if (format === "phone") {
    const digits = text.replace(/\D/g, "");
    const local = digits.startsWith("212") ? `0${digits.slice(3)}` : digits;
    return /^0[5-8]\d{8}$/.test(local) ? local : null;
  }
  if (format === "reference") {
    const normalized = text.replace(/[\s-]/g, "").toUpperCase();
    return /^[A-HJ-NP-Z2-9]{10}$/.test(normalized) ? normalized : null;
  }
  if (format === "name") return /^[\p{L}][\p{L}' -]{0,79}$/u.test(text) ? text : null;
  if (format === "serviceId") return /^[A-Za-z0-9_-]{1,80}$/.test(text) ? text : null;
  if (format === "actionId") return /^aac_[a-f0-9]{16}$/.test(text) ? text : null;
  return null;
}

function validDay(iso: string): boolean {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
