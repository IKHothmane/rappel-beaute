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
      <section className="rounded-2xl bg-institut p-5 text-white/70 shadow-md">
        <p className="text-sm">Analyse IA…</p>
      </section>
    );
  }

  if (!isEnabled("ai")) {
    return null;
  }

  if (error) {
    return (
      <section className="rounded-2xl bg-institut p-5 text-white/80 shadow-md">
        <p className="text-sm">{error}</p>
      </section>
    );
  }

  if (!insight || insight.empty) {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-institut p-5 text-white shadow-md sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-gold" />
          <h2 className="text-sm font-bold tracking-wide text-gold">Rappel Beauté Intelligence</h2>
        </div>
        <p className="mt-3 text-sm text-white/70">
          Pas encore assez d&apos;activité {insight?.periodLabel ?? "cette semaine"} pour une
          analyse.
        </p>
        <Link href="/ai/" className="mt-4 inline-flex text-sm font-semibold text-gold">
          Ouvrir l&apos;assistant →
        </Link>
      </section>
    );
  }

  const caPct = insight.kpis.revenueChangePercent;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-institut p-5 text-white shadow-md sm:p-6">
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44 rounded-full bg-gold/15 blur-2xl" />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-gold" />
          <div>
            <h2 className="text-sm font-bold tracking-wide text-gold">Rappel Beauté Intelligence</h2>
            <p className="text-xs text-white/50">Votre activité {insight.periodLabel}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-white/5 px-2 py-3">
          <p className="text-[10px] uppercase tracking-wide text-white/40">CA</p>
          <p className="mt-1 font-semibold text-gold">{caPct != null ? formatPct(caPct) : "—"}</p>
          <p className="mt-0.5 text-[10px] text-white/40">{formatMad(insight.kpis.revenue)}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-3">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Clientes</p>
          <p className="mt-1 font-semibold">{deltaLabel(insight.kpis.customersDelta)}</p>
          <p className="mt-0.5 text-[10px] text-white/40">{insight.kpis.customersNew} nouvelles</p>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-3">
          <p className="text-[10px] uppercase tracking-wide text-white/40">No-show</p>
          <p className="mt-1 font-semibold">
            {insight.kpis.noShowRate != null ? `${insight.kpis.noShowRate} %` : "—"}
          </p>
        </div>
      </div>

      {insight.opportunities.length > 0 ? (
        <ul className="relative z-10 mt-4 space-y-2 text-sm text-white/80">
          {insight.opportunities.slice(0, 4).map((o, i) => (
            <li key={i} className="flex gap-2 rounded-lg bg-white/5 p-2">
              <span className="text-gold">•</span>
              <span>{o.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="relative z-10 mt-3 text-[10px] text-white/35">{insight.disclaimer}</p>

      <div className="relative z-10 mt-4 flex flex-wrap gap-3">
        <Link href="/ai/" className="inline-flex items-center gap-1 text-sm font-semibold text-gold">
          Voir les détails
          <ArrowRight size={14} />
        </Link>
        <Link href="/analytics/" className="text-sm text-white/45 underline">
          Analytics
        </Link>
      </div>
    </section>
  );
}
