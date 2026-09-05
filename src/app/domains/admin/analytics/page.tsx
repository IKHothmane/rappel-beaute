"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, MiniBars, StatTile } from "@/components/admin/AdminUi";
import { fetchAdminAnalytics } from "@/modules/admin/client";
import { PLAN_LABEL, type PlatformAnalytics } from "@/types/platform";

function mad(n: number) {
  return `${n.toLocaleString("fr-MA")} MAD`;
}

export default function AnalyticsPage() {
  const [s, setS] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAnalytics()
      .then(setS)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Analytics plateforme"
        description="Métriques SaaS calculées depuis PostgreSQL."
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!s && !error ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}

      {s ? (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold">Acquisition</h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatTile label="Nouveaux instituts (mois)" value={`+${s.orgsDelta}`} />
            <StatTile label="Instituts actifs" value={String(s.orgsActive)} />
            <StatTile label="Utilisateurs (mois)" value={`+${s.usersDelta}`} />
          </div>

          <h2 className="mb-3 font-display text-lg font-semibold">Usage</h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="RDV (mois)" value={s.rdv.toLocaleString("fr-MA")} />
            <StatTile label="Clientes" value={s.customersTotal.toLocaleString("fr-MA")} />
            <StatTile label="Services" value={s.services.toLocaleString("fr-MA")} />
            <StatTile label="Employées" value={s.staffTotal.toLocaleString("fr-MA")} />
          </div>

          <h2 className="mb-3 font-display text-lg font-semibold">Business</h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="MRR" value={mad(s.mrr)} />
            <StatTile label="ARR" value={mad(s.arr)} />
            <StatTile label="ARPU" value={mad(s.arpu)} />
            <StatTile
              label="Croissance MRR"
              value={`${s.mrrGrowthPercent > 0 ? "+" : ""}${s.mrrGrowthPercent} %`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="ac-card p-5">
              <h3 className="font-display text-lg font-semibold">Répartition formules</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {(["STARTER", "INSTITUT", "PREMIUM"] as const).map((p) => (
                  <li key={p} className="flex justify-between">
                    <span>{PLAN_LABEL[p]}</span>
                    <span className="font-mono text-[var(--admin-muted)]">
                      {s.planShare[p]} %
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="ac-card p-5">
              <h3 className="font-display text-lg font-semibold">Croissance MRR</h3>
              <div className="mt-4">
                <MiniBars
                  data={s.mrrSeries.map((p) => p.value)}
                  labels={s.mrrSeries.map((p) => p.label)}
                />
              </div>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
