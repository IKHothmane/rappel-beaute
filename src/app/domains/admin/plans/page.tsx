"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, PlanBadge } from "@/components/admin/AdminUi";
import type { PlanDto } from "@/types/subscription";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanDto[]>([]);

  useEffect(() => {
    fetch("/api/admin/plans/?all=1", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(console.error);
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Plans"
        description="Formules, limites et fonctionnalités — modifiables sans redéployer le code."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <article key={p.id} className="ac-card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <PlanBadge plan={p.code} />
              {!p.active ? (
                <span className="text-xs text-red-600">Inactif</span>
              ) : (
                <span className="text-xs text-emerald-700">Actif</span>
              )}
            </div>
            <h2 className="font-display text-xl font-semibold">{p.name}</h2>
            <p className="text-sm text-[var(--admin-muted)]">{p.description}</p>
            <p className="font-mono text-2xl font-semibold">
              {p.price.toLocaleString("fr-MA")} {p.currency}
            </p>
            <ul className="text-xs text-[var(--admin-muted)]">
              <li>RDV / mois : {p.maxAppointmentsPerMonth ?? "∞"}</li>
              <li>Employées : {p.maxStaff ?? "∞"}</li>
              <li>Clientes : {p.maxCustomers ?? "∞"}</li>
              <li>Essai : {p.trialDays} jours</li>
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
