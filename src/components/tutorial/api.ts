/**
 * Client du contrat /api/onboarding/tutorial/. Toute erreur (réseau, 4xx, 5xx, corps inattendu) renvoie `null` :
 * l'appelant n'affiche alors aucun tutoriel et ne lève jamais d'exception.
 */

export type TutorialStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type TutorialStepId = "welcome" | "services" | "staff" | "planning" | "resources" | "agenda";
export type TutorialAction = "start" | "step" | "pause" | "skip" | "complete" | "reset";

export type TutorialProgress = {
  services: number;
  staff: number;
  staffWithSchedule: number;
  resources: number;
  appointments: number;
};

export type TutorialSnapshot = {
  tutorial: { status: TutorialStatus; lastStep: string | null; version: number } | null;
  progress: TutorialProgress;
  eligible: boolean;
};

const ENDPOINT = "/api/onboarding/tutorial/";
const STATUSES: readonly string[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"];

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function parse(raw: unknown): TutorialSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const t = data.tutorial as Record<string, unknown> | null | undefined;
  const p = (data.progress ?? {}) as Record<string, unknown>;
  const tutorial =
    t && typeof t === "object" && typeof t.status === "string" && STATUSES.includes(t.status)
      ? {
          status: t.status as TutorialStatus,
          lastStep: typeof t.lastStep === "string" ? t.lastStep : null,
          version: typeof t.version === "number" ? t.version : 1,
        }
      : null;
  return {
    tutorial,
    progress: {
      services: count(p.services),
      staff: count(p.staff),
      staffWithSchedule: count(p.staffWithSchedule),
      resources: count(p.resources),
      appointments: count(p.appointments),
    },
    eligible: data.eligible === true,
  };
}

async function call(init: RequestInit): Promise<TutorialSnapshot | null> {
  try {
    const res = await fetch(ENDPOINT, { credentials: "same-origin", cache: "no-store", ...init });
    if (!res.ok) return null;
    return parse(await res.json());
  } catch {
    return null;
  }
}

export function getTutorial(signal?: AbortSignal): Promise<TutorialSnapshot | null> {
  return call({ method: "GET", signal });
}

/**
 * PATCH. Un 409 (transition déjà avancée) ou toute autre erreur renvoie `null` : l'appelant refait alors un GET
 * pour connaître l'état réel. Un 503 (table absente) se traite de la même façon, sans bruit.
 */
export function patchTutorial(action: TutorialAction, step?: TutorialStepId): Promise<TutorialSnapshot | null> {
  return call({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(step ? { action, step } : { action }),
  });
}
