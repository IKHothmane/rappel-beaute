"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import type { CreateStaffInput, StaffDetail, StaffStatus } from "@/types/staff";
import { STAFF_STATUS_LABEL } from "@/types/staff";

type StaffFormProps = {
  initial?: Partial<StaffDetail>;
  submitting?: boolean;
  onSubmit: (data: CreateStaffInput) => void;
  onCancel: () => void;
};

const STATUSES: StaffStatus[] = ["ACTIVE", "INACTIVE", "ON_LEAVE", "ARCHIVED"];

export function StaffForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [status, setStatus] = useState<StaffStatus>(initial?.status ?? "ACTIVE");
  const [hireDate, setHireDate] = useState(
    initial?.hireDate ? initial.hireDate.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      position: position.trim() || undefined,
      status,
      hireDate: hireDate || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Prénom *</span>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nom</span>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Téléphone</span>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6 XX XX XX XX" />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">E-mail</span>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Poste</span>
        <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Esthéticienne" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Statut</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value as StaffStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STAFF_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Date d&apos;embauche</span>
          <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Notes</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Créer l'employée"}
        </Button>
      </div>
    </form>
  );
}
