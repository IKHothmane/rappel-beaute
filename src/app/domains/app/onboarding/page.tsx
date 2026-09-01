"use client";

import Link from "next/link";
import { useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { ONBOARDING_STEPS } from "@/lib/app-mock";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const progress = Math.round(((step + 1) / ONBOARDING_STEPS.length) * 100);

  return (
    <>
      <AppPageHeader
        title="Configuration de l’institut"
        description="L’onboarding ne bloque pas l’usage — revenez quand vous voulez."
        action={
          <Link href="/dashboard/" className="btn-ghost">
            Passer pour maintenant
          </Link>
        }
      />

      <div className="mb-6 surface p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>
            Étape {step + 1} / {ONBOARDING_STEPS.length} — {ONBOARDING_STEPS[step]}
          </span>
          <span className="font-mono text-ink/45">{progress} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-primary-light">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="surface max-w-xl space-y-4 p-6">
        <h2 className="font-display text-xl font-semibold">{ONBOARDING_STEPS[step]}</h2>
        <p className="text-sm text-ink/60">
          Formulaire de démonstration pour l’étape « {ONBOARDING_STEPS[step]} ».
        </p>
        <input
          className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-primary"
          placeholder={`Renseigner ${ONBOARDING_STEPS[step].toLowerCase()}…`}
        />
        <div className="flex flex-wrap gap-2 pt-2">
          {step > 0 ? (
            <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Retour
            </button>
          ) : null}
          {step < ONBOARDING_STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>
              Continuer
            </button>
          ) : (
            <Link href="/dashboard/" className="btn-primary">
              Terminer
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
