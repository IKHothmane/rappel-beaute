"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Slot = { time: string; available: boolean; reason?: string };

type AvailabilitySlotsProps = {
  slots: Slot[];
  value?: string;
  onSelect: (time: string) => void;
  loading?: boolean;
};

export function AvailabilitySlots({
  slots,
  value,
  onSelect,
  loading,
}: AvailabilitySlotsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-[#F0E3E6]" />
        ))}
      </div>
    );
  }

  if (!slots.length) {
    return (
      <p className="text-sm text-ink/50">Aucun créneau pour cette date.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const selected = value === slot.time;
        return (
          <button
            key={slot.time}
            type="button"
            title={slot.reason}
            disabled={!slot.available}
            onClick={() => onSelect(slot.time)}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg border py-2 font-mono text-sm transition",
              !slot.available && "cursor-not-allowed border-line bg-[#F3F4F6] text-ink/30",
              slot.available && selected && "border-primary bg-primary-light text-primary-dark",
              slot.available && !selected && "border-line bg-white hover:border-primary/40",
            )}
          >
            {selected ? <Check size={14} /> : null}
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}
