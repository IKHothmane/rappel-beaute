"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { fetchDashboardAIInsight } from "@/modules/ai/service";
import type { AIDashboardInsight } from "@/types/ai";
import { formatMad, formatPct } from "@/modules/analytics/service";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";

function deltaLabel(n: number | null, suffix = "") {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("fr-MA")}${suffix}`;
}

/**
 * Bloc Dashboard — chiffres = Analytics uniquement (pas de LLM).
 */
export function DashboardAiInsights() {
  const { isEnabled, loading: planLoading } = usePlanFeatures();
  const [insight, setInsight] = useState<AIDashboardInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planLoading) return;
    if (!isEnabled("ai")) {
      setLoading(false);
      setInsight(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchDashboardAIInsight();
        if (!cancelled) {
          setInsight(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Analyse indisponible");
          setInsight(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEnabled, planLoading]);

  if (planLoading || loading) {
    return (
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <p className="text-sm text-ink/45">Analyse IA…</p>
      </section>
    );
  }

  if (!isEnabled("ai")) {
    return null;
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <p className="text-sm text-ink/50">{error}</p>
      </section>
    );
  }

  if (!insight || insight.empty) {
    return (
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h2 className="font-semibold">Analyse IA</h2>
        </div>
        <p className="mt-3 text-sm text-ink/50">
          Pas encore assez d&apos;activité {insight?.periodLabel ?? "cette semaine"} pour une
          analyse. Les KPI resteront vides tant que les Analytics n&apos;auront pas de données.
        </p>
        <Link href="/ai/" className="mt-4 inline-flex text-sm font-semibold text-primary">
          Ouvrir l&apos;assistant →
        </Link>
      </section>
    );
  }

  const caPct = insight.kpis.revenueChangePercent;

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <div>
            <h2 className="font-semibold">Analyse IA</h2>
            <p className="text-xs text-ink/45">
              Votre activité {insight.periodLabel} · KPI Analytics
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-ink/[0.03] px-2 py-3">
          <p className="text-[10px] uppercase tracking-wide text-ink/40">CA</p>
          <p className="mt-1 font-mono font-semibold">
            {caPct != null ? formatPct(caPct) : "—"}
          </p>
          <p className="mt-0.5 text-[10px] text-ink/40">{formatMad(insight.kpis.revenue)}</p>
        </div>
        <div className="rounded-xl bg-ink/[0.03] px-2 py-3">
          <p className="text-[10px] uppercase tracking-wide text-ink/40">Clientes</p>
          <p className="mt-1 font-mono font-semibold">
            {deltaLabel(insight.kpis.customersDelta)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink/40">
            {insight.kpis.customersNew} nouvelles
          </p>
        </div>
        <div className="rounded-xl bg-ink/[0.03] px-2 py-3">
          <p className="text-[10px] uppercase tracking-wide text-ink/40">No-show</p>
          <p className="mt-1 font-mono font-semibold">
            {insight.kpis.noShowRate != null ? `${insight.kpis.noShowRate} %` : "—"}
          </p>
        </div>
      </div>

      {insight.opportunities.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-ink/55">Opportunités</p>
          <ul className="mt-2 space-y-2 text-sm text-ink/70">
            {insight.opportunities.slice(0, 4).map((o, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] text-ink/35">{insight.disclaimer}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/ai/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          Voir les détails
          <ArrowRight size={14} />
        </Link>
        <Link href="/analytics/" className="text-sm text-ink/45 underline">
          Analytics
        </Link>
      </div>
    </section>
  );
}
