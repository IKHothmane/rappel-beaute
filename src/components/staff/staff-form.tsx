"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { limitPhoneDigits } from "@/lib/validation/customer";
import { listServices } from "@/modules/services/service";
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
  const [phone, setPhone] = useState(limitPhoneDigits(initial?.phone ?? ""));
  const [email, setEmail] = useState(initial?.email ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [status, setStatus] = useState<StaffStatus>(initial?.status ?? "ACTIVE");
  const [hireDate, setHireDate] = useState(
    initial?.hireDate ? initial.hireDate.slice(0, 10) : "",
  );
  const [serviceIds, setServiceIds] = useState<string[]>(
    initial?.serviceIds ?? initial?.services?.map((s) => s.serviceId) ?? [],
  );
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setServicesLoading(true);
    listServices({ active: true, limit: 100 })
      .then((res) => {
        if (!cancelled) setServices(res.data.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

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
      serviceIds,
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
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
          placeholder="0655443322"
        />
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

      <div>
        <p className="mb-1.5 text-sm font-medium">Services qu&apos;elle peut réaliser</p>
        {servicesLoading ? (
          <p className="text-[13px] text-ink/45">Chargement des services…</p>
        ) : services.length === 0 ? (
          <p className="text-[13px] text-ink/45">Aucun service dans le catalogue.</p>
        ) : (
          <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg bg-[#FFEFF8] p-2">
            {services.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-[13px] hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                <span className="truncate">{s.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

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
