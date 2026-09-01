"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StaffBreakSlot, StaffScheduleSlot } from "@/types/staff";
import { DAY_LABELS } from "@/types/staff";

const DEFAULT_SCHEDULE: StaffScheduleSlot[] = [1, 2, 3, 4, 5, 6].map((day) => ({
  dayOfWeek: day,
  startTime: day === 6 ? "10:00" : "09:00",
  endTime: day === 6 ? "15:00" : day === 5 ? "16:00" : "18:00",
  active: true,
}));

type StaffScheduleFormProps = {
  initialSchedules?: StaffScheduleSlot[];
  initialBreaks?: StaffBreakSlot[];
  submitting?: boolean;
  onSubmit: (data: { schedules: StaffScheduleSlot[]; breaks: StaffBreakSlot[] }) => void;
};

export function StaffScheduleForm({
  initialSchedules,
  initialBreaks,
  submitting,
  onSubmit,
}: StaffScheduleFormProps) {
  const [schedules, setSchedules] = useState<StaffScheduleSlot[]>(() => {
    if (initialSchedules?.length) {
      const map = new Map(initialSchedules.map((s) => [s.dayOfWeek, s]));
      return Array.from({ length: 7 }, (_, i) =>
        map.get(i) ?? { dayOfWeek: i, startTime: "09:00", endTime: "18:00", active: false },
      );
    }
    const map = new Map(DEFAULT_SCHEDULE.map((s) => [s.dayOfWeek, s]));
    return Array.from({ length: 7 }, (_, i) =>
      map.get(i) ?? { dayOfWeek: i, startTime: "09:00", endTime: "18:00", active: false },
    );
  });

  const [breaks, setBreaks] = useState<StaffBreakSlot[]>(initialBreaks ?? []);

  function updateDay(day: number, patch: Partial<StaffScheduleSlot>) {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === day ? { ...s, ...patch } : s)),
    );
  }

  function addBreak() {
    setBreaks((prev) => [...prev, { dayOfWeek: 1, startTime: "12:30", endTime: "14:00" }]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      schedules: schedules.filter((s) => s.active),
      breaks,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Horaires hebdomadaires</h3>
        {schedules.map((s) => (
          <div
            key={s.dayOfWeek}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-3 text-sm"
          >
            <label className="flex w-28 items-center gap-2">
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) => updateDay(s.dayOfWeek, { active: e.target.checked })}
              />
              <span className="font-medium">{DAY_LABELS[s.dayOfWeek]}</span>
            </label>
            {s.active ? (
              <>
                <Input
                  type="time"
                  value={s.startTime}
                  onChange={(e) => updateDay(s.dayOfWeek, { startTime: e.target.value })}
                  className="w-28"
                />
                <span className="text-ink/40">→</span>
                <Input
                  type="time"
                  value={s.endTime}
                  onChange={(e) => updateDay(s.dayOfWeek, { endTime: e.target.value })}
                  className="w-28"
                />
              </>
            ) : (
              <span className="text-ink/45">OFF</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Pauses</h3>
        {breaks.map((b, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              value={b.dayOfWeek}
              onChange={(e) =>
                setBreaks((prev) =>
                  prev.map((x, i) =>
                    i === index ? { ...x, dayOfWeek: Number(e.target.value) } : x,
                  ),
                )
              }
              className="rounded-lg border border-line px-2 py-1.5 text-sm"
            >
              {DAY_LABELS.map((label, di) => (
                <option key={di} value={di}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              type="time"
              value={b.startTime}
              onChange={(e) =>
                setBreaks((prev) =>
                  prev.map((x, i) => (i === index ? { ...x, startTime: e.target.value } : x)),
                )
              }
              className="w-28"
            />
            <span>→</span>
            <Input
              type="time"
              value={b.endTime}
              onChange={(e) =>
                setBreaks((prev) =>
                  prev.map((x, i) => (i === index ? { ...x, endTime: e.target.value } : x)),
                )
              }
              className="w-28"
            />
            <button
              type="button"
              onClick={() => setBreaks((prev) => prev.filter((_, i) => i !== index))}
              className="text-xs text-ink/50 hover:text-red-600"
            >
              Retirer
            </button>
          </div>
        ))}
        <button type="button" onClick={addBreak} className="text-sm text-primary hover:underline">
          + Ajouter une pause
        </button>
      </div>

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "Enregistrement…" : "Enregistrer le planning"}
      </Button>
    </form>
  );
}
