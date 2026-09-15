"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Download, Plus, Scale, Search, Sparkles } from "lucide-react";
import {
  type ExpensePeriod,
  type ExpenseTab,
  categoryBarClass,
  categoryChipClass,
  expenseShortId,
  expenseStatusChip,
  formatExpenseDate,
  formatExpenseTime,
} from "@/components/expenses/expense-helpers";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABEL, formatMad } from "@/modules/expenses/service";
import type { ExpenseKpis, ExpenseListItem } from "@/types/expense";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/types/finance";

type Props = {
  orgName: string;
  insight: string;
  kpis: ExpenseKpis | null;
  search: string;
  onSearch: (v: string) => void;
  tab: ExpenseTab;
  onTab: (t: ExpenseTab) => void;
  tabCounts: { recorded: number; voided: number };
  period: ExpensePeriod;
  onPeriod: (p: ExpensePeriod) => void;
  category: string;
  onCategory: (c: string) => void;
  method: PaymentMethod | "";
  onMethod: (m: PaymentMethod | "") => void;
  canCreate: boolean;
  canCash: boolean;
  canPurchases: boolean;
  loading: boolean;
  rows: ExpenseListItem[];
  selected: ExpenseListItem | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (e: ExpenseListItem) => void;
  onVoid: (e: ExpenseListItem) => void;
  canEdit: boolean;
  canArchive: boolean;
  exportCsv: () => void;
  categories: { value: string; label: string }[];
};

