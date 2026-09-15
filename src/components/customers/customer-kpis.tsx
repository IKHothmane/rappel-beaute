"use client";

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
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{card.label}</span>
              <span className={cn("rounded-lg p-1.5", iconBox[card.tone])}>
                <Icon size={15} />
              </span>
            </div>
            <div className="mt-2">
              <p
                className={cn(
                  "font-display text-[22px] font-bold leading-7 tracking-tight",
                  card.tone === "primary" ? "text-primary" : card.tone === "amber" ? "text-amber-800" : "text-ink",
                )}
              >
                {card.value}
              </p>
              {card.hint ? <p className="mt-0.5 text-[11px] font-medium text-ink/45">{card.hint}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
