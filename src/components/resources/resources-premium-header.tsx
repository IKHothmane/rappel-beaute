"use client";
import { MetricCard } from "@/components/ui/metric-card";

import {
  CalendarClock,
  CheckCircle2,
  Layers3,
  Plus,
  Wrench,
} from "lucide-react";

type Props = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  canWrite: boolean;
  onCreate: () => void;
};

export function ResourcesPremiumHeader({
  total,
  available,
  occupied,
  maintenance,
  canWrite,
  onCreate,
}: Props) {
  const stats = [
    {
      label: "Ressources totales",
      value: total,
      icon: Layers3,
      color: "bg-[#FCE3EB] text-[#AD1451]",
    },
    {
      label: "Disponibles",
      value: available,
      icon: CheckCircle2,
      color: "bg-[#DFF6E9] text-[#17834F]",
    },
    {
      label: "En cours d'utilisation",
      value: occupied,
      icon: CalendarClock,
      color: "bg-[#FFF0D8] text-[#B67A12]",
    },
    {
      label: "Maintenance prévue",
      value: maintenance,
      icon: Wrench,
      color: "bg-[#FCE1E6] text-[#B42348]",
    },
  ];

  return (
    <div className="space-y-4">
      <header
        className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Ressources
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Gérez vos salles, cabines, fauteuils et équipements depuis un seul espace.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={onCreate}
            className="relative z-10 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#A40E49] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#801035]"
          >
            <Plus size={18} />
            Nouvelle ressource
          </button>
        ) : null}
      </header>

      <div className="rb-metric-row">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <MetricCard key={stat.label} title={stat.label} value={stat.value} icon={<Icon />} />
          );
        })}
      </div>
    </div>
  );
}
