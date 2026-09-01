"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { PLAN_FEATURE_LABELS, type PlanFeatureKey } from "@/types/subscription";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";

type FeatureLockedPanelProps = {
  feature?: PlanFeatureKey;
  navKey?: string;
};

export function FeatureLockedPanel({ feature, navKey }: FeatureLockedPanelProps) {
  const { planName } = usePlanFeatures();
  const label = feature ? PLAN_FEATURE_LABELS[feature] : "Cette fonctionnalité";

  return (
    <div className="surface mx-auto max-w-lg p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <Lock size={28} strokeWidth={1.8} />
      </div>
      <h1 className="font-display text-xl font-semibold">
        {label} — forfait supérieur requis
      </h1>
      <p className="mt-3 text-sm text-ink/60">
        {navKey ? (
          <>
            Cette section n&apos;est pas incluse dans votre abonnement{" "}
            {planName ? `« ${planName} »` : "actuel"}.
          </>
        ) : (
          <>
            Cette fonctionnalité est disponible avec le forfait Institut ou supérieur.
          </>
        )}
      </p>
      <Link
        href="/settings/subscription/"
        className="btn-primary mt-6 inline-flex"
      >
        Voir les abonnements
      </Link>
    </div>
  );
}
