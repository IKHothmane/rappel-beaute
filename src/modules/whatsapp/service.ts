import type {
  CreateWhatsAppTemplateInput,
  UpdateWhatsAppTemplateInput,
  WhatsAppKpis,
  WhatsAppStaffOutcome,
  WhatsAppTaskItem,
  WhatsAppTemplateItem,
} from "@/types/whatsapp";
import {
  WHATSAPP_OUTCOME_LABEL,
  WHATSAPP_TASK_STATUS_LABEL,
  WHATSAPP_TASK_TYPE_LABEL,
  WHATSAPP_TEMPLATE_VARIABLES,
} from "@/types/whatsapp";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function getWhatsAppDashboard(view: "pending" | "sent" = "pending"): Promise<{
  items: WhatsAppTaskItem[];
  kpis: WhatsAppKpis;
}> {
  const q = new URLSearchParams({ view });
  const res = await fetch(`/api/whatsapp/?${q}`, fetchOpts);
  const body = await parseJson<{ data?: WhatsAppTaskItem[]; items?: WhatsAppTaskItem[]; kpis: WhatsAppKpis }>(res);
  return { items: body.data ?? body.items ?? [], kpis: body.kpis };
}

export async function markWhatsAppSent(taskId: string) {
  const res = await fetch("/api/whatsapp/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markSent", taskId }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, task: data as WhatsAppTaskItem };
}

export async function skipWhatsAppTask(taskId: string) {
  const res = await fetch("/api/whatsapp/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "skip", taskId }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const };
}

export async function recordWhatsAppOutcome(taskId: string, outcome: WhatsAppStaffOutcome) {
  const res = await fetch("/api/whatsapp/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "recordOutcome", taskId, outcome }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const };
}

export async function listWhatsAppTemplates(): Promise<WhatsAppTemplateItem[]> {
  const res = await fetch("/api/whatsapp/templates/", fetchOpts);
  const data = await parseJson<{ data?: WhatsAppTemplateItem[] }>(res);
  return data.data ?? [];
}

export async function createWhatsAppTemplate(input: CreateWhatsAppTemplateInput) {
  const res = await fetch("/api/whatsapp/templates/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "createTemplate", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, template: data as WhatsAppTemplateItem };
}

export async function updateWhatsAppTemplate(input: UpdateWhatsAppTemplateInput) {
  const res = await fetch("/api/whatsapp/templates/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateTemplate", ...input }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, template: data as WhatsAppTemplateItem };
}

export function formatAppointmentWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isTomorrow) return `Demain à ${time}`;
  return `${d.toLocaleDateString("fr-FR")} à ${time}`;
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}

export {
  WHATSAPP_TASK_TYPE_LABEL,
  WHATSAPP_TASK_STATUS_LABEL,
  WHATSAPP_OUTCOME_LABEL,
  WHATSAPP_TEMPLATE_VARIABLES,
};
