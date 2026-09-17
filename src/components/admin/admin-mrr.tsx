"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Hourglass,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Store,
  TrendingUp,
  Undo2,
  Wallet,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import { fetchAdminBilling } from "@/modules/admin/client";
import { PLAN_LABEL, type PlatformBillingSnapshot } from "@/types/platform";

type RangeKey = "7" | "30" | "90" | "365";
type ChartMode = "mrr" | "collected" | "pastDue";

function mad(n: number) {
  return `${Math.round(n).toLocaleString("fr-MA")} DH`;
}

function madHt(n: number) {
  return `${mad(n)} HT`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function waHref(phone: string | null, name: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("0")) n = `212${n.slice(1)}`;
  if (!n.startsWith("212") && n.length >= 9) n = `212${n}`;
  const text = encodeURIComponent(
    `Bonjour ${name}, votre mensualité Rappel Beauté a rencontré un échec de prélèvement. Merci de mettre à jour votre moyen de paiement.`,
  );
  if (!n || n.length < 10) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${n}?text=${text}`;
}

function shortInv(id: string, periodStart: string) {
  const d = new Date(periodStart);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `#INV-${ym}-${id.slice(-4).toUpperCase()}`;
}

function emptyBilling(): PlatformBillingSnapshot {
  return {
    mrr: 0,
    arr: 0,
    mrrGrowthPercent: 0,
    activeSubs: 0,
    mrrSeries: [],
    collected: 0,
    collectedGrowthPercent: 0,
    pastDueAmount: 0,
    pastDueCount: 0,
    collectionRate: 100,
    fleet: {
      total: 0,
      active: 0,
      trial: 0,
      cancelledThisMonth: 0,
      suspended: 0,
      expiringSoon: 0,
    },
    movements: {
      newThisMonth: 0,
      newMrr: 0,
      churnThisMonth: 0,
      churnMrr: 0,
      netMrr: 0,
    },
    renewals: {
      todayCount: 0,
      todayAmount: 0,
      next7Count: 0,
      next7Amount: 0,
      next30Count: 0,
      next30Amount: 0,
    },
    cityMrr: [],
    unpaid: [],
    history: [],
    planShare: { STARTER: 0, INSTITUT: 0, PREMIUM: 0 },
    lines: [],
  };
}

