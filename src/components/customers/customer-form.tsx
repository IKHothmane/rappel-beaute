"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  canEditMarketing = true,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [birthDate, setBirthDate] = useState(
    initial?.birthDate ? initial.birthDate.slice(0, 10) : "",
  );
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [marketingWhatsapp, setMarketingWhatsapp] = useState(
    initial?.marketingWhatsapp ?? false,
  );
  const [marketingEmail, setMarketingEmail] = useState(initial?.marketingEmail ?? false);
  const [marketingSms, setMarketingSms] = useState(initial?.marketingSms ?? false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      birthDate: birthDate || undefined,
      instagram: instagram.trim() || undefined,
      notes: notes.trim() || undefined,
      marketingWhatsapp: canEditMarketing ? marketingWhatsapp : undefined,
      marketingEmail: canEditMarketing ? marketingEmail : undefined,
      marketingSms: canEditMarketing ? marketingSms : undefined,
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
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+212 6 XX XX XX XX"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">E-mail</span>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Date de naissance</span>
        <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Instagram</span>
        <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@sara" />
      </label>

      {canEditMarketing ? (
        <div className="space-y-2 rounded-lg border border-line bg-paper/50 p-3 text-sm">
          <p className="font-medium text-ink/70">Consentements marketing</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={marketingWhatsapp}
              onChange={(e) => setMarketingWhatsapp(e.target.checked)}
            />
            Accepte WhatsApp marketing
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={marketingEmail}
              onChange={(e) => setMarketingEmail(e.target.checked)}
            />
            Accepte e-mail marketing
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={marketingSms}
              onChange={(e) => setMarketingSms(e.target.checked)}
            />
            Accepte SMS marketing
          </label>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary"
        />
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
