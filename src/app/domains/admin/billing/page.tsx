import type { Metadata } from "next";
import {
  AdminPageHeader,
  MiniBars,
  PlanBadge,
  StatTile,
} from "@/components/admin/AdminUi";
import { MRR_SERIES, PAYMENTS, platformStats } from "@/lib/admin-mock";

export const metadata: Metadata = { title: "Facturation" };

export default function BillingPage() {
  const s = platformStats();

  return (
    <>
      <AdminPageHeader
        title="Revenus / Facturation"
        description="Argent du SaaS Rappel Beauté — pas la caisse des instituts."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="CA SaaS" value={`${s.mrr.toLocaleString("fr-MA")} MAD`} />
        <StatTile label="Ce mois" value={`+${s.revenueGrowth} %`} />
        <StatTile label="Paiements réussis" value={String(s.paySuccess)} />
        <StatTile label="Paiements échoués" value={String(s.payFailed)} />
      </div>

      <section className="ac-card mt-6 p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold">Évolution du MRR</h2>
        <div className="mt-4 overflow-x-auto">
          <MiniBars
            data={MRR_SERIES.map((p) => p.value)}
            labels={MRR_SERIES.map((p) => p.label)}
          />
        </div>
      </section>

      <section className="ac-card mt-6">
        <div className="border-b border-[var(--admin-line)] px-4 py-4 sm:px-5">
          <h2 className="font-display text-lg font-semibold">Historique</h2>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Institut</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Formule</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {PAYMENTS.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.orgName}</td>
                  <td className="px-4 py-3 font-mono">
                    {p.amount.toLocaleString("fr-MA")}
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={p.plan} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.status === "SUCCESS"
                          ? "text-[var(--admin-ok)]"
                          : "text-[var(--admin-bad)]"
                      }
                    >
                      {p.status === "SUCCESS" ? "Réussi" : "Échoué"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {PAYMENTS.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-bg)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.orgName}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                    {p.date} · <PlanBadge plan={p.plan} />
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold">
                    {p.amount.toLocaleString("fr-MA")} MAD
                  </p>
                  <p
                    className={
                      p.status === "SUCCESS"
                        ? "text-xs text-[var(--admin-ok)]"
                        : "text-xs text-[var(--admin-bad)]"
                    }
                  >
                    {p.status === "SUCCESS" ? "Réussi" : "Échoué"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