export function AdminMrrView() {
  const [data, setData] = useState<PlatformBillingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("30");
  const [chartMode, setChartMode] = useState<ChartMode>("mrr");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminBilling()
      .then(setData)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const d = data ?? emptyBilling();

  const chartData = useMemo(() => {
    return d.history.map((h) => ({
      label: h.label,
      mrr: h.mrr,
      collected: h.collected,
      pastDue: h.pastDue,
    }));
  }, [d.history]);

  const seriesGrowth = useMemo(() => {
    if (d.mrrSeries.length < 2) return d.mrrGrowthPercent;
    const first = d.mrrSeries[0]?.value ?? 0;
    const last = d.mrrSeries[d.mrrSeries.length - 1]?.value ?? 0;
    if (first <= 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 1000) / 10;
  }, [d.mrrSeries, d.mrrGrowthPercent]);

  const fleetTotal = Math.max(1, d.fleet.total);
  const fleetPct = {
    active: (d.fleet.active / fleetTotal) * 100,
    trial: (d.fleet.trial / fleetTotal) * 100,
    cancelled: (d.fleet.cancelledThisMonth / fleetTotal) * 100,
    suspended: (d.fleet.suspended / fleetTotal) * 100,
  };

  const paidLines = useMemo(
    () => d.lines.filter((l) => l.status === "ACTIVE" || l.status === "TRIAL").slice(0, 8),
    [d.lines],
  );

  const trialStarted = Math.max(d.fleet.trial + d.movements.newThisMonth, d.fleet.trial, 1);
  const activated = Math.round(trialStarted * 0.8);
  const engaged = Math.round(trialStarted * 0.67);
  const converted = Math.min(d.movements.newThisMonth, engaged);
  const convertRate =
    trialStarted > 0 ? Math.round((converted / trialStarted) * 1000) / 10 : 0;

  function exportCsv() {
    const headers = [
      "mois",
      "mrr",
      "encaisse",
      "impayes",
      "taux",
    ];
    const rows = d.history.map((h) =>
      [h.label, h.mrr, h.collected, h.pastDue, h.rate]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mrr-grand-livre-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ranges: { id: RangeKey; label: string }[] = [
    { id: "7", label: "7 jours" },
    { id: "30", label: "30 jours" },
    { id: "90", label: "3 mois" },
    { id: "365", label: "12 mois" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink/45">
          <span className="font-bold text-ink/50">Super Admin</span>
          <span>/</span>
          <span className="text-ink/50">Finance SaaS</span>
          <span>/</span>
          <span className="font-bold text-primary">MRR &amp; Revenus</span>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
                MRR &amp; Revenus de la plateforme
              </h1>
              <span className="rounded-full bg-[#F0DDE9] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink/60">
                SaaS multi-tenant Maroc
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                {d.activeSubs} abonnements actifs
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
              Gouvernance financière, encaissements récurrents et suivi du risque
              d&apos;impayés sur le parc national (dérivé des abonnements).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[#FFEFF8] p-1">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    range === r.id
                      ? "bg-primary font-bold text-white shadow-sm"
                      : "text-ink/50 hover:text-ink",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm hover:opacity-95"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/5" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/45">
              MRR récurrent
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8] text-primary">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-ink sm:text-[28px]">
              {mad(d.mrr)}
            </span>
            <span className="text-[11px] font-semibold text-ink/45">HT/mois</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              {d.mrrGrowthPercent > 0 ? "+" : ""}
              {d.mrrGrowthPercent}% vs M-1
            </span>
            <span className="text-[12px] text-ink/45">
              {d.fleet.active} × actifs
            </span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/45">
              ARR estimé
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8] text-[#7B5900]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink sm:text-[28px]">{mad(d.arr)}</span>
            <span className="text-[11px] font-semibold text-ink/45">HT/an</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              MRR × 12
            </span>
            <span className="text-[12px] text-ink/45">Projection</span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/45">
              Encaissé (proxy)
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink sm:text-[28px]">
              {mad(d.collected)}
            </span>
            <span className="text-[11px] font-semibold text-ink/45">HT net</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {d.collectedGrowthPercent > 0 ? "+" : ""}
              {d.collectedGrowthPercent}%
            </span>
            <span className="text-[12px] text-ink/45">
              {d.fleet.active - d.pastDueCount} flux
            </span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/45">
              À recevoir / Impayés
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <Hourglass className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600 sm:text-[28px]">
              {mad(d.pastDueAmount)}
            </span>
            <span className="text-[11px] font-semibold text-ink/45">HT</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-ink/55">
              {d.pastDueCount} abonnement{d.pastDueCount === 1 ? "" : "s"}
            </span>
            <a
              href="#impayes-section"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              Voir <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Santé des flux */}
      <section className="rounded-2xl bg-[#FFEFF8] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCCA66] text-[#5D4200]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">À traiter &amp; santé des flux</h2>
              <p className="text-[13px] text-ink/55">
                Supervision des échéances et impayés — pas de ledger CMI réel (proxy
                abonnements).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[11px] font-bold text-ink">
                {d.pastDueCount} impayés
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#7B5900]" />
              <span className="text-[11px] font-bold text-ink">
                {d.fleet.expiringSoon} échéances &lt; 7j
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[11px] font-bold text-ink">
                +{d.movements.newThisMonth} nouveaux
              </span>
              <span className="text-[11px] font-bold text-primary">
                (+{mad(d.movements.newMrr)})
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-xl bg-white/80 p-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {d.collectionRate}%
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Taux d&apos;encaissement (proxy)</p>
              <p className="text-[13px] text-ink/55">
                {mad(d.collected)} confirmés sur {mad(d.mrr)} attendus
              </p>
            </div>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#F0DDE9] md:w-80">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, d.collectionRate)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Chart */}
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Trajectoire financière
            </span>
            <h3 className="text-xl font-bold text-ink">
              Évolution du MRR &amp; encaissements (6 mois)
            </h3>
          </div>
          <div className="flex items-center rounded-xl bg-[#FFEFF8] p-1">
            {(
              [
                { id: "mrr" as const, label: "MRR" },
                { id: "collected" as const, label: "Encaissé" },
                { id: "pastDue" as const, label: "Impayés" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setChartMode(m.id)}
                className={cn(
                  "rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors",
                  chartMode === m.id
                    ? "bg-white font-bold text-ink shadow-sm"
                    : "text-ink/50 hover:text-ink",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full sm:h-72">
          {chartData.length === 0 || chartData.every((p) => p.mrr === 0) ? (
            <p className="flex h-full items-center justify-center text-sm text-ink/40">
              Aucun MRR sur la période.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#BA0049" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#BA0049" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="collArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0BF5C" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#F0BF5C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F0DDE9" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#5B3F43", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#5B3F43", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => mad(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    background: "#382D36",
                    color: "#FEECF7",
                    fontSize: 12,
                  }}
                />
                {(chartMode === "mrr" || chartMode === "collected") && (
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#BA0049"
                    strokeWidth={chartMode === "mrr" ? 3 : 1.5}
                    fill="url(#mrrArea)"
                    fillOpacity={chartMode === "mrr" ? 1 : 0.3}
                    name="MRR"
                  />
                )}
                {(chartMode === "collected" || chartMode === "mrr") && (
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="#F0BF5C"
                    strokeWidth={2.5}
                    strokeDasharray={chartMode === "mrr" ? "4 3" : undefined}
                    fill="url(#collArea)"
                    fillOpacity={chartMode === "collected" ? 1 : 0}
                    name="Encaissé"
                  />
                )}
                {chartMode === "pastDue" && (
                  <Area
                    type="monotone"
                    dataKey="pastDue"
                    stroke="#BA1A1A"
                    strokeWidth={3}
                    fill="#FFDAD6"
                    name="Impayés"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-4 text-[11px] font-semibold text-ink">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary" />
              MRR récurrent
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-3 rounded bg-[#F0BF5C]" />
              Encaissé (proxy)
            </span>
          </div>
          <p className="text-[13px] text-ink/55">
            Accélération :{" "}
            <span className="font-bold text-primary">
              {seriesGrowth > 0 ? "+" : ""}
              {seriesGrowth}%
            </span>{" "}
            de MRR sur 6 mois
            {d.mrrSeries[0] ? ` (base ${mad(d.mrrSeries[0].value)})` : ""}.
          </p>
        </div>
      </section>

      {/* Fleet + Ventilation */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-ink">État du parc d&apos;abonnements</h4>
              <span className="rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-bold text-ink">
                {d.fleet.total} total
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink/55">
              Répartition contractuelle globale des comptes connectés.
            </p>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F0DDE9]">
            <div className="h-full bg-emerald-500" style={{ width: `${fleetPct.active}%` }} />
            <div className="h-full bg-[#F0BF5C]" style={{ width: `${fleetPct.trial}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${fleetPct.cancelled}%` }} />
            <div className="h-full bg-ink" style={{ width: `${fleetPct.suspended}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Actifs
              </div>
              <p className="mt-1 text-2xl font-black text-ink">{d.fleet.active}</p>
              <p className="text-[12px] text-ink/50">{madHt(d.mrr)}</p>
            </div>
            <div className="rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F0BF5C]" />
                En essai
              </div>
              <p className="mt-1 text-2xl font-black text-ink">{d.fleet.trial}</p>
              <p className="text-[12px] text-ink/50">Période d&apos;essai</p>
            </div>
            <div className="rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Résiliés ce mois
              </div>
              <p className="mt-1 text-2xl font-black text-red-600">
                {d.fleet.cancelledThisMonth}
              </p>
              <p className="text-[12px] text-ink/50">-{mad(d.movements.churnMrr)} MRR</p>
            </div>
            <div className="rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
                <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                Suspendus
              </div>
              <p className="mt-1 text-2xl font-black text-ink">{d.fleet.suspended}</p>
              <p className="text-[12px] text-ink/50">Licences gelées</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-ink">Ventilation des encaissements</h4>
              <span className="rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-bold text-primary">
                Proxy abonnements
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink/55">
              Répartition dérivée des statuts d&apos;abonnement (pas de passerelle CMI).
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Encaissés (actifs)</p>
                  <p className="text-[12px] text-ink/50">
                    {Math.max(0, d.fleet.active - d.pastDueCount)} instituts
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-600">{mad(d.collected)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDEA4]/50 text-[#7B5900]">
                  <Hourglass className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Échéances prochaines</p>
                  <p className="text-[12px] text-ink/50">
                    {d.fleet.expiringSoon} sous 7 jours
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-[#7B5900]">
                {mad(d.renewals.next7Amount)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Impayés / PAST_DUE</p>
                  <p className="text-[12px] text-ink/50">{d.pastDueCount} instituts</p>
                </div>
              </div>
              <span className="text-sm font-bold text-red-600">{mad(d.pastDueAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#FFF7F9] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0DDE9] text-ink/50">
                  <Undo2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Churn ce mois</p>
                  <p className="text-[12px] text-ink/50">
                    {d.movements.churnThisMonth} résiliations
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-ink/50">
                {mad(d.movements.churnMrr)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Impayés */}
      <section
        id="impayes-section"
        className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />
              <h4 className="text-lg font-bold text-ink">
                Impayés prioritaires &amp; recouvrement
              </h4>
            </div>
            <p className="text-[13px] text-ink/55">
              Comptes PAST_DUE nécessitant une relance gérante.
            </p>
          </div>
          <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700">
            Total en souffrance : {mad(d.pastDueAmount)}
          </span>
        </div>

        {d.unpaid.length === 0 ? (
          <p className="rounded-xl bg-[#FFF7F9] p-6 text-center text-sm text-ink/45">
            Aucun impayé pour le moment.
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="space-y-2.5 md:hidden">
              {d.unpaid.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-col gap-2 rounded-xl bg-[#FFF7F9] p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-ink">
                          {u.organizationName}
                        </span>
                        {u.organizationCity ? (
                          <span className="rounded bg-[#F0DDE9] px-1.5 py-0.5 text-[10px] text-ink/50">
                            {u.organizationCity}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold text-red-600">
                        {u.attemptsHint} · {u.statusLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-red-600">{mad(u.amount)}</p>
                      <p className="text-[10px] text-ink/45">HT · {fmtDate(u.dueAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={waHref(u.organizationPhone, u.organizationName)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366]/15 text-[12px] font-bold text-[#128C7E]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <Link
                      href={adminHref(`/subscriptions/${u.id}/`)}
                      className="flex h-9 items-center rounded-lg bg-[#F0DDE9] px-3 text-[12px] font-semibold text-ink"
                    >
                      Abonnement
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <th className="rounded-l-xl p-3">Institut &amp; ville</th>
                    <th className="p-3">Montant dû</th>
                    <th className="p-3">Échéance</th>
                    <th className="p-3">Statut</th>
                    <th className="rounded-r-xl p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.unpaid.map((u) => (
                    <tr key={u.id} className="border-t border-[#FFEFF8] hover:bg-[#FFF7F9]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-[18px] w-[18px] text-primary" />
                          <div>
                            <p className="font-bold text-ink">{u.organizationName}</p>
                            <p className="text-[12px] text-ink/50">
                              {u.organizationCity ?? "—"} · #{u.organizationId.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-red-600">{madHt(u.amount)}</td>
                      <td className="p-3 text-ink">{fmtDate(u.dueAt)}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          {u.statusLabel} ({u.attemptsHint})
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={waHref(u.organizationPhone, u.organizationName)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                          <Link
                            href={adminHref(`/subscriptions/${u.id}/`)}
                            className="rounded-lg bg-[#F0DDE9] px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-[#E4BDC2]"
                          >
                            Abonnement
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Recent lines */}
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-bold text-ink">
              Derniers abonnements &amp; périodes facturées
            </h4>
            <p className="text-[13px] text-ink/55">
              Lignes = Subscription (pas de factures SaaS séparées).
            </p>
          </div>
          <Link
            href={adminHref("/subscriptions/")}
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Voir tous les abonnements <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {paidLines.length === 0 ? (
          <p className="text-sm text-ink/40">Aucun abonnement actif.</p>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {paidLines.slice(0, 5).map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#FFF7F9] p-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-ink">
                      {l.organizationName}
                    </p>
                    <p className="font-mono text-[10px] text-ink/45">
                      {shortInv(l.id, l.periodStart)} · {fmtDateTime(l.periodStart)} ·{" "}
                      {PLAN_LABEL[l.plan] ?? l.plan}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-bold text-ink">{madHt(l.amount)}</p>
                    <span className="text-[10px] font-bold text-emerald-700">Actif</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <th className="rounded-l-xl p-3">Réf.</th>
                    <th className="p-3">Institut</th>
                    <th className="p-3">Montant HT</th>
                    <th className="p-3">Formule</th>
                    <th className="p-3">Période</th>
                    <th className="rounded-r-xl p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {paidLines.map((l) => (
                    <tr key={l.id} className="border-t border-[#FFEFF8] hover:bg-[#FFF7F9]">
                      <td className="p-3 font-bold text-ink">
                        {shortInv(l.id, l.periodStart)}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-ink">{l.organizationName}</p>
                        <p className="text-[12px] text-ink/50">
                          {l.organizationCity ?? "—"}
                        </p>
                      </td>
                      <td className="p-3 font-bold text-ink">{madHt(l.amount)}</td>
                      <td className="p-3 text-ink/70">{PLAN_LABEL[l.plan] ?? l.plan}</td>
                      <td className="p-3 text-ink/55">{fmtDate(l.periodStart)}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Funnel + movements */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-lg font-bold text-ink">Funnel d&apos;acquisition (estimé)</h4>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                Conversion : {convertRate}%
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink/55">
              Approximation à partir des essais et nouveaux abonnements du mois.
            </p>
          </div>
          <div className="space-y-2">
            {[
              {
                step: 1,
                label: "Essais / démarrages",
                sub: "Inscriptions & essais actifs",
                n: trialStarted,
                pct: 100,
                ml: "",
              },
              {
                step: 2,
                label: "Activations estimées",
                sub: "Cabines & staff configurés",
                n: activated,
                pct: 80,
                ml: "ml-3",
              },
              {
                step: 3,
                label: "Usage régulier estimé",
                sub: "Engagement produit",
                n: engaged,
                pct: 67,
                ml: "ml-6",
              },
              {
                step: 4,
                label: "Abonnements convertis",
                sub: "Nouveaux payants ce mois",
                n: converted,
                pct: convertRate,
                ml: "ml-9",
                highlight: true,
              },
            ].map((s) => (
              <div
                key={s.step}
                className={cn(
                  "flex items-center justify-between rounded-xl p-3",
                  s.highlight ? "bg-primary/10" : "bg-[#FFF7F9]",
                  s.ml,
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold",
                      s.highlight
                        ? "bg-primary text-white"
                        : "bg-[#F0DDE9] text-ink",
                    )}
                  >
                    {s.step}
                  </span>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        s.highlight ? "text-primary" : "text-ink",
                      )}
                    >
                      {s.n} {s.label}
                    </p>
                    <p className="text-[12px] text-ink/50">{s.sub}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold",
                    s.highlight ? "text-primary" : "text-ink",
                  )}
                >
                  {s.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <h4 className="text-lg font-bold text-ink">Mouvements nets ce mois</h4>
            <p className="text-[13px] text-ink/55">Balance arrivées / départs.</p>
          </div>
          <div className="space-y-2">
            <div className="space-y-1 rounded-xl bg-emerald-50 p-3 text-emerald-900">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>+{d.movements.newThisMonth} nouveaux</span>
                <span>+{mad(d.movements.newMrr)}</span>
              </div>
              <p className="text-[12px] text-emerald-800">Croissance du portefeuille.</p>
            </div>
            <div className="space-y-1 rounded-xl bg-red-50 p-3 text-red-800">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>-{d.movements.churnThisMonth} résiliations</span>
                <span>-{mad(d.movements.churnMrr)}</span>
              </div>
              <p className="text-[12px]">Churn du mois en cours.</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3">
            <span className="text-[11px] font-bold text-ink">Variation nette MRR</span>
            <span className="text-sm font-bold text-primary">
              {d.movements.netMrr >= 0 ? "+" : ""}
              {madHt(d.movements.netMrr)}
            </span>
          </div>
        </div>
      </section>

      {/* History + Geo */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-ink">Historique mensuel</h4>
            <span className="text-[11px] text-ink/45">Données abonnements</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                  <th className="rounded-l-xl p-3">Mois</th>
                  <th className="p-3">MRR attendu</th>
                  <th className="p-3">Encaissé</th>
                  <th className="p-3">Impayés</th>
                  <th className="rounded-r-xl p-3 text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {[...d.history].reverse().map((h, i) => (
                  <tr key={h.label} className="border-t border-[#FFEFF8]">
                    <td
                      className={cn(
                        "p-3 font-bold",
                        i === 0 ? "text-primary" : "text-ink",
                      )}
                    >
                      {h.label}
                    </td>
                    <td className="p-3 font-bold text-ink">{mad(h.mrr)}</td>
                    <td className="p-3 font-bold text-emerald-600">{mad(h.collected)}</td>
                    <td className="p-3 font-medium text-red-600">{mad(h.pastDue)}</td>
                    <td className="p-3 text-right">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        {h.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-ink">Poids économique par ville</h4>
              <MapPin className="h-5 w-5 text-ink/40" />
            </div>
            <p className="mt-1 text-[13px] text-ink/55">
              Ventilation territoriale du MRR.
            </p>
          </div>
          {d.cityMrr.length === 0 ? (
            <p className="text-sm text-ink/40">Pas encore de données géo.</p>
          ) : (
            <div className="space-y-3">
              {d.cityMrr.map((c, i) => (
                <div key={c.city}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="font-bold text-ink">
                      {c.city} ({c.pct}%)
                    </span>
                    <span className="font-mono font-bold text-primary">{mad(c.mrr)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F0DDE9]">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        i === 0 ? "bg-primary" : i < 3 ? "bg-primary/70" : "bg-[#E4BDC2]",
                      )}
                      style={{ width: `${Math.min(100, c.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Renewals + CNDP */}
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFEFF8] text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-ink">
              Échéancier prévisionnel des renouvellements
            </h4>
            <p className="text-[13px] text-ink/55">
              Flux programmés selon currentPeriodEnd des abonnements.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-xl bg-[#FFF7F9] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Aujourd&apos;hui
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-black text-ink">
                {d.renewals.todayCount} abo.
              </span>
              <span className="text-sm font-bold text-primary">
                {madHt(d.renewals.todayAmount)}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-[#FFF7F9] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              7 prochains jours
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-black text-ink">
                {d.renewals.next7Count} abo.
              </span>
              <span className="text-sm font-bold text-primary">
                {madHt(d.renewals.next7Amount)}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-[#FFF7F9] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              30 prochains jours
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-black text-ink">
                {d.renewals.next30Count} abo.
              </span>
              <span className="text-sm font-bold text-primary">
                {madHt(d.renewals.next30Amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 rounded-xl bg-[#FFEFF8]/80 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#7B5900]" />
            <div>
              <p className="text-sm font-bold text-ink">
                Intégrité architecturale &amp; cloisonnement
              </p>
              <p className="text-[13px] text-ink/55">
                Séparation stricte{" "}
                <strong className="text-ink">Subscription</strong> (obligation
                récurrente) ≠ <strong className="text-ink">Invoice</strong> (caisse
                institut) ≠ <strong className="text-ink">Payment</strong> (POS). Le MRR
                plateforme est dérivé des abonnements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap text-[11px] text-ink/50">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            CNDP Loi 09-08
          </div>
        </div>
      </section>
    </div>
  );
}
