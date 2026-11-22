import { PUBLIC_OFFER } from "@/lib/site";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialBannerInput = {
  status: string;
  startedAt: string | null;
  trialEndsAt: string | null;
};

export type TrialBanner = {
  /** running : essai en cours ; ending : 3 jours ou moins ; ended : essai terminé. */
  kind: "running" | "ending" | "ended";
  /** Durée totale de l'essai, en jours (celle de l'abonnement, sinon l'offre publique). */
  totalDays: number;
  daysLeft: number;
  /** 0 à 100 : part de l'essai déjà écoulée. */
  elapsedPct: number;
};

/**
 * Bandeau d'essai affiché dans la barre du haut. Seuls les comptes en période d'essai (ou dont l'essai vient de se
 * terminer sans abonnement) en ont un ; un abonnement payé ne l'affiche jamais.
 */
export function trialBanner(sub: TrialBannerInput | null, now: Date = new Date()): TrialBanner | null {
  if (!sub || !sub.trialEndsAt) return null;
  if (sub.status !== "TRIAL" && sub.status !== "EXPIRED") return null;
  const end = new Date(sub.trialEndsAt).getTime();
  if (!Number.isFinite(end)) return null;

  const start = sub.startedAt ? new Date(sub.startedAt).getTime() : NaN;
  const measured = Number.isFinite(start) ? Math.round((end - start) / DAY_MS) : NaN;
  const totalDays = measured >= 1 && measured <= 90 ? measured : PUBLIC_OFFER.trialDays;

  const msLeft = end - now.getTime();
  if (msLeft <= 0 || sub.status === "EXPIRED") {
    return { kind: "ended", totalDays, daysLeft: 0, elapsedPct: 100 };
  }
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  const elapsedPct = Math.min(100, Math.max(0, Math.round(((totalDays - msLeft / DAY_MS) / totalDays) * 100)));
  return { kind: daysLeft <= 3 ? "ending" : "running", totalDays, daysLeft, elapsedPct };
}
