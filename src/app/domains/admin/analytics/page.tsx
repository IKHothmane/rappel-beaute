"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import { fetchAdminAnalytics } from "@/modules/admin/client";
import { PLAN_LABEL, type PlatformAnalytics } from "@/types/platform";

const PLAN_COLORS = {
  STARTER: "#94A3B8",
  INSTITUT: "#E31C5F",
  PREMIUM: "#C79A3B",
} as const;

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

  const planData = useMemo(() => {
    if (!s) return [];
    return (["STARTER", "INSTITUT", "PREMIUM"] as const)
      .map((p) => ({
        key: p,
        name: PLAN_LABEL[p],
        value: s.planShare[p],
        fill: PLAN_COLORS[p],
      }))
      .filter((d) => d.value > 0);
  }, [s]);

  const mrrHasData = Boolean(s?.mrrSeries.some((p) => p.value > 0));

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
              {planData.length > 0 ? (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={planData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {planData.map((d) => (
                          <Cell key={d.key} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${Number(v ?? 0)} %`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-8 text-center text-sm text-[var(--admin-muted)]">
                  Aucune répartition disponible.
                </p>
              )}
              <ul className="mt-2 space-y-2 text-sm">
                {(["STARTER", "INSTITUT", "PREMIUM"] as const).map((p) => (
                  <li key={p} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ background: PLAN_COLORS[p] }}
                      />
                      {PLAN_LABEL[p]}
                    </span>
                    <span className="font-mono text-[var(--admin-muted)]">
                      {s.planShare[p]} %
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ac-card p-5">
              <h3 className="font-display text-lg font-semibold">Croissance MRR</h3>
              {mrrHasData ? (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={s.mrrSeries}>
                      <defs>
                        <linearGradient id="adminMrrFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E31C5F" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#E31C5F" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#F0E3E6" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#241A22", fillOpacity: 0.45 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={52}
                        tick={{ fontSize: 11, fill: "#241A22", fillOpacity: 0.45 }}
                      />
                      <Tooltip formatter={(v) => [mad(Number(v ?? 0)), "MRR"]} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#E31C5F"
                        strokeWidth={2.5}
                        fill="url(#adminMrrFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-10 text-center text-sm text-[var(--admin-muted)]">
                  Pas encore de MRR historique à afficher.
                </p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
