"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/select";
import type { CreateSupplierInput, SupplierDetail } from "@/types/procurement";

type Props = {
  initial?: Partial<SupplierDetail>;
  submitting?: boolean;
  onSubmit: (data: CreateSupplierInput) => void;
  onCancel: () => void;
};

export function SupplierForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          active,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-medium">Raison sociale *</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Laboratoires Atlas"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Contact commercial</span>
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Nom du responsable"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Téléphone / WhatsApp</span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 …"
            type="tel"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-medium">Email commandes</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="achats@fournisseur.ma"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Adresse</span>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Notes (conditions, délais…)</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        Activer immédiatement ce partenaire
      </label>
      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Enregistrer le fournisseur"}
        </Button>
      </div>
    </form>
  );
}
