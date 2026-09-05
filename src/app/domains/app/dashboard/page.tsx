"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CircleDollarSign,
  Clock3,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/components/auth/session-provider";
import { KPI_DEFINITIONS } from "@/lib/analytics/kpi-definitions";
import {
  formatMad,
  formatPct,
  getAnalyticsAppointments,
  getAnalyticsCustomers,
  getAnalyticsOverview,
  getAnalyticsRevenue,
} from "@/modules/analytics/service";
import { listAppointments } from "@/modules/appointments/service";
import type { Appointment } from "@/types/appointment";
import type { AnalyticsOverview, RevenueDailyPoint } from "@/types/analytics";

function formatDelta(current: number, previous: number | null): string {
  if (previous == null) return "—";
  const d = current - previous;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toLocaleString("fr-MA")}`;
}

function positiveFromChange(changePercent: number | null): boolean | null {
  if (changePercent == null) return null;
  if (changePercent === 0) return null;
  return changePercent > 0;
}

function averageOccupation(rates: (number | null)[]): number {
  const valid = rates.filter((r): r is number => r != null);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [occupationRate, setOccupationRate] = useState(0);
  const [atRisk, setAtRisk] = useState(0);
  const [daily, setDaily] = useState<RevenueDailyPoint[]>([]);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Casablanca",
      }),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, apptsAnalytics, customers, revenue, allAppts] = await Promise.all([
        getAnalyticsOverview({ preset: "today", compare: true }),
        getAnalyticsAppointments({ preset: "week", compare: false }),
        getAnalyticsCustomers({ preset: "month", compare: false }),
        getAnalyticsRevenue({ preset: "week", compare: false }),
        listAppointments(),
      ]);

      setOverview(ov);
      setOccupationRate(averageOccupation(apptsAnalytics.occupationByWeekday.map((d) => d.rate)));
      setAtRisk(customers.kpis.atRisk);
      setDaily(revenue.daily);

      const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
      setTodayAppts(
        allAppts
          .filter((a) => a.startAt.slice(0, 10) === todayKey)
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le tableau de bord.");
      setOverview(null);
      setOccupationRate(0);
      setAtRisk(0);
      setDaily([]);
      setTodayAppts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = todayAppts.filter((a) => a.status === "PENDING").length;

  const insight = useMemo(() => {
    const pct = overview?.revenue.changePercent;
    if (pct == null) {
      return "Suivez l'activité de votre institut en temps réel.";
    }
    if (pct > 0) {
      return `Votre chiffre d'affaires net est supérieur de ${pct.toFixed(1)} % à la période précédente.`;
    }
    if (pct < 0) {
      return `Votre chiffre d'affaires net est inférieur de ${Math.abs(pct).toFixed(1)} % à la période précédente.`;
    }
    return "Votre chiffre d'affaires net est stable par rapport à la période précédente.";
  }, [overview]);

  const caValue = overview ? formatMad(overview.revenue.value) : "0 MAD";
  const rdvValue = overview ? String(overview.appointments.value) : "0";
  const customersValue = overview ? String(overview.customers.value) : "0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-primary">{todayLabel}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Bonjour {user.firstName}
          </h1>
          <p className="mt-2 text-sm text-ink/50">
            Voici ce qui se passe dans votre institut aujourd&apos;hui.
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
            Actualiser
          </Button>
          <Link href="/agenda/">
            <Button className="group" variant="primary">
              <Plus size={18} />
              Nouveau rendez-vous
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={loading ? "…" : caValue}
          change={loading ? null : formatPct(overview?.revenue.changePercent ?? null)}
          description="Aujourd'hui · CA net officiel · vs période précédente"
          icon={CircleDollarSign}
          positive={positiveFromChange(overview?.revenue.changePercent ?? null)}
          delay={0.05}
        />
        <KpiCard
          title="Rendez-vous"
          value={loading ? "…" : rdvValue}
          change={
            loading
              ? null
              : formatDelta(overview?.appointments.value ?? 0, overview?.appointments.previous ?? null)
          }
          description="Aujourd'hui · définition RDV_TOTAL"
          icon={CalendarCheck}
          positive={positiveFromChange(overview?.appointments.changePercent ?? null)}
          delay={0.1}
        />
        <KpiCard
          title="Clientes"
          value={loading ? "…" : customersValue}
          change={null}
          description={KPI_DEFINITIONS.CLIENTE_ACTIVE}
          icon={Users}
          positive={null}
          delay={0.15}
        />
        <KpiCard
          title="Taux d'occupation"
          value={loading ? "…" : `${occupationRate} %`}
          change={null}
          description="Cette semaine · OCCUPATION (StaffSchedule)"
          icon={TrendingUp}
          positive={null}
          delay={0.2}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <TodayAppointments appointments={todayAppts} loading={loading} />
          <RevenueChart daily={daily} loading={loading} />
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl bg-gradient-to-br from-primary via-primary to-gold p-6 text-white shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Sparkles size={21} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold">Votre institut</h2>
            <p className="mt-2 text-sm leading-6 text-white/80">{insight}</p>
            <Link
              href="/analytics/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:scale-[1.02]"
            >
              Voir les statistiques
              <ArrowRight size={16} />
            </Link>
          </section>

          <StockAlerts />
          <RecentActivity />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Clock3 size={19} />
            </div>
            <div>
              <h2 className="font-semibold">À confirmer</h2>
              <p className="text-xs text-ink/45">Clientes à contacter aujourd&apos;hui</p>
            </div>
          </div>
          <div className="mt-5 font-mono text-3xl font-bold">{loading ? "…" : pendingCount}</div>
          <p className="mt-1 text-sm text-ink/45">rendez-vous en attente de confirmation</p>
          <Link href="/whatsapp/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Ouvrir WhatsApp →
          </Link>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users size={19} />
            </div>
            <div>
              <h2 className="font-semibold">Clientes à relancer</h2>
              <p className="text-xs text-ink/45">Segment à risque (analytics)</p>
            </div>
          </div>
          <div className="mt-5 font-mono text-3xl font-bold">{loading ? "…" : atRisk}</div>
          <p className="mt-1 text-sm text-ink/45">clientes susceptibles de revenir</p>
          <Link href="/customers/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Voir les clientes →
          </Link>
        </section>
      </div>
    </motion.div>
  );
}
