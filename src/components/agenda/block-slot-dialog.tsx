"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/select";

const REASONS = [
  "Pause déjeuner / repos",
  "Désinfection & stérilisation",
  "Formation interne / réunion",
  "Maintenance cabine",
  "Congé ou absence",
];

type BlockSlotDialogProps = {
  open: boolean;
  date: Date;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (input: { startAt: string; endAt: string; reason: string }) => void;
};

export function BlockSlotDialog({ open, date, submitting, onClose, onConfirm }: BlockSlotDialogProps) {
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("14:00");
  const [reason, setReason] = useState(REASONS[0]);

  function submit() {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startAt = new Date(date);
    startAt.setHours(sh, sm, 0, 0);
    const endAt = new Date(date);
    endAt.setHours(eh, em, 0, 0);
    if (endAt <= startAt) return;
    onConfirm({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), reason });
  }

  return (
    <Modal open={open} onClose={onClose} title="Bloquer un créneau">
      <p className="mb-4 text-sm text-ink/55">
        Le créneau devient indisponible à la réservation en ligne pour tout l&apos;institut
        le {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Début</Label>
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 font-mono" />
        </div>
        <div>
          <Label>Fin</Label>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 font-mono" />
        </div>
      </div>
      <div className="mt-3">
        <Label>Motif</Label>
        <Select className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button type="button" variant="brand" onClick={submit} disabled={submitting}>
          <Lock size={15} />
          {submitting ? "…" : "Confirmer le blocage"}
        </Button>
      </div>
    </Modal>
  );
}
