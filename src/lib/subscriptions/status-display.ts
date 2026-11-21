import { formatBusinessDate } from "@/lib/time/business-timezone";
import type { SubscriptionDto } from "@/types/subscription";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionTone = "ok" | "trial" | "warn" | "off";

export type SubscriptionDisplay = {
  badge: string;
  tone: SubscriptionTone;
  /** Phrase sous le prix. */
  line: string;
  /** Vrai quand la période payée est terminée alors que l'abonnement n'a pas été clôturé ni renouvelé. */
  overdue: boolean;
};

function days(n: number): string {
  return `${n} jour${n > 1 ? "s" : ""}`;
}

/**
 * Libellé affiché pour l'abonnement. Le statut en base ne change pas tout seul à l'échéance : un abonnement
 * « ACTIVE » dont la période est terminée ne doit pas s'afficher « Actif · Renouvellement le <date passée> ».
 * Pure présentation : n'autorise ni ne bloque aucune fonctionnalité (voir isSubscriptionOperational).
 */
export function describeSubscription(
  sub: Pick<SubscriptionDto, "status" | "currentPeriodEnd" | "trialEndsAt">,
  now: Date = new Date(),
): SubscriptionDisplay {
  const end = new Date(sub.currentPeriodEnd);
  const endLabel = formatBusinessDate(end);

  switch (sub.status) {
    case "CANCELLED":
      return { badge: "Annulé", tone: "off", line: `Abonnement annulé. Accès jusqu'au ${endLabel}.`, overdue: false };
    case "EXPIRED":
      return { badge: "Expiré", tone: "off", line: `Abonnement expiré le ${endLabel}. Contactez-nous pour le réactiver.`, overdue: false };
    case "PAUSED":
      return { badge: "En pause", tone: "off", line: "Abonnement en pause.", overdue: false };
    case "TRIAL": {
      const trialEnd = new Date(sub.trialEndsAt ?? sub.currentPeriodEnd);
      const left = Math.ceil((trialEnd.getTime() - now.getTime()) / DAY_MS);
      return left > 0
        ? { badge: "Essai gratuit", tone: "trial", line: `Essai jusqu'au ${formatBusinessDate(trialEnd)} (${days(left)} restant${left > 1 ? "s" : ""}).`, overdue: false }
        : { badge: "Essai terminé", tone: "warn", line: `Essai terminé le ${formatBusinessDate(trialEnd)}. Contactez-nous pour activer votre abonnement.`, overdue: true };
    }
    default: {
      // ACTIVE ou PAST_DUE
      const diff = now.getTime() - end.getTime();
      if (sub.status === "PAST_DUE" || diff > 0) {
        const late = Math.max(1, Math.floor(diff / DAY_MS));
        return {
          badge: "Renouvellement en retard",
          tone: "warn",
          line: `Période échue le ${endLabel}${diff > 0 ? ` (il y a ${days(late)})` : ""}. Contactez-nous pour régulariser votre abonnement.`,
          overdue: true,
        };
      }
      const left = Math.ceil(-diff / DAY_MS);
      return { badge: "Actif", tone: "ok", line: `Renouvellement le ${endLabel} (dans ${days(left)}).`, overdue: false };
    }
  }
}