export function ExpensesMobile({
  orgName,
  insight,
  kpis,
  search,
  onSearch,
  tab,
  onTab,
  tabCounts,
  period,
  onPeriod,
  category,
  onCategory,
  method,
  onMethod,
  canCreate,
  canCash,
  canPurchases,
  loading,
  rows,
  selected,
  onSelect,
  onNew,
  onEdit,
  onVoid,
  canEdit,
  canArchive,
  exportCsv,
  categories,
}: Props) {
  const [view, setView] = useState<"list" | "focus">("list");
  const month = kpis?.monthTotal ?? 0;
  const mix = kpis?.byCategory ?? [];

  if (view === "focus" && selected) {
    const chip = expenseStatusChip(selected.status);
    return (
      <div className="w-full space-y-4 pb-8 lg:hidden">
        <button
          type="button"
          className="text-[13px] font-semibold text-primary"
          onClick={() => {
            setView("list");
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          ← Registre
        </button>
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                Fiche dépense
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <h2 className="text-[22px] font-bold">{expenseShortId(selected.id)}</h2>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
                  {chip.label}
                </span>
              </div>
            </div>
            <p className="text-[22px] font-extrabold text-primary">{formatMad(selected.amount)}</p>
          </div>
          <dl className="space-y-2 rounded-xl bg-[#FFEFF8] p-3 text-[13px]">
            <Row label="Catégorie" value={EXPENSE_CATEGORY_LABEL[selected.category]} />
            <Row label="Description" value={selected.description ?? "—"} />
            <Row label="Fournisseur" value={selected.supplierName ?? "—"} />
            <Row label="Méthode" value={PAYMENT_METHOD_LABEL[selected.paymentMethod]} />
            <Row label="Date" value={formatExpenseDate(selected.expenseDate)} />
            <Row label="Auteur" value={selected.createdByName ?? "—"} />
            {selected.reference ? <Row label="Référence" value={selected.reference} /> : null}
          </dl>
          {selected.category === "PRODUCT_PURCHASE" ? (
            <p className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">
              Les achats stock passent par Achats, pas par cette charge, pour éviter le double-comptage.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {canEdit && selected.status === "RECORDED" ? (
              <button
                type="button"
                onClick={() => onEdit(selected)}
                className="flex h-10 items-center justify-center rounded-lg bg-[#F6E3EF] text-[13px] font-semibold"
              >
                Modifier
              </button>
            ) : null}
            {canArchive && selected.status === "RECORDED" ? (
              <button
                type="button"
                onClick={() => onVoid(selected)}
                className="flex h-10 items-center justify-center rounded-lg bg-[#FFDAD6] text-[13px] font-semibold text-[#93000A]"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{orgName}</p>
          <h1 className="mt-0.5 text-[22px] font-bold leading-tight text-ink">Dépenses & budgets</h1>
          <p className="mt-1 text-[13px] text-ink/55">Contrôle des charges, pièces et annulations VOID.</p>
        </div>
        <button
          type="button"
          aria-label="Exporter CSV"
          onClick={exportCsv}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FCE9F4] text-ink"
        >
          <Download size={18} />
        </button>
      </div>

      {canCreate ? (
        <button
          type="button"
          onClick={onNew}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm"
        >
          <Plus size={18} />
          Nouvelle dépense
        </button>
      ) : null}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Motif, fournisseur, référence…"
          className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[13px] shadow-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={period}
          onChange={(e) => onPeriod(e.target.value as ExpensePeriod)}
          className="h-10 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
        >
          <option value="month">Ce mois</option>
          <option value="today">Aujourd’hui</option>
          <option value="all">Toutes les dates</option>
        </select>
        <select
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          className="h-10 rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <select
        value={method}
        onChange={(e) => onMethod(e.target.value as PaymentMethod | "")}
        className="h-10 w-full rounded-lg bg-white px-2 text-[13px] font-semibold shadow-sm outline-none"
      >
        <option value="">Toutes méthodes</option>
        <option value="CASH">Espèces</option>
        <option value="CARD">Carte</option>
        <option value="TRANSFER">Virement</option>
        <option value="CHECK">Chèque</option>
        <option value="ONLINE">En ligne</option>
        <option value="GIFT_CARD">Carte cadeau</option>
      </select>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        <button
          type="button"
          onClick={() => onTab("recorded")}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
            tab === "recorded" ? "bg-primary text-white" : "bg-white text-ink",
          )}
        >
          Engagées ({tabCounts.recorded})
        </button>
        <button
          type="button"
          onClick={() => onTab("void")}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
            tab === "void" ? "bg-primary text-white" : "bg-white text-ink",
          )}
        >
          Annulées ({tabCounts.voided})
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <KpiMini
          label="Ce mois"
          value={formatMad(month)}
          hint={`${kpis?.monthCount ?? 0} écriture${(kpis?.monthCount ?? 0) > 1 ? "s" : ""}`}
        />
        <KpiMini
          label="Aujourd’hui"
          value={formatMad(kpis?.todayTotal ?? 0)}
          hint={
            kpis?.todayLabels?.length
              ? kpis.todayLabels[0]
              : `${kpis?.todayCount ?? 0} aujourd’hui`
          }
        />
        <KpiMini
          label="Annulées"
          value={formatMad(kpis?.voidMonthTotal ?? 0)}
          hint={`${kpis?.voidMonthCount ?? 0} VOID ce mois`}
          accent
        />
      </div>

      {mix.length > 0 ? (
        <section className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
          <h2 className="text-[16px] font-semibold">Répartition du mois</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-[#F0DDE9]">
            {mix.map((m) => (
              <div
                key={m.category}
                className={cn("h-full", categoryBarClass(m.category))}
                style={{ width: `${month > 0 ? (m.amount / month) * 100 : 0}%` }}
              />
            ))}
          </div>
          <div className="space-y-1">
            {mix.slice(0, 5).map((m) => {
              const pct = month > 0 ? Math.round((m.amount / month) * 100) : 0;
              return (
                <div key={m.category} className="flex items-center justify-between text-[12px]">
                  <span>{EXPENSE_CATEGORY_LABEL[m.category]}</span>
                  <span className="font-bold">
                    {pct}% · {formatMad(m.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
          <Sparkles className="h-4 w-4" />
          Lecture des charges
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[#FEECF7]/90">{insight}</p>
      </section>

      <section className="rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-[#7B5900]" />
          <h2 className="text-[14px] font-bold">Circuit de validation</h2>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-ink/55">
          {canArchive
            ? "Vous pouvez enregistrer et annuler (VOID). Pas de file d’approbation séparée."
            : "Saisie possible selon votre rôle. L’annulation VOID est réservée au propriétaire / responsable."}
        </p>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Registre</h2>
        <span className="text-[11px] text-ink/45">
          {rows.length} ligne{rows.length > 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50 shadow-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/50 shadow-sm">
          Aucune dépense pour ces filtres.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => {
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  onSelect(e.id);
                  setView("focus");
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
                className="w-full rounded-xl bg-white p-3 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold">
                      {e.description ?? EXPENSE_CATEGORY_LABEL[e.category]}
                    </p>
                    <p className="truncate text-[13px] text-ink/50">
                      {e.supplierName ?? PAYMENT_METHOD_LABEL[e.paymentMethod]}
                    </p>
                    <p className="mt-1 text-[11px] text-ink/45">
                      {expenseShortId(e.id)} · {formatExpenseDate(e.expenseDate)} ·{" "}
                      {formatExpenseTime(e.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[16px] font-extrabold">{formatMad(e.amount)}</p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                        categoryChipClass(e.category),
                      )}
                    >
                      {EXPENSE_CATEGORY_LABEL[e.category]}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[13px]">
        {canCash ? (
          <Link href="/cash-register/" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">
            Caisse →
          </Link>
        ) : null}
        {canPurchases ? (
          <Link href="/purchases/" className="rounded-lg bg-white px-3 py-2 font-semibold shadow-sm">
            Achats →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function KpiMini({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("min-w-[140px] flex-1 rounded-xl p-3 shadow-sm", accent ? "bg-ink text-[#FEECF7]" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-wider", accent ? "text-[#FFDEA4]" : "text-ink/45")}>
        {label}
      </p>
      <p className="mt-1 text-[16px] font-extrabold">{value}</p>
      {hint ? <p className={cn("mt-0.5 text-[11px]", accent ? "text-[#FEECF7]/70" : "text-ink/45")}>{hint}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink/50">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
