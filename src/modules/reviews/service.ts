import type {
  ReviewAlertItem,
  ReviewKpis,
  ReviewRequestItem,
  ReviewRequestStatus,
  ReviewSatisfaction,
  ReviewSettings,
  StaffReviewScore,
  UpdateReviewSettingsInput,
} from "@/types/review";
import {
  REVIEW_SATISFACTION_EMOJI,
  REVIEW_SATISFACTION_LABEL,
  REVIEW_STATUS_LABEL,
} from "@/types/review";

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

export async function getReviewsDashboard(params?: {
  status?: ReviewRequestStatus | "ALL";
}): Promise<{
  items: ReviewRequestItem[];
  kpis: ReviewKpis;
  settings: ReviewSettings;
  alerts: ReviewAlertItem[];
  staffScores: StaffReviewScore[];
}> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  else q.set("status", "ALL");
  const res = await fetch(`/api/reviews/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function updateReviewSettings(input: UpdateReviewSettingsInput) {
  const res = await fetch("/api/reviews/settings/", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const, settings: data as ReviewSettings };
}

export async function skipReviewRequest(reviewId: string) {
  const res = await fetch("/api/reviews/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "skip", reviewId }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return { ok: true as const };
}

export async function recordReviewSatisfaction(
  reviewId: string,
  satisfaction: ReviewSatisfaction,
) {
  const res = await fetch("/api/reviews/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "recordSatisfaction", reviewId, satisfaction }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false as const, error: data.error ?? "Erreur" };
  return {
    ok: true as const,
    alert: (data.alert as ReviewAlertItem | null) ?? null,
  };
}

export {
  REVIEW_SATISFACTION_EMOJI,
  REVIEW_SATISFACTION_LABEL,
  REVIEW_STATUS_LABEL,
};
