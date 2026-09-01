"use client";

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

export default function DashboardPage() {
  const user = useCurrentUser();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Dimanche 30 août 2026</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Bonjour {user.firstName}
          </h1>
          <p className="mt-2 text-sm text-ink/50">
            Voici ce qui se passe dans votre institut aujourd&apos;hui.
          </p>
        </div>

        <Link href="/agenda/">
          <Button className="group" variant="primary">
            <Plus size={18} />
            Nouveau rendez-vous
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires"
          value="4 850 MAD"
          change="+18.4%"
          description="vs. dimanche dernier"
          icon={CircleDollarSign}
          delay={0.05}
        />
        <KpiCard
          title="Rendez-vous"
          value="12"
          change="+3"
          description="Aujourd'hui"
          icon={CalendarCheck}
          delay={0.1}
        />
        <KpiCard
          title="Clientes"
          value="8"
          change="+2"
          description="Nouvelles ce mois"
          icon={Users}
          delay={0.15}
        />
        <KpiCard
          title="Taux d'occupation"
          value="78%"
          change="+6.2%"
          description="Cette semaine"
          icon={TrendingUp}
          delay={0.2}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <TodayAppointments />
          <RevenueChart />
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl bg-gradient-to-br from-primary via-primary to-gold p-6 text-white shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Sparkles size={21} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold">
              Votre institut se porte bien
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Votre chiffre d&apos;affaires est supérieur de 18 % à celui de la
              semaine dernière.
            </p>
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
          <div className="mt-5 font-mono text-3xl font-bold">2</div>
          <p className="mt-1 text-sm text-ink/45">
            rendez-vous en attente de confirmation
          </p>
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
              <p className="text-xs text-ink/45">Pas de visite depuis plus de 45 jours</p>
            </div>
          </div>
          <div className="mt-5 font-mono text-3xl font-bold">14</div>
          <p className="mt-1 text-sm text-ink/45">clientes susceptibles de revenir</p>
          <Link href="/customers/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Voir les clientes →
          </Link>
        </section>
      </div>
    </motion.div>
  );
}
