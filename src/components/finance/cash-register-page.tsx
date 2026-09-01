"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canWriteCashRegister } from "@/lib/rbac";
import {
  CASH_TXN_LABEL,
  closeCashRegister,
  createCashTxn,
  createPayments,
  formatMad,
  getCashRegister,
  listBillableAppointments,
  newIdempotencyKey,
  openCashRegister,
  PAYMENT_METHOD_LABEL,
} from "@/modules/finance/service";
import type { CashRegisterState, PaymentMethod } from "@/types/finance";
import { PAYMENT_METHODS } from "@/types/finance";

type Billable = Awaited<ReturnType<typeof listBillableAppointments>>[number];

export function CashRegisterPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCashRegister(user.role);

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CashRegisterState | null>(null);
  const [float, setFloat] = useState("1000");
  const [submitting, setSubmitting] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const [billable, setBillable] = useState<Billable[]>([]);
  const [aptId, setAptId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [payMethod2, setPayMethod2] = useState<PaymentMethod | "">("");
  const [payAmount2, setPayAmount2] = useState("");

  const [outAmount, setOutAmount] = useState("");
  const [outReason, setOutReason] = useState("");
  const [counted, setCounted] = useState("");
  const [closeReason, setCloseReason] = useState("");

  const payKeyRef = useRef(newIdempotencyKey());

  const refresh = useCallback(async () => {
    try {
      setState(await getCashRegister());
    } catch {
      toast("Impossible de charger la caisse.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const session = state?.session;
  const isOpen = session?.status === "OPEN";

  async function handleOpen() {
    setSubmitting(true);
    const result = await openCashRegister({ openingFloat: Number(float) || 0 });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setState(result.state);
    toast("Caisse ouverte.", "success");
  }

  async function openPayDrawer() {
    try {
      const list = await listBillableAppointments();
      setBillable(list);
      if (list[0]) {
        setAptId(list[0].id);
        setPayAmount(String(list[0].remaining));
      }
      payKeyRef.current = newIdempotencyKey();
      setPayOpen(true);
    } catch {
      toast("Impossible de charger les RDV.", "error");
    }
  }

  async function handlePay() {
    if (!aptId) return;
    const items: { amount: number; method: PaymentMethod }[] = [
      { amount: Number(payAmount), method: payMethod },
    ];
    if (payMethod2 && Number(payAmount2) > 0) {
      items.push({ amount: Number(payAmount2), method: payMethod2 });
    }
    setSubmitting(true);
    const result = await createPayments({
      appointmentId: aptId,
      items,
      idempotencyKey: payKeyRef.current,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Paiement enregistré.", "success");
    setPayOpen(false);
    setPayMethod2("");
    setPayAmount2("");
    payKeyRef.current = newIdempotencyKey();
    refresh();
  }

  async function handleOut() {
    setSubmitting(true);
    const result = await createCashTxn({
      type: "CASH_OUT",
      amount: Number(outAmount),
      reason: outReason,
      idempotencyKey: newIdempotencyKey("out"),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Sortie enregistrée.", "success");
    setOutOpen(false);
    setOutAmount("");
    setOutReason("");
    refresh();
  }

  async function handleClose() {
    setSubmitting(true);
    const result = await closeCashRegister({
      countedAmount: Number(counted),
      reason: closeReason,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setState(result.state);
    setCloseOpen(false);
    toast("Caisse fermée.", "success");
  }

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Caisse"
        description="Payment ≠ tiroir : seuls les espèces alimentent la caisse physique."
        action={
          canWrite && isOpen ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn-primary" onClick={openPayDrawer}>
                Encaisser
              </button>
              <Button type="button" variant="ghost" onClick={() => setOutOpen(true)}>
                Sortie
              </Button>
              <Button type="button" variant="ghost" onClick={() => {
                setCounted(String(session?.theoreticalBalance ?? 0));
                setCloseOpen(true);
              }}>
                Fermer
              </Button>
            </div>
          ) : undefined
        }
      />

      {!isOpen ? (
        <div className="surface max-w-md space-y-4 p-6">
          {session?.status === "CLOSED" ? (
            <p className="text-sm text-ink/55">
              Dernière caisse fermée le{" "}
              {session.closedAt
                ? new Date(session.closedAt).toLocaleString("fr-FR")
                : "—"}
              {session.difference != null ? (
                <>
                  {" "}
                  · Écart {formatMad(session.difference)}
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-sm text-ink/55">Aucune caisse ouverte aujourd&apos;hui.</p>
          )}
          {canWrite ? (
            <>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Fond de caisse</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={float}
                  onChange={(e) => setFloat(e.target.value)}
                />
              </label>
              <Button type="button" variant="primary" disabled={submitting} onClick={handleOpen}>
                {submitting ? "Ouverture…" : "Ouvrir la caisse"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-ink/45">Lecture seule.</p>
          )}
        </div>
      ) : session ? (
        <>
          <div className="mb-4 surface p-5">
            <p className="font-display text-lg font-semibold">Caisse — session ouverte</p>
            <p className="text-xs text-ink/45">
              Ouverte par {session.openedByName ?? "—"} ·{" "}
              {new Date(session.openedAt).toLocaleString("fr-FR")}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Ouverture" value={formatMad(session.openingFloat)} />
            <Kpi label="Encaissements espèces" value={formatMad(session.cashIn)} />
            <Kpi label="Sorties" value={formatMad(session.cashOut)} />
            <Kpi label="Solde théorique" value={formatMad(session.theoreticalBalance)} />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Paiements espèces (jour)" value={formatMad(session.paymentsToday.cash)} />
            <Kpi label="Carte (jour)" value={formatMad(session.paymentsToday.card)} />
            <Kpi label="Virement (jour)" value={formatMad(session.paymentsToday.transfer)} />
            <Kpi label="Total paiements" value={formatMad(session.paymentsToday.total)} />
          </div>

          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line font-mono text-[10px] uppercase text-ink/40">
                <tr>
                  <th className="px-4 py-3">Heure</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Méthode</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(state?.transactions ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">{CASH_TXN_LABEL[t.type]}</td>
                    <td className="px-4 py-3">
                      {t.method ? PAYMENT_METHOD_LABEL[t.method] : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono ${
                        t.amount < 0 ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {t.amount > 0 ? "+" : ""}
                      {formatMad(t.amount)}
                    </td>
                    <td className="px-4 py-3">{t.userName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink/50">{t.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(state?.transactions.length ?? 0) === 0 ? (
              <p className="p-6 text-center text-sm text-ink/50">Aucun mouvement.</p>
            ) : null}
          </div>

          <p className="mt-4 text-sm">
            <Link href="/payments/" className="text-primary hover:underline">
              Voir l&apos;historique des paiements →
            </Link>
          </p>
        </>
      ) : null}

      <Drawer open={payOpen} onClose={() => setPayOpen(false)} title="Encaisser">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Rendez-vous</span>
            <Select
              value={aptId}
              onChange={(e) => {
                setAptId(e.target.value);
                const b = billable.find((x) => x.id === e.target.value);
                if (b) setPayAmount(String(b.remaining));
              }}
            >
              {billable.length === 0 ? (
                <option value="">Aucun RDV à encaisser</option>
              ) : (
                billable.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.customerName} · {b.serviceName} · reste {formatMad(b.remaining)}
                  </option>
                ))
              )}
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Montant</span>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Méthode</span>
              <Select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="border-t border-line pt-3">
            <p className="mb-2 text-xs text-ink/45">Paiement multi-méthodes (optionnel)</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="2ᵉ montant"
                value={payAmount2}
                onChange={(e) => setPayAmount2(e.target.value)}
              />
              <Select
                value={payMethod2}
                onChange={(e) => setPayMethod2(e.target.value as PaymentMethod | "")}
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !aptId}
            onClick={handlePay}
          >
            {submitting ? "Encaissement…" : "Encaisser"}
          </Button>
        </div>
      </Drawer>

      <Drawer open={outOpen} onClose={() => setOutOpen(false)} title="Sortie de caisse">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Montant</span>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={outAmount}
              onChange={(e) => setOutAmount(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Motif</span>
            <Input value={outReason} onChange={(e) => setOutReason(e.target.value)} required />
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !outReason || !outAmount}
            onClick={handleOut}
          >
            Enregistrer la sortie
          </Button>
        </div>
      </Drawer>

      <Drawer open={closeOpen} onClose={() => setCloseOpen(false)} title="Fermeture de caisse">
        <div className="space-y-4 text-sm">
          <p className="flex justify-between">
            <span>Solde théorique</span>
            <span className="font-mono">{formatMad(session?.theoreticalBalance ?? 0)}</span>
          </p>
          <label className="block">
            <span className="mb-1.5 block font-medium">Solde compté</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
            />
          </label>
          {counted !== "" ? (
            <p
              className={`flex justify-between font-medium ${
                Number(counted) - (session?.theoreticalBalance ?? 0) === 0
                  ? "text-emerald-700"
                  : "text-red-600"
              }`}
            >
              <span>Écart</span>
              <span className="font-mono">
                {formatMad(Number(counted) - (session?.theoreticalBalance ?? 0))}
              </span>
            </p>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block font-medium">Motif</span>
            <Input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Ex. Erreur de rendu monnaie"
            />
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !closeReason || counted === ""}
            onClick={handleClose}
          >
            Fermer la caisse
          </Button>
        </div>
      </Drawer>
    </motion.div>
  );
}
