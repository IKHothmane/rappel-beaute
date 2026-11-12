"use client";
import { MetricCard } from "@/components/ui/metric-card";

import { CalendarDays } from "lucide-react";
import type { AgendaView, AppointmentStatus } from "@/types/appointment";
import type { ServiceAgendaOption } from "@/types/service";
import type { ServiceFormOptions } from "@/types/service";

export type AgendaKpis = {
  todayCount: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  forecast: number;
  secured: number;
  occupancy: number | null;
  starLabel: string | null;
};

type ChromeProps = {
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  rangeLabel: string;
  todayChip: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: () => void;
  onFullscreen?: () => void;
  kpis: AgendaKpis;
  staffFilter: string;
  serviceFilter: string;
  resourceFilter: string;
  statusFilter: AppointmentStatus | "ALL";
  search: string;
  services: ServiceAgendaOption[];
  staffOptions: ServiceFormOptions["staff"];
  resourceOptions: ServiceFormOptions["resources"];
  staffCounts: Record<string, number>;
  whatsappConnected: boolean | null;
  onStaffFilter: (v: string) => void;
  onServiceFilter: (v: string) => void;
  onResourceFilter: (v: string) => void;
  onStatusFilter: (v: AppointmentStatus | "ALL") => void;
  onSearch: (v: string) => void;
};

const VIEWS: { id: AgendaView; label: string }[] = [
  { id: "day", label: "Jour" },
  { id: "3days", label: "3 jours" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
];

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  tint,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  hint?: string | null;
  tint: string;
}) {
  return <MetricCard title={label} value={value} icon={<Icon />} hint={hint}></MetricCard>;
}
