"use client";
import { MetricCard } from "@/components/ui/metric-card";

import {
  CheckCircle2,
  Clock3,
  ShoppingBag,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { formatMad, formatPct } from "@/modules/analytics/service";
import type { CustomerKpis } from "@/types/customer";
import { cn } from "@/lib/utils";

type CustomerKpisRowProps = {
  kpis: CustomerKpis;
  revenue?: number | null;
  revenueChange?: number | null;
  averageTicket?: number | null;
  ticketChange?: number | null;
  financeHidden?: boolean;
};

export function CustomerKpisRow({
  kpis,
  revenue,
  revenueChange,
  averageTicket,
  ticketChange,
  financeHidden,
}: CustomerKpisRowProps) {
  const cards = [
    {
      label: "Total clientes",
      value: String(kpis.total),
      hint: null as string | null,
      icon: Users,
      tone: "ink" as const,
    },
    {
      label: "Nouvelles",
      value: String(kpis.newCount),
      hint: "30 derniers jours",
      icon: UserPlus,
      tone: "primary" as const,
    },
    {
      label: "Actives",
      value: String(kpis.activeCount),
      hint: `${kpis.vipCount} VIP`,
      icon: CheckCircle2,
      tone: "emerald" as const,
    },
    {
      label: "À relancer",
      value: String(kpis.atRiskCount),
      hint: kpis.inactiveCount ? `${kpis.inactiveCount} inactives` : "Sans visite récente",
      icon: Clock3,
      tone: "amber" as const,
    },
    {
      label: "CA du mois",
      value: financeHidden ? "—" : revenue != null ? formatMad(revenue) : "—",
      hint: financeHidden
        ? "Accès limité"
        : revenueChange != null
          ? `${formatPct(revenueChange)} vs mois préc.`
          : "Période en cours",
      icon: Wallet,
      tone: "gold" as const,
    },
    {
      label: "Panier moyen",
      value: financeHidden ? "—" : averageTicket != null ? formatMad(averageTicket) : "—",
      hint: financeHidden
        ? "Accès limité"
        : ticketChange != null
          ? `${formatPct(ticketChange)} vs mois préc.`
          : "Période en cours",
      icon: ShoppingBag,
      tone: "rose" as const,
    },
  ];

  const iconBox = {
    ink: "bg-[#FCE9F4] text-ink",
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-700",
    gold: "bg-[#FCCA66]/20 text-[#7B5900]",
    rose: "bg-[#FFD9DE] text-primary",
  };

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6 rb-metric-row">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <MetricCard key={card.label} title={card.label} value={card.value} icon={<Icon />} hint={card.hint} />
        );
      })}
    </div>
  );
}
