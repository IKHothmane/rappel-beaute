"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { AgendaView } from "@/types/appointment";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import type { Appointment } from "@/types/appointment";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Tabs } from "@/components/ui/tabs";
import { STAFF } from "@/lib/app-mock";

type AgendaMobileProps = {
  date: Date;
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  staffFilter: string;
  onStaffFilter: (id: string) => void;
  appointments: Appointment[];
  onAppointmentClick: (id: string) => void;
  onCreate: () => void;
};

export function AgendaMobile({
  date,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  staffFilter,
  onStaffFilter,
  appointments,
  onAppointmentClick,
  onCreate,
}: AgendaMobileProps) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div className="md:hidden">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold capitalize">
            {date.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Button type="button" variant="brand" size="icon" onClick={onCreate} aria-label="Nouveau RDV">
          <Plus size={18} />
        </Button>
      </div>

      <Tabs
        className="mb-4"
        tabs={[
          { id: "day", label: "Jour" },
          { id: "week", label: "Semaine" },
          { id: "month", label: "Mois" },
        ]}
        value={view}
        onChange={(v) => onViewChange(v as AgendaView)}
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <button type="button" className="rounded-xl border border-line p-2" onClick={onPrev}>
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="rounded-xl border border-line px-3 py-2 text-sm font-medium"
          onClick={onToday}
        >
          Aujourd&apos;hui
        </button>
        <button type="button" className="rounded-xl border border-line p-2" onClick={onNext}>
          <ChevronRight size={18} />
        </button>
      </div>

      <Dropdown
        className="mb-4"
        value={staffFilter}
        onChange={onStaffFilter}
        options={[
          { value: "ALL", label: "Toutes les employées" },
          ...STAFF.map((s) => ({ value: s.id, label: s.name })),
        ]}
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="Aucun rendez-vous"
          description="Ce jour est libre. Créez un nouveau rendez-vous."
          action={
            <Button variant="primary" onClick={onCreate}>
              + Nouveau RDV
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((apt) => {
            const start = new Date(apt.startAt);
            return (
              <div key={apt.id}>
                <p className="mb-2 font-mono text-sm font-bold text-ink">
                  {start.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <AppointmentCard
                  appointment={apt}
                  onClick={() => onAppointmentClick(apt.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
