"use client";

import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { AgendaView } from "@/types/appointment";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { APPOINTMENT_STATUS_LABEL } from "@/modules/appointments/constants";
import type { AppointmentStatus } from "@/types/appointment";
import type { ServiceAgendaOption } from "@/types/service";
import type { ServiceFormOptions } from "@/types/service";

type AgendaToolbarProps = {
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  dateLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  staffFilter: string;
  serviceFilter: string;
  resourceFilter: string;
  statusFilter: AppointmentStatus | "ALL";
  search: string;
  services: ServiceAgendaOption[];
  staffOptions: ServiceFormOptions["staff"];
  resourceOptions: ServiceFormOptions["resources"];
  onStaffFilter: (v: string) => void;
  onServiceFilter: (v: string) => void;
  onResourceFilter: (v: string) => void;
  onStatusFilter: (v: AppointmentStatus | "ALL") => void;
  onSearch: (v: string) => void;
  onCreate: () => void;
};

export function AgendaHeader({
  dateLabel,
  onCreate,
}: {
  dateLabel: string;
  onCreate: () => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-primary capitalize">{dateLabel}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Agenda
        </h1>
        <p className="mt-2 text-sm text-ink/50">
          Anti double-réservation — le backend revérifiera en transaction PostgreSQL.
        </p>
      </div>
      <Button type="button" variant="primary" className="group w-full sm:w-auto" onClick={onCreate}>
        <Plus size={18} />
        Nouveau rendez-vous
      </Button>
    </div>
  );
}

export function AgendaToolbar({
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  staffFilter,
  serviceFilter,
  resourceFilter,
  statusFilter,
  search,
  onStaffFilter,
  onServiceFilter,
  onResourceFilter,
  onStatusFilter,
  onSearch,
  services,
  staffOptions,
  resourceOptions,
}: AgendaToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-line p-2 hover:bg-[#FBF4F6]"
            onClick={onPrev}
            aria-label="Jour précédent"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="rounded-xl border border-line px-3 py-2 text-sm font-medium hover:bg-[#FBF4F6]"
            onClick={onToday}
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            className="rounded-xl border border-line p-2 hover:bg-[#FBF4F6]"
            onClick={onNext}
            aria-label="Jour suivant"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <Tabs
          className="hidden sm:flex lg:max-w-xs"
          tabs={[
            { id: "day", label: "Jour" },
            { id: "week", label: "Semaine" },
            { id: "month", label: "Mois" },
          ]}
          value={view}
          onChange={(v) => onViewChange(v as AgendaView)}
        />
      </div>

      <div className="hidden flex-col gap-3 md:flex md:flex-row md:flex-wrap">
        <Dropdown
          className="md:w-44"
          value={staffFilter}
          onChange={onStaffFilter}
          options={[
            { value: "ALL", label: "Employées" },
            ...staffOptions.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Dropdown
          className="md:w-44"
          value={serviceFilter}
          onChange={onServiceFilter}
          options={[
            { value: "ALL", label: "Services" },
            ...services.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Dropdown
          className="md:w-44"
          value={resourceFilter}
          onChange={onResourceFilter}
          options={[
            { value: "ALL", label: "Ressources" },
            ...resourceOptions.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
        <Dropdown
          className="md:w-44"
          value={statusFilter}
          onChange={(v) => onStatusFilter(v as AppointmentStatus | "ALL")}
          options={[
            { value: "ALL", label: "Statuts" },
            ...(Object.keys(APPOINTMENT_STATUS_LABEL) as AppointmentStatus[]).map((k) => ({
              value: k,
              label: APPOINTMENT_STATUS_LABEL[k],
            })),
          ]}
        />
        <div className="relative md:min-w-[200px] md:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <Input
            className="pl-9"
            placeholder="Rechercher cliente, service…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
