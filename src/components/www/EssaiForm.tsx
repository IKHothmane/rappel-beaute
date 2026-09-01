"use client";

import { useSearchParams } from "next/navigation";
import { LeadForm } from "@/components/www/LeadForm";

const PLANS = new Set(["starter", "institut", "premium"]);

export function EssaiForm() {
  const params = useSearchParams();
  const raw = (params.get("plan") ?? "").toLowerCase();
  const plan = PLANS.has(raw) ? raw : "institut";

  return (
    <LeadForm
      kind="ESSAI"
      defaultPlan={plan}
      notice="Votre accès sera activé sous 24 h. Seul notre équipe crée les comptes — pas d’inscription libre."
    />
  );
}
