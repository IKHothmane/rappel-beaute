import type { ReviewSatisfaction, UpdateReviewSettingsInput } from "@/types/review";

function int(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function validateUpdateReviewSettings(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateReviewSettingsInput } | { ok: false; errors: string[] } {
  const data: UpdateReviewSettingsInput = {};
  if (raw.googleReviewUrl !== undefined) {
    const url = str(raw.googleReviewUrl);
    if (url && !/^https?:\/\//i.test(url)) {
      return { ok: false, errors: ["googleReviewUrl"] };
    }
    data.googleReviewUrl = url ?? null;
  }
  const delay = int(raw.delayHours);
  if (delay !== undefined) {
    if (delay < 1 || delay > 72) return { ok: false, errors: ["delayHours"] };
    data.delayHours = delay;
  }
  const maxW = int(raw.maxWindowHours);
  if (maxW !== undefined) {
    if (maxW < 3 || maxW > 168) return { ok: false, errors: ["maxWindowHours"] };
    data.maxWindowHours = maxW;
  }
  if (typeof raw.enabled === "boolean") data.enabled = raw.enabled;
  return { ok: true, data };
}

const SATISFACTIONS = new Set<ReviewSatisfaction>(["VERY_SATISFIED", "SATISFIED", "DISSATISFIED"]);

export function parseReviewAction(raw: Record<string, unknown>):
  | { action: "skip"; reviewId: string }
  | { action: "recordSatisfaction"; reviewId: string; satisfaction: ReviewSatisfaction }
  | { action: "updateSettings"; data: UpdateReviewSettingsInput }
  | { action: "invalid" } {
  const action = str(raw.action);
  if (action === "skip") {
    const reviewId = str(raw.reviewId);
    if (!reviewId) return { action: "invalid" };
    return { action: "skip", reviewId };
  }
  if (action === "recordSatisfaction") {
    const reviewId = str(raw.reviewId);
    const satisfaction = str(raw.satisfaction) as ReviewSatisfaction | undefined;
    if (!reviewId || !satisfaction || !SATISFACTIONS.has(satisfaction)) return { action: "invalid" };
    return { action: "recordSatisfaction", reviewId, satisfaction };
  }
  if (action === "updateSettings") {
    const validated = validateUpdateReviewSettings(raw);
    if (!validated.ok) return { action: "invalid" };
    return { action: "updateSettings", data: validated.data };
  }
  return { action: "invalid" };
}
