import type {
  PostVisitAnalytics,
  PostVisitKpis,
  PostVisitListItem,
  PostVisitSettings,
  UpdatePostVisitSettingsInput,
} from "@/types/post-visit";

export function parsePostVisitSettingsBody(
  raw: Record<string, unknown>,
): { ok: true; data: UpdatePostVisitSettingsInput } | { ok: false; error: string } {
  const data: UpdatePostVisitSettingsInput = {};

  if (raw.enabled !== undefined) data.enabled = Boolean(raw.enabled);
  if (raw.respectFutureAppointments !== undefined) {
    data.respectFutureAppointments = Boolean(raw.respectFutureAppointments);
  }
  if (raw.respectOptIn !== undefined) data.respectOptIn = Boolean(raw.respectOptIn);
  if (raw.autoCreateWhatsAppTasks !== undefined) {
    data.autoCreateWhatsAppTasks = Boolean(raw.autoCreateWhatsAppTasks);
  }

  const intField = (key: keyof UpdatePostVisitSettingsInput, min: number, max: number) => {
    if (raw[key as string] === undefined) return;
    const n = Number(raw[key as string]);
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new Error(`Champ ${String(key)} invalide.`);
    }
    (data as Record<string, number>)[key as string] = Math.round(n);
  };

  try {
    intField("defaultReturnDays", 1, 365);
    intField("maxOverdueDays", 1, 90);
    intField("minimumDaysBetweenMarketingMessages", 1, 180);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Paramètres invalides." };
  }

  return { ok: true, data };
}

export function parsePostVisitAction(
  raw: Record<string, unknown>,
):
  | { action: "updateSettings"; data: UpdatePostVisitSettingsInput }
  | { action: "skip"; appointmentId: string }
  | { action: "sync" }
  | { action: "invalid"; error: string } {
  const action = String(raw.action ?? "");
  if (action === "updateSettings") {
    const parsed = parsePostVisitSettingsBody(raw);
    if (!parsed.ok) return { action: "invalid", error: parsed.error };
    return { action: "updateSettings", data: parsed.data };
  }
  if (action === "skip") {
    const appointmentId = String(raw.appointmentId ?? "").trim();
    if (!appointmentId) return { action: "invalid", error: "appointmentId requis." };
    return { action: "skip", appointmentId };
  }
  if (action === "sync") return { action: "sync" };
  return { action: "invalid", error: "Action invalide." };
}

export type {
  PostVisitAnalytics,
  PostVisitKpis,
  PostVisitListItem,
  PostVisitSettings,
  UpdatePostVisitSettingsInput,
};
