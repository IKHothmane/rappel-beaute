"use client";

import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  MiniBars,
  PlanBadge,
  StatTile,
} from "@/components/admin/AdminUi";
import { fetchAdminBilling } from "@/modules/admin/client";
import type { PlatformBillingSnapshot } from "@/types/platform";

function mad(n: number) {
  return `${n.toLocaleString("fr-MA")} MAD`;
}

export default function BillingPage() {
  const [data, setData] = useState<PlatformBillingSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminBilling()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Revenus / Facturation"
        description="MRR SaaS dérivé des abonnements PostgreSQL (pas la caisse institut)."
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!data && !error ? (
        <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="MRR" value={mad(data.mrr)} />
            <StatTile label="ARR" value={mad(data.arr)} />
            <StatTile
              label="Croissance MRR"
              value={`${data.mrrGrowthPercent > 0 ? "+" : ""}${data.mrrGrowthPercent} %`}
            />
            <StatTile label="Abonnements actifs" value={String(data.activeSubs)} />
          </div>

          <section className="ac-card mt-6 p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">Évolution du MRR</h2>
            <div className="mt-4 overflow-x-auto">
              {data.mrrSeries.every((p) => p.value === 0) ? (
                <p className="text-sm text-[var(--admin-muted)]">Aucun MRR sur la période.</p>
              ) : (
                <MiniBars
                  data={data.mrrSeries.map((p) => p.value)}
                  labels={data.mrrSeries.map((p) => p.label)}
                />
              )}
            </div>
          </section>

          <section className="ac-card mt-6">
            <div className="border-b border-[var(--admin-line)] px-4 py-4 sm:px-5">
              <h2 className="font-display text-lg font-semibold">Abonnements (période en cours)</h2>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Pas de ledger paiement SaaS séparé — lignes = Subscription réelle.
              </p>
            </div>

            {data.lines.length === 0 ? (
              <p className="p-5 text-sm text-[var(--admin-muted)]">Aucun abonnement.</p>
            ) : (
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Institut</th>
                      <th className="px-4 py-3 font-medium">Montant</th>
                      <th className="px-4 py-3 font-medium">Formule</th>
                      <th className="px-4 py-3 font-medium">Période</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-line)]">
                    {data.lines.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3">{p.organizationName}</td>
                        <td className="px-4 py-3 font-mono">{p.amount.toLocaleString("fr-MA")}</td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={p.plan} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {new Date(p.periodStart).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
