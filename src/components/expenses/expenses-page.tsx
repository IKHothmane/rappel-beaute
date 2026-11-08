"use client";
import { MetricCard } from "@/components/ui/metric-card";
import { ExpenseBanner, ExpenseFilters } from "@/components/expenses/expense-toolbar";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
// restyle-v3 prestige expenses — registre, KPI réels, VOID, MAD
import {
  Banknote,
  CalendarDays,
  Pencil,

  Search,
  Sparkles,
  Undo2,
  Wallet,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ExpenseForm } from "@/components/expenses/expense-form";
import {
  EXPENSE_PAGE_SIZE,
  type ExpensePeriod,
  type ExpenseTab,
  categoryBarClass,
  categoryChipClass,
  expenseShortId,
  expenseStatusChip,
  formatExpenseDate,
  formatExpenseDateTime,
  formatExpenseTime,
  periodLabel,
  periodRange,
  staffOptions,
} from "@/components/expenses/expense-helpers";
import { ExpensesMobile } from "@/components/expenses/expenses-mobile";
import { Button } from "@/components/ui/button";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canArchiveExpense, canCreateExpense, canWriteExpenses } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  createExpense,
  EXPENSE_CATEGORY_LABEL,
  formatMad,
  listExpenses,
  updateExpense,
  voidExpense,
} from "@/modules/expenses/service";
import { listSuppliers } from "@/modules/procurement/service";
import type { ExpenseKpis, ExpenseListItem } from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@/types/finance";

