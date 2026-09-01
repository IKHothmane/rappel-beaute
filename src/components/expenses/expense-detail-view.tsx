"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canArchiveExpense, canWriteExpenses } from "@/lib/rbac";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_STATUS_LABEL,
  formatMad,
  getExpense,
  updateExpense,
  voidExpense,
} from "@/modules/expenses/service";
import { listSuppliers } from "@/modules/procurement/service";
import { PAYMENT_METHOD_LABEL } from "@/types/finance";
import type { ExpenseDetail } from "@/types/expense";

export function ExpenseDetailView({ expenseId }: { expenseId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canEdit = canWriteExpenses(user.role);
  const canArchive = canArchiveExpense(user.role);

  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const refresh = useCallback(async () => {
    try {
      setExpense(await getExpense(expenseId));
    } catch {
      toast("Dépense introuvable.", "error");
      setExpense(null);
    }
  }, [expenseId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listSuppliers({ active: true, limit: 100 })
      .then((r) => setSuppliers(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, []);

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }
  if (!expense) {
    return (
      <div className="surface p-8 text-center">
        <Link href="/expenses/" className="text-sm font-semibold text-primary">
          ← Dépenses
        </Link>
      </div>
    );
  }

  async function handleUpdate(data: Parameters<typeof updateExpense>[1]) {
    setSubmitting(true);
    const result = await updateExpense(expenseId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setExpense(result.expense);
    setEditOpen(false);
    toast("Dépense mise à jour (audit enregistré).", "success");
  }

  async function handleVoid() {
    setSubmitting(true);
    const result = await voidExpense(expenseId, voidReason || undefined);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setExpense(result.expense);
    setVoidOpen(false);
    toast("Dépense annulée (VOID).", "success");
  }

  return (
    <div>
      <Link href="/expenses/" className="mb-4 inline-block text-sm text-primary">
        ← Dépenses
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {EXPENSE_CATEGORY_LABEL[expense.category]}
          </h1>
          <p className="font-mono text-xl">{formatMad(expense.amount)}</p>
          <p className="text-sm text-ink/50">
            {EXPENSE_STATUS_LABEL[expense.status]} ·{" "}
            {new Date(expense.expenseDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && expense.status === "RECORDED" ? (
            <button type="button" className="btn-primary" onClick={() => setEditOpen(true)}>
              Modifier
            </button>
          ) : null}
          {canArchive && expense.status === "RECORDED" ? (
            <Button type="button" variant="ghost" onClick={() => setVoidOpen(true)}>
              Archiver
            </Button>
          ) : null}
        </div>
      </div>

      <div className="surface max-w-lg space-y-3 p-5 text-sm">
        <p>
          Fournisseur · <span className="font-medium">{expense.supplierName ?? "—"}</span>
        </p>
        <p>
          Méthode ·{" "}
          <span className="font-medium">{PAYMENT_METHOD_LABEL[expense.paymentMethod]}</span>
        </p>
        <p>
          Description · <span className="font-medium">{expense.description ?? "—"}</span>
        </p>
        <p>
          Référence · <span className="font-mono">{expense.reference ?? "—"}</span>
        </p>
        <p>
          Créée par · <span className="font-medium">{expense.createdByName ?? "—"}</span>
        </p>
        {expense.paymentMethod === "CASH" && expense.status === "RECORDED" ? (
          <p className="text-xs text-ink/45">
            Liée à une sortie de caisse physique (CashRegisterTransaction EXPENSE).
          </p>
        ) : null}
        {expense.category === "PRODUCT_PURCHASE" ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Les achats de stock passent normalement par Purchase + InventoryMovement.
            N&apos;utilisez cette catégorie que pour une charge hors inventaire, afin d&apos;éviter
            le double-comptage.
          </p>
        ) : null}
      </div>

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la dépense">
        <ExpenseForm
          initial={expense}
          suppliers={suppliers}
          submitting={submitting}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>

      <Drawer open={voidOpen} onClose={() => setVoidOpen(false)} title="Archiver la dépense">
        <div className="space-y-4 text-sm">
          <p className="text-ink/60">
            Passage en VOID — pas de suppression. Si espèces, la caisse sera créditée.
          </p>
          <label className="block">
            <span className="mb-1.5 block font-medium">Motif</span>
            <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting}
            onClick={handleVoid}
          >
            Confirmer
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
