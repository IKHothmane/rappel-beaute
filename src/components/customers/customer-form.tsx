"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { limitPhoneDigits } from "@/lib/validation/customer";
import type { CreateCustomerInput, CustomerDetail } from "@/types/customer";

type CustomerFormProps = {
  initial?: Partial<CustomerDetail>;
  submitting?: boolean;
  canEditMarketing?: boolean;
  onSubmit: (data: CreateCustomerInput) => void;
  onCancel: () => void;
};

export function CustomerForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(limitPhoneDigits(initial?.phone ?? ""));
  const [email, setEmail] = useState(initial?.email ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
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
          <span className="mb-1.5 block font-medium">Nom *</span>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Téléphone *</span>
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
          placeholder="0655443322"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">E-mail</span>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Créer la cliente"}
        </Button>
      </div>
    </form>
  );
}