export function ExpensesPageView({ createSignal = 0 }: { createSignal?: number }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canCreate = canCreateExpense(user.role);
  const canEdit = canWriteExpenses(user.role);
  const canArchive = canArchiveExpense(user.role);
  const canCash = canAccessNav(user.role, "cash-register");
  const canPurchases = canAccessNav(user.role, "purchases");
  const canSuppliers = canAccessNav(user.role, "suppliers");

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<ExpensePeriod>("month");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [staff, setStaff] = useState("");
  const [tab, setTab] = useState<ExpenseTab>("recorded");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ExpenseListItem[]>([]);
  const [tabCounts, setTabCounts] = useState({ recorded: 0, voided: 0 });
  const [kpis, setKpis] = useState<ExpenseKpis | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseListItem | null>(null);
  const [voidTarget, setVoidTarget] = useState<ExpenseListItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (createSignal > 0 && canCreate) {
      setCreateOpen(true);
    }
  }, [createSignal, canCreate]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const range = periodRange(period);
      const res = await listExpenses({
        search: search || undefined,
        category: category || undefined,
        method: method || undefined,
        from: range.from,
        to: range.to,
        includeVoid: true,
        limit: 80,
      });
      const recorded = res.data.filter((e) => e.status === "RECORDED");
      const voided = res.data.filter((e) => e.status === "VOID");
      setTabCounts({ recorded: recorded.length, voided: voided.length });
      setRows(tab === "void" ? voided : recorded);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les dépenses.", "error");
    }
  }, [search, category, method, period, tab, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listSuppliers({ active: true, limit: 100 })
      .then((r) => setSuppliers(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedId(null);
  }, [search, category, method, period, tab, staff]);

  const operators = useMemo(() => staffOptions(rows), [rows]);
  const filtered = useMemo(
    () => (staff ? rows.filter((e) => (e.createdByName ?? "") === staff) : rows),
    [rows, staff],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / EXPENSE_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * EXPENSE_PAGE_SIZE, page * EXPENSE_PAGE_SIZE);
  const selected =
    (selectedId ? filtered.find((e) => e.id === selectedId) : undefined) ??
    paged[0] ??
    filtered[0] ??
    null;
  const mix = kpis?.byCategory ?? [];
  const month = kpis?.monthTotal ?? 0;
  const categoryOptions = EXPENSE_CATEGORIES.map((c) => ({
    value: c,
    label: EXPENSE_CATEGORY_LABEL[c],
  }));

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  async function handleCreate(data: Parameters<typeof createExpense>[0]) {
    setSubmitting(true);
    const result = await createExpense(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setCreateOpen(false);
    toast("Dépense enregistrée.", "success");
    refresh();
  }

  async function handleUpdate(data: Parameters<typeof updateExpense>[1]) {
    if (!editTarget) return;
    setSubmitting(true);
    const result = await updateExpense(editTarget.id, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setEditTarget(null);
    toast("Dépense mise à jour.", "success");
    refresh();
  }

  async function handleVoid() {
    if (!voidTarget) return;
    setSubmitting(true);
    const result = await voidExpense(voidTarget.id, voidReason || undefined);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setVoidTarget(null);
    setVoidReason("");
    toast("Dépense annulée (écriture VOID, original non écrasé).", "success");
    refresh();
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setPeriod("month");
    setCategory("");
    setMethod("");
    setStaff("");
    setTab("recorded");
  }

  return (
    <>
      <ExpensesMobile
        orgName={user.orgName}
        kpis={kpis}
        search={searchInput}
        onSearch={setSearchInput}
        tab={tab}
        onTab={setTab}
        tabCounts={tabCounts}
        period={period}
        onPeriod={setPeriod}
        category={category}
        onCategory={setCategory}
        method={method}
        onMethod={setMethod}
        canCreate={canCreate}
        canCash={canCash}
        canPurchases={canPurchases}
        loading={loading}
        rows={filtered}
        selected={selected}
        onSelect={setSelectedId}
        onNew={() => setCreateOpen(true)}
        onEdit={setEditTarget}
        onVoid={(e) => {
          setVoidTarget(e);
          setVoidReason("");
        }}
        canEdit={canEdit}
        canArchive={canArchive}
        categories={categoryOptions}
      />

      <div className="hidden space-y-4 lg:block">
        <ExpenseBanner orgName={user.orgName} canCreate={canCreate} onCreate={() => setCreateOpen(true)} />

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="relative xl:w-72 xl:shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher motif, fournisseur, référence…"
                className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-10 pr-3 text-[13px] outline-none ring-primary/30 focus:bg-white focus:ring-2"
              />
            </div>
            <div className="min-w-0 flex-1">
              <ExpenseFilters period={period} onPeriod={setPeriod} category={category} onCategory={setCategory} method={method} onMethod={setMethod} categories={EXPENSE_CATEGORIES.map((value) => ({ value, label: EXPENSE_CATEGORY_LABEL[value] }))} staff={staff} onStaff={setStaff} operators={operators} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab("recorded")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-semibold",
                tab === "recorded" ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink hover:bg-[#F6E3EF]",
              )}
            >
              Dépenses engagées
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                  tab === "recorded" ? "bg-white text-primary" : "bg-white text-ink/60",
                )}
              >
                {tabCounts.recorded}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("void")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-semibold",
                tab === "void" ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink hover:bg-[#F6E3EF]",
              )}
            >
              Annulées
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                  tab === "void" ? "bg-white text-primary" : "bg-white text-ink/60",
                )}
              >
                {tabCounts.voided}
              </span>
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex h-9 items-center rounded-lg bg-[#FFEFF8] px-3 text-[12px] font-semibold text-ink/60"
            >
              Réinitialiser
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 rb-metric-row">
          <Kpi
            label="Ce mois"
            value={formatMad(kpis?.monthTotal ?? 0)}
            hint={`${kpis?.monthCount ?? 0} écriture${(kpis?.monthCount ?? 0) > 1 ? "s" : ""}`}
            icon={<Wallet size={20} className="text-primary" />}
          />
          <Kpi
            label="Aujourd’hui"
            value={formatMad(kpis?.todayTotal ?? 0)}
            hint={
              kpis?.todayLabels?.length
                ? kpis.todayLabels.join(" · ")
                : `${kpis?.todayCount ?? 0} aujourd’hui`
            }
            icon={<CalendarDays size={20} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Annulées (VOID)"
            value={formatMad(kpis?.voidMonthTotal ?? 0)}
            hint={`${kpis?.voidMonthCount ?? 0} ce mois`}
            icon={<Undo2 size={20} className="text-[#BA1A1A]" />}
            alert={(kpis?.voidMonthCount ?? 0) > 0}
          />
          <Kpi
            label="Mois préc."
            value={formatMad(kpis?.prevMonthTotal ?? 0)}
            hint="Base de comparaison"
            icon={<Banknote size={20} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Évolution"
            value={
              kpis?.evolutionPct == null
                ? "—"
                : `${kpis.evolutionPct > 0 ? "+" : ""}${kpis.evolutionPct} %`
            }
            hint="vs mois précédent (si comparable)"
            icon={<Sparkles size={20} className="text-primary" />}
          />
          <Kpi
            label="Catégories"
            value={`${mix.length}`}
            hint="Actives ce mois"
            inverse
            icon={<Sparkles size={20} className="text-[#FFDEA4]" />}
          />
        </section>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <section className="overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-8">
            <div className="flex items-center justify-between bg-[#FFEFF8] px-4 py-3">
              <div>
                <h2 className="text-[18px] font-semibold">Registre des décaissements</h2>
                <p className="text-[12px] text-ink/50">
                  {filtered.length} ligne{filtered.length > 1 ? "s" : ""} · {periodLabel(period)}
                </p>
              </div>
            </div>
            {loading ? (
              <p className="p-8 text-center text-[13px] text-ink/50">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-[13px] text-ink/50">Aucune dépense pour ces filtres.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#FCE9F4] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Description</th>
                        <th className="px-3 py-2.5">Catégorie</th>
                        <th className="px-3 py-2.5">Règlement</th>
                        <th className="px-3 py-2.5 text-right">Montant</th>
                        <th className="px-3 py-2.5">Statut</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((e) => {
                        const chip = expenseStatusChip(e.status);
                        const active = selected?.id === e.id;
                        return (
                          <tr
                            key={e.id}
                            onClick={() => setSelectedId(e.id)}
                            className={cn(
                              "cursor-pointer border-t border-transparent transition-colors",
                              e.status === "VOID"
                                ? "bg-[#FFDAD6]/20"
                                : active
                                  ? "bg-[#FFD9DE]/40"
                                  : "hover:bg-[#FFEFF8]/70",
                            )}
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              <div className="font-bold text-primary">{expenseShortId(e.id)}</div>
                              <div className="text-[11px] text-ink/50">
                                {formatExpenseDate(e.expenseDate)} · {formatExpenseTime(e.createdAt)}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-semibold">
                                {e.description ?? EXPENSE_CATEGORY_LABEL[e.category]}
                              </div>
                              <div className="text-[11px] text-ink/45">{e.supplierName ?? "—"}</div>
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
                                  categoryChipClass(e.category),
                                )}
                              >
                                {EXPENSE_CATEGORY_LABEL[e.category]}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-ink/70">
                              {PAYMENT_METHOD_LABEL[e.paymentMethod]}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-bold">
                              {formatMad(e.amount)}
                            </td>
                            <td className="px-3 py-3">
                              <span className={cn("inline-flex rounded-full px-2 py-1 text-[11px] font-bold", chip.className)}>
                                {chip.label}
                              </span>
                            </td>
                            <td
                              className="px-3 py-3 text-right"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <div className="flex justify-end gap-1">
                                {canEdit && e.status === "RECORDED" ? (
                                  <button
                                    type="button"
                                    title="Modifier"
                                    className="rounded p-1 text-ink/50 hover:bg-white hover:text-primary"
                                    onClick={() => setEditTarget(e)}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                ) : null}
                                {canArchive && e.status === "RECORDED" ? (
                                  <button
                                    type="button"
                                    title="Annuler"
                                    className="rounded p-1 text-ink/50 hover:bg-white hover:text-[#BA1A1A]"
                                    onClick={() => {
                                      setVoidTarget(e);
                                      setVoidReason("");
                                    }}
                                  >
                                    <Undo2 size={16} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col items-center justify-between gap-2 bg-[#FFEFF8] px-3 py-2 text-[13px] text-ink/55 sm:flex-row">
                  <div>
                    Affichage de {(page - 1) * EXPENSE_PAGE_SIZE + 1} à{" "}
                    {Math.min(page * EXPENSE_PAGE_SIZE, filtered.length)} sur {filtered.length}
                  </div>
                  {pageCount > 1 ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 w-8 rounded bg-white disabled:opacity-40"
                      >
                        ‹
                      </button>
                      <span className="px-2 text-[13px] font-semibold">
                        {page}/{pageCount}
                      </span>
                      <button
                        type="button"
                        disabled={page >= pageCount}
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        className="h-8 w-8 rounded bg-white disabled:opacity-40"
                      >
                        ›
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </section>

          <aside className="space-y-4 lg:col-span-4">
            {selected ? (
              <ExpenseInspect
                expense={selected}
                canEdit={canEdit}
                canArchive={canArchive}
                canCash={canCash}
                canPurchases={canPurchases}
                canSuppliers={canSuppliers}
                onEdit={() => setEditTarget(selected)}
                onVoid={() => {
                  setVoidTarget(selected);
                  setVoidReason("");
                }}
              />
            ) : (
              <div className="rounded-xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">
                Sélectionnez une dépense pour inspecter la fiche.
              </div>
            )}

            {mix.length > 0 ? (
              <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">
                      Répartition
                    </p>
                    <h3 className="text-[16px] font-semibold">Catégories du mois</h3>
                  </div>
                  <span className="text-[13px] font-bold text-primary">{formatMad(month)}</span>
                </div>
                <div className="space-y-3">
                  {mix.map((m) => {
                    const pct = month > 0 ? Math.round((m.amount / month) * 100) : 0;
                    return (
                      <div key={m.category} className="space-y-1">
                        <div className="flex justify-between text-[12px] font-semibold">
                          <span>{EXPENSE_CATEGORY_LABEL[m.category]}</span>
                          <span>
                            {formatMad(m.amount)} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F0DDE9]">
                          <div
                            className={cn("h-full rounded-full", categoryBarClass(m.category))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-ink/45">
                          {m.count} écriture{m.count > 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <p className="rounded-xl bg-[#FFEFF8] p-3 text-[12px] leading-relaxed text-ink/55">
              Une dépense enregistrée n’est pas effacée. L’annulation passe l’écriture en VOID.
              Les dépenses n’impactent pas le solde de caisse.
            </p>
          </aside>
        </div>
      </div>

      <PremiumSidePanel open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle dépense" description="Renseignez le montant, la catégorie et le mode de paiement de votre dépense.">
        <ExpenseForm
          suppliers={suppliers}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </PremiumSidePanel>

      <PremiumSidePanel open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title="Modifier la dépense" description="Mettez à jour les informations de cette dépense.">
        {editTarget ? (
          <ExpenseForm
            initial={editTarget}
            suppliers={suppliers}
            submitting={submitting}
            onSubmit={handleUpdate}
            onCancel={() => setEditTarget(null)}
          />
        ) : null}
      </PremiumSidePanel>

      <PremiumSidePanel open={Boolean(voidTarget)} onClose={() => setVoidTarget(null)} title="Annuler la dépense" description="Indiquez le motif de l’annulation pour conserver un suivi clair." size="md">
        {voidTarget ? (
          <div className="space-y-4 rounded-2xl border border-[#F0DDE6] bg-[#FFF8FA] p-4 text-sm">
            <p className="text-ink/60">
              Passage en VOID — pas de suppression. La caisse n’est pas modifiée.
            </p>
            <p>
              {expenseShortId(voidTarget.id)} · {formatMad(voidTarget.amount)} ·{" "}
              {EXPENSE_CATEGORY_LABEL[voidTarget.category]}
            </p>
            <label className="block">
              <span className="mb-1.5 block font-medium">Motif</span>
              <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </label>
            <Button type="button" variant="primary" className="w-full" disabled={submitting} onClick={handleVoid}>
              Confirmer l’annulation
            </Button>
          </div>
        ) : null}
      </PremiumSidePanel>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  inverse,
  alert,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  inverse?: boolean;
  alert?: boolean;
}) {
  return <MetricCard title={label} value={value} icon={icon} hint={hint} alert={alert}></MetricCard>;
}

function ExpenseInspect({
  expense,
  canEdit,
  canArchive,
  canCash,
  canPurchases,
  canSuppliers,
  onEdit,
  onVoid,
}: {
  expense: ExpenseListItem;
  canEdit: boolean;
  canArchive: boolean;
  canCash: boolean;
  canPurchases: boolean;
  canSuppliers: boolean;
  onEdit: () => void;
  onVoid: () => void;
}) {
  const chip = expenseStatusChip(expense.status);
  return (
    <section className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">Inspection</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h3 className="text-[22px] font-bold">{expenseShortId(expense.id)}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>
              {chip.label}
            </span>
          </div>
        </div>
        <p className="text-[22px] font-extrabold text-primary">{formatMad(expense.amount)}</p>
      </div>
      <p className="rounded-xl bg-[#FFEFF8] p-3 text-[14px] font-semibold">
        {expense.description ?? EXPENSE_CATEGORY_LABEL[expense.category]}
      </p>
      <dl className="space-y-1.5 text-[13px]">
        <InspectRow label="Catégorie" value={EXPENSE_CATEGORY_LABEL[expense.category]} />
        <InspectRow
          label="Fournisseur"
          value={
            canSuppliers && expense.supplierId ? (
              <Link href="/suppliers/" className="font-semibold text-primary hover:underline">
                {expense.supplierName ?? "—"}
              </Link>
            ) : (
              expense.supplierName ?? "—"
            )
          }
        />
        <InspectRow label="Règlement" value={PAYMENT_METHOD_LABEL[expense.paymentMethod]} />
        <InspectRow label="Date" value={formatExpenseDateTime(expense.expenseDate)} />
        <InspectRow label="Auteur" value={expense.createdByName ?? "—"} />
      </dl>
      {expense.paymentMethod === "CASH" && expense.status === "RECORDED" ? (
        <p className="rounded-lg bg-emerald-50 p-2 text-[12px] text-emerald-800">
          Suivi comptable — sans impact sur la caisse.
        </p>
      ) : null}
      {expense.category === "PRODUCT_PURCHASE" ? (
        <p className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">
          Pour un achat stock, utilisez Achats afin d’éviter le double-comptage.
        </p>
      ) : null}
      <div className="flex gap-2">
        {canEdit && expense.status === "RECORDED" ? (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#F6E3EF] text-[13px] font-semibold"
          >
            Modifier
          </button>
        ) : null}
        {canArchive && expense.status === "RECORDED" ? (
          <button
            type="button"
            onClick={onVoid}
            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#FFDAD6] text-[13px] font-semibold text-[#93000A]"
          >
            Annuler
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 text-[12px]">
        {canCash ? (
          <Link href="/cash-register/" className="font-semibold text-primary hover:underline">
            Caisse →
          </Link>
        ) : null}
        {canPurchases ? (
          <Link href="/purchases/" className="font-semibold text-primary hover:underline">
            Achats →
          </Link>
        ) : null}
        <Link href={`/expenses/${expense.id}/`} className="font-semibold text-primary hover:underline">
          Fiche complète →
        </Link>
      </div>
    </section>
  );
}

function InspectRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="text-ink/50">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
