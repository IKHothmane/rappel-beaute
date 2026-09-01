"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import type { CreateExpenseInput, ExpenseCategory, ExpenseDetail } from "@/types/expense";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
} from "@/types/expense";
import type { PaymentMethod } from "@/types/finance";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS } from "@/types/finance";

type SupplierOpt = { id: string; name: string };

type Props = {
  initial?: Partial<ExpenseDetail>;
  suppliers: SupplierOpt[];
  submitting?: boolean;
  onSubmit: (data: CreateExpenseInput) => void;
  onCancel: () => void;
};

export function ExpenseForm({
  initial,
  suppliers,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [category, setCategory] = useState<ExpenseCategory>(
    initial?.category ?? "OTHER",
  );
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [expenseDate, setExpenseDate] = useState(
    initial?.expenseDate
      ? initial.expenseDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? "TRANSFER",
  );
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          category,
          amount: Number(amount),
          expenseDate,
          paymentMethod,
          supplierId: supplierId || undefined,
          description: description.trim() || undefined,
          reference: reference.trim() || undefined,
        });
      }}
    >
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Catégorie *</span>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
        {category === "PRODUCT_PURCHASE" ? (
          <span className="mt-1 block text-xs text-amber-800">
            Pour un achat stock, utilisez Purchase — pas Expense — afin d&apos;éviter le
            double-comptage.
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Montant (MAD) *</span>
        <Input
          type="number"
          min={0.01}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Date *</span>
        <Input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Méthode *</span>
        <Select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABEL[m]}
            </option>
          ))}
        </Select>
        {paymentMethod === "CASH" ? (
          <span className="mt-1 block text-xs text-ink/45">
            Créera une sortie de caisse physique (caisse ouverte requise).
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Fournisseur</span>
        <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Description</span>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Référence</span>
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="FAC-08-2026"
        />
      </label>
      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
