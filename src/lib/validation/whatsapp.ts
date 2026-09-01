import type {
  CreateWhatsAppTemplateInput,
  UpdateWhatsAppTemplateInput,
  WhatsAppStaffOutcome,
  WhatsAppTaskStatus,
  WhatsAppTaskType,
} from "@/types/whatsapp";
import { WHATSAPP_TASK_TYPES } from "@/types/whatsapp";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function parseWhatsAppListQuery(sp: URLSearchParams) {
  const status = sp.get("status")?.trim() as WhatsAppTaskStatus | null;
  const type = sp.get("type")?.trim() as WhatsAppTaskType | null;
  const view = sp.get("view")?.trim() || "pending";
  return {
    status: status || null,
    type: type || null,
    view: view === "sent" ? ("sent" as const) : ("pending" as const),
  };
}

export function validateCreateWhatsAppTemplate(
  raw: Record<string, unknown>,
): { ok: true; data: CreateWhatsAppTemplateInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const name = str(raw.name);
  const type = str(raw.type) as WhatsAppTaskType | undefined;
  const body = str(raw.body);
  if (!name) errors.push("name");
  if (!type || !WHATSAPP_TASK_TYPES.includes(type)) errors.push("type");
  if (!body) errors.push("body");
  if (errors.length || !name || !type || !body) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      type,
      body,
      active: raw.active === false ? false : true,
      isDefault: raw.isDefault === true,
    },
  };
}

export function validateUpdateWhatsAppTemplate(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateWhatsAppTemplateInput } | { ok: false; errors: string[] } {
  const id = str(raw.id);
  if (!id) return { ok: false, errors: ["id"] };
  return {
    ok: true,
    data: {
      id,
      name: str(raw.name),
      body: str(raw.body),
      active: typeof raw.active === "boolean" ? raw.active : undefined,
      isDefault: typeof raw.isDefault === "boolean" ? raw.isDefault : undefined,
    },
  };
}

const OUTCOMES = new Set<WhatsAppStaffOutcome>([
  "CUSTOMER_CONFIRMED",
  "CUSTOMER_CANCELLED",
  "NEEDS_FOLLOWUP",
]);

export function parseWhatsAppAction(raw: Record<string, unknown>):
  | { action: "markSent"; taskId: string }
  | { action: "skip"; taskId: string }
  | { action: "recordOutcome"; taskId: string; outcome: WhatsAppStaffOutcome }
  | { action: "createTemplate"; data: CreateWhatsAppTemplateInput }
  | { action: "updateTemplate"; data: UpdateWhatsAppTemplateInput }
  | { action: "invalid" } {
  const action = str(raw.action);
  if (action === "markSent" || action === "skip") {
    const taskId = str(raw.taskId);
    if (!taskId) return { action: "invalid" };
    return { action, taskId };
  }
  if (action === "recordOutcome") {
    const taskId = str(raw.taskId);
    const outcome = str(raw.outcome) as WhatsAppStaffOutcome | undefined;
    if (!taskId || !outcome || !OUTCOMES.has(outcome)) return { action: "invalid" };
    return { action: "recordOutcome", taskId, outcome };
  }
  if (action === "createTemplate") {
    const validated = validateCreateWhatsAppTemplate(raw);
    if (!validated.ok) return { action: "invalid" };
    return { action: "createTemplate", data: validated.data };
  }
  if (action === "updateTemplate") {
    const validated = validateUpdateWhatsAppTemplate(raw);
    if (!validated.ok) return { action: "invalid" };
    return { action: "updateTemplate", data: validated.data };
  }
  return { action: "invalid" };
}
