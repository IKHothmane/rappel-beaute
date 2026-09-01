"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canCreateExpense } from "@/lib/rbac";
import {
  createExpense,
  EXPENSE_CATEGORY_LABEL,
  formatMad,
  listExpenses,
} from "@/modules/expenses/service";
import { listSuppliers } from "@/modules/procurement/service";
import type { ExpenseCategory, ExpenseKpis, ExpenseListItem } from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS } from "@/types/finance";

export function ExpensesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canCreate = canCreateExpense(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [rows, setRows] = useState<ExpenseListItem[]>([]);
  const [kpis, setKpis] = useState<ExpenseKpis | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await listExpenses({
        search,
        category: category || undefined,
        method: method || undefined,
        supplierId: supplierId || undefined,
        from: from || undefined,
        to: to || undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        limit: 50,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les dépenses.", "error");
    }
  }, [search, category, method, supplierId, from, to, minAmount, maxAmount, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listSuppliers({ active: true, limit: 100 })
      .then((r) => setSuppliers(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, []);

  async function handleCreate(data: Parameters<typeof createExpense>[0]) {
    setSubmitting(true);
    const result = await createExpense(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast("Dépense enregistrée.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Dépenses"
        description="Charges opérationnelles — distinctes des achats stock (Purchase)."
        action={
          canCreate ? (
            <button type="button" className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Dépense
            </button>
          ) : undefined
        }
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Dépenses ce mois" value={formatMad(kpis.monthTotal)} />
          <Kpi label="Aujourd'hui" value={formatMad(kpis.todayTotal)} />
          <Kpi label="Mois précédent" value={formatMad(kpis.prevMonthTotal)} />
          <Kpi
            label="Évolution"
            value={
              kpis.evolutionPct == null
                ? "—"
                : `${kpis.evolutionPct > 0 ? "+" : ""}${kpis.evolutionPct} %`
            }
          />
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          title="Du"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          title="Au"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Toutes catégories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABEL[c as ExpenseCategory]}
            </option>
          ))}
        </select>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Toutes méthodes</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABEL[m]}
            </option>
          ))}
        </select>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous fournisseurs</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          step={0.01}
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          placeholder="Min MAD"
          className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          step={0.01}
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          placeholder="Max MAD"
          className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucune dépense.</div>
      ) : (
        <ResponsiveTable
          headers={["Date", "Catégorie", "Description", "Montant"]}
          minWidthClass="min-w-[640px]"
          cards={rows.map((e) => (
            <DataCard
              key={e.id}
              href={`/expenses/${e.id}/`}
              title={EXPENSE_CATEGORY_LABEL[e.category]}
              subtitle={e.description ?? e.supplierName ?? "—"}
              meta={
                <>
                  <span className="font-mono">{formatMad(e.amount)}</span>
                  <br />
                  <span>
                    {new Date(e.expenseDate).toLocaleDateString("fr-FR")}
                  </span>
                </>
              }
            />
          ))}
        >
          {rows.map((e) => (
            <tr key={e.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                {new Date(e.expenseDate).toLocaleDateString("fr-FR")}
              </td>
              <td className="px-4 py-3">
                <Link href={`/expenses/${e.id}/`} className="font-medium text-primary">
                  {EXPENSE_CATEGORY_LABEL[e.category]}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-ink/70">
                {e.description ?? e.supplierName ?? "—"}
              </td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(e.amount)}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle dépense">
        <ExpenseForm
          suppliers={suppliers}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </motion.div>
  );
}
