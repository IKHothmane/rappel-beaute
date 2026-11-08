"use client";

import { Plus } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { periodLabel, type ExpensePeriod } from "./expense-helpers";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@/types/finance";

export function ExpenseBanner({ orgName, canCreate, onCreate }: { orgName: string; canCreate: boolean; onCreate: () => void }) {
  return (
    <header className="relative flex min-h-[108px] flex-col justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:px-7" style={{ backgroundImage: 'linear-gradient(90deg,rgba(255,247,247,.94),rgba(255,239,239,.35)),url("/marketing/hero-background.png")', backgroundPosition: "center", backgroundSize: "cover" }}>
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">Dépenses & budgets</h1>
        <p className="mt-1 text-sm text-[#654254]">Suivez vos charges, vos justificatifs et votre budget · {orgName}</p>
      </div>
      {canCreate ? <button type="button" onClick={onCreate} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#AC0E4C] px-5 text-sm font-bold text-white shadow-md hover:bg-[#850F3C]"><Plus size={17} />Nouvelle dépense</button> : null}
    </header>
  );
}

export function ExpenseFilters({ period, onPeriod, category, onCategory, method, onMethod, categories, staff, onStaff, operators = [] }: {
  period: ExpensePeriod; onPeriod: (value: ExpensePeriod) => void;
  category: string; onCategory: (value: string) => void;
  method: PaymentMethod | ""; onMethod: (value: PaymentMethod | "") => void;
  categories: { value: string; label: string }[];
  staff?: string; onStaff?: (value: string) => void; operators?: string[];
}) {
  const fields = [
    { label: "Période", value: period, onChange: (value: string) => onPeriod(value as ExpensePeriod), options: (["month", "today", "all"] as ExpensePeriod[]).map((value) => ({ value, label: periodLabel(value) })) },
    { label: "Catégorie", value: category, onChange: onCategory, options: [{ value: "", label: "Toutes les catégories" }, ...categories] },
    { label: "Mode de paiement", value: method, onChange: (value: string) => onMethod(value as PaymentMethod | ""), options: [{ value: "", label: "Tous les règlements" }, ...PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] }))] },
    ...(onStaff ? [{ label: "Équipe", value: staff ?? "", onChange: onStaff, options: [{ value: "", label: "Toute l’équipe" }, ...operators.map((value) => ({ value, label: value }))] }] : []),
  ];
  return <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${onStaff ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>{fields.map((field) => <div key={field.label} className="min-w-0 space-y-1.5"><span className="block text-xs font-semibold text-ink/60">{field.label}</span><Dropdown ariaLabel={field.label} value={field.value} onChange={field.onChange} options={field.options} /></div>)}</div>;
}
