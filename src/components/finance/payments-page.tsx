"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canCreateRefund, canWriteCashRegister } from "@/lib/rbac";
import {
  formatMad,
  listPayments,
  newIdempotencyKey,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
  refundPayment,
} from "@/modules/finance/service";
import type { PaymentItem, PaymentMethod } from "@/types/finance";
import { PAYMENT_METHODS } from "@/types/finance";

export function PaymentsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCashRegister(user.role);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentItem[]>([]);
  const [refundTarget, setRefundTarget] = useState<PaymentItem | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await listPayments({ limit: 60 }));
    } catch {
      toast("Impossible de charger les paiements.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleRefund() {
    if (!refundTarget) return;
    setSubmitting(true);
    const result = await refundPayment(refundTarget.id, {
      amount: Number(amount),
      method,
      reason: reason || undefined,
      idempotencyKey: newIdempotencyKey("ref"),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Remboursement enregistré (paiement d'origine intact).", "success");
    setRefundTarget(null);
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Paiements"
        description="Ledger financier immuable — correction via Refund, jamais d'écrasement."
        action={
          <Link href="/cash-register/" className="btn-primary">
            Ouvrir la caisse
          </Link>
        }
      />

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucun paiement.</div>
      ) : (
        <ResponsiveTable
          headers={["Cliente", "Prestation", "Type", "Méthode", "Montant", "Date", ""]}
          minWidthClass="min-w-[800px]"
          cards={rows.map((p) => (
            <DataCard
              key={p.id}
              title={p.customerName ?? "—"}
              subtitle={`${PAYMENT_KIND_LABEL[p.kind]} · ${PAYMENT_METHOD_LABEL[p.method]}`}
              meta={
                <>
                  <span
                    className={`block font-mono font-semibold ${
                      p.kind === "REFUND" ? "text-red-600" : ""
                    }`}
                  >
                    {p.kind === "REFUND" ? "−" : ""}
                    {formatMad(p.amount)}
                  </span>
                  <span>
                    {new Date(p.paidAt).toLocaleDateString("fr-FR")}
                  </span>
                </>
              }
            />
          ))}
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3 font-medium">{p.customerName ?? "—"}</td>
              <td className="px-4 py-3 text-sm">{p.serviceName ?? "—"}</td>
              <td className="px-4 py-3 text-sm">{PAYMENT_KIND_LABEL[p.kind]}</td>
              <td className="px-4 py-3 text-sm">{PAYMENT_METHOD_LABEL[p.method]}</td>
              <td
                className={`px-4 py-3 font-mono ${
                  p.kind === "REFUND" ? "text-red-600" : ""
                }`}
              >
                {p.kind === "REFUND" ? "−" : ""}
                {formatMad(p.amount)}
              </td>
              <td className="px-4 py-3 text-xs text-ink/50">
                {new Date(p.paidAt).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3">
                {canWrite &&
                p.kind !== "REFUND" &&
                canCreateRefund(user.role, p.amount) ? (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setRefundTarget(p);
                      setAmount(String(p.amount));
                      setMethod(p.method);
                      setReason("");
                    }}
                  >
                    Rembourser
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        title="Remboursement"
      >
        {refundTarget ? (
          <div className="space-y-4 text-sm">
            <p>
              Paiement d&apos;origine :{" "}
              <span className="font-mono">{formatMad(refundTarget.amount)}</span> —{" "}
              {PAYMENT_METHOD_LABEL[refundTarget.method]}
            </p>
            <p className="text-xs text-ink/45">
              Le paiement original n&apos;est pas modifié. Un mouvement REFUND est créé.
            </p>
            <label className="block">
              <span className="mb-1.5 block font-medium">Montant</span>
              <Input
                type="number"
                min={0.01}
                max={refundTarget.amount}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Méthode</span>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Motif</span>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={submitting || !canCreateRefund(user.role, Number(amount) || 0)}
              onClick={handleRefund}
            >
              Confirmer le remboursement
            </Button>
          </div>
        ) : null}
      </Drawer>
    </motion.div>
  );
}
