"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  Download,
  Landmark,
  Lock,
  Plus,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type CashTab,
  cashInsight,
  closedHistoryLabel,
  exportCashCsv,
  filterCashTxns,
  formatCashTime,
  opsCount,
  paymentMix,
  saleCount,
  sumAbsTypes,
  txnTypeChip,
} from "@/components/finance/cash-helpers";
import { CashRegisterMobile } from "@/components/finance/cash-register-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteCashRegister } from "@/lib/rbac";
import { cn } from "@/lib/utils";
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
  const showExpenses = canAccessNav(user.role, "expenses");
  const showPayments = canAccessNav(user.role, "payments");

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CashRegisterState | null>(null);
  const [float, setFloat] = useState("1000");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<CashTab>("overview");
  const [search, setSearch] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [outKind, setOutKind] = useState<"out" | "bank">("out");

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

  const session = state?.session ?? null;
  const txns = state?.transactions ?? [];
  const recentClosed = state?.recentClosed ?? [];
  const isOpen = session?.status === "OPEN";
  const insight = useMemo(() => cashInsight(session, txns), [session, txns]);
  const filtered = useMemo(() => filterCashTxns(txns, tab, search), [txns, tab, search]);
  const mix = paymentMix(session);
  const refunds = sumAbsTypes(txns, ["REFUND_OUT"]);
  const ops = opsCount(txns);
  const sales = saleCount(txns);
  const theoretical = session?.theoreticalBalance ?? 0;
  const countedN = counted === "" ? null : Number(counted);
  const gap = countedN == null || Number.isNaN(countedN) ? null : countedN - theoretical;
  const drawer = isOpen
    ? theoretical
    : (session?.closingCounted ?? session?.theoreticalBalance ?? 0);

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

  function openOut(kind: "out" | "bank") {
    setOutKind(kind);
    setOutReason(kind === "bank" ? "Dépôt banque / coffre" : "");
    setOutOpen(true);
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
    setCounted("");
    setCloseReason("");
    toast("Caisse fermée.", "success");
  }

  const tabs: { id: CashTab; label: string }[] = [
    { id: "overview", label: "Vue générale" },
    { id: "journal", label: `Journal (${txns.length})` },
    { id: "out", label: `Sorties (${formatMad(session?.cashOut ?? 0)})` },
    { id: "refunds", label: `Remboursements (${formatMad(refunds)})` },
    { id: "history", label: "Clôtures" },
  ];

  if (loading) {
    return <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">Chargement…</div>;
  }

  return (
    <>
      <CashRegisterMobile
        orgName={user.orgName || "Votre institut"}
        roleLabel={ROLE_LABEL[user.role]}
        session={session}
        isOpen={Boolean(isOpen)}
        canWrite={canWrite}
        showExpenses={showExpenses}
        showPayments={showPayments}
        insight={insight}
        tab={tab}
        onTab={setTab}
        search={search}
        onSearch={setSearch}
        txns={txns}
        filtered={filtered}
        recentClosed={recentClosed}
        float={float}
        onFloat={setFloat}
        counted={counted}
        onCounted={setCounted}
        closeReason={closeReason}
        onCloseReason={setCloseReason}
        submitting={submitting}
        onOpen={handleOpen}
        onPay={openPayDrawer}
        onOut={() => openOut("out")}
        onBank={() => openOut("bank")}
        onClose={handleClose}
      />

      <div className="hidden space-y-6 lg:block">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0DDE9] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                <span className={cn("h-2 w-2 rounded-full", isOpen ? "animate-pulse bg-emerald-600" : "bg-ink/30")} />
                {isOpen
                  ? `Caisse ouverte ${formatCashTime(session?.openedAt)}`
                  : "Caisse fermée"}
              </span>
              <span className="rounded-full bg-[#FFDEA4]/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5D4200]">
                {ROLE_LABEL[user.role]}
                {session?.openedByName ? ` · ${session.openedByName}` : ""}
              </span>
              <span className="rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-semibold text-ink/55">
                Fond {formatMad(session?.openingFloat ?? (Number(float) || 0))}
              </span>
            </div>
            <div>
              <h1 className="flex items-center gap-2 font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
                <Wallet size={26} className="text-primary" />
                Caisse & mouvements
              </h1>
              <p className="mt-1 max-w-3xl text-[15px] text-ink/50">
                {user.orgName || "Votre institut"} — encaissements, sorties tiroir et clôture. Seules les
                espèces alimentent le solde physique.
              </p>
            </div>
          </div>
          {canWrite && isOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openPayDrawer}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-white shadow-md"
              >
                <Plus size={18} />
                Nouvel encaissement
              </button>
              <button
                type="button"
                onClick={() => openOut("out")}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#F0DDE9] px-3.5 text-[14px] font-semibold text-ink"
              >
                <Banknote size={18} className="text-[#7B5900]" />
                Sortie
              </button>
              <button
                type="button"
                onClick={() => openOut("bank")}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#F0DDE9] px-3.5 text-[14px] font-semibold text-ink"
              >
                <Landmark size={18} />
                Banque
              </button>
              <button
                type="button"
                onClick={() => {
                  setCounted(String(theoretical));
                  document.getElementById("cash-close")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-ink px-4 text-[14px] font-semibold text-[#FEECF7]"
              >
                <Lock size={18} className="text-[#FFDEA4]" />
                Clôturer
              </button>
            </div>
          ) : null}
        </section>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "whitespace-nowrap rounded-lg px-4 py-2 text-[14px] font-semibold",
                tab === t.id ? "bg-[#F0DDE9] text-ink shadow-sm" : "bg-[#FFEFF8] text-ink/60 hover:bg-[#FCE9F4]",
              )}
            >
              {t.label}
            </button>
          ))}
          {showExpenses ? (
            <Link
              href="/expenses/"
              className="whitespace-nowrap rounded-lg bg-[#FFEFF8] px-4 py-2 text-[14px] font-semibold text-ink/60 hover:bg-[#FCE9F4]"
            >
              Dépenses
            </Link>
          ) : null}
        </div>

        {tab !== "history" ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
            <KpiCard
              label="Espèces au tiroir"
              value={formatMad(drawer)}
              hint={
                session?.status === "CLOSED" && session.difference != null && session.difference !== 0
                  ? `Écart ${formatMad(session.difference)}`
                  : isOpen
                    ? "Solde théorique"
                    : "Dernier comptage"
              }
              alert={session?.status === "CLOSED" && (session.difference ?? 0) !== 0}
              icon={<Banknote size={18} />}
            />
            <KpiCard
              label="Encaissements espèces"
              value={formatMad(session?.cashIn ?? 0)}
              hint="Session ouverte"
              icon={<CreditCard size={18} />}
            />
            <KpiCard
              label="Sorties caisse"
              value={formatMad(session?.cashOut ?? 0)}
              hint="Espèces décaissées"
              icon={<Wallet size={18} />}
            />
            <KpiCard
              label="Remboursements"
              value={formatMad(refunds)}
              hint="Mouvements REFUND"
              icon={<AlertTriangle size={18} />}
            />
            <KpiCard
              label="Paiements du jour"
              value={formatMad(session?.paymentsToday.total ?? 0)}
              hint="Toutes méthodes"
              accent
              icon={<Wallet size={18} />}
            />
            <KpiCard
              label="Mouvements"
              value={`${ops}`}
              hint={`${sales} encaissement${sales > 1 ? "s" : ""}`}
              icon={<Wallet size={18} />}
            />
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-xl bg-ink p-6 text-[#FEECF7] shadow-xl">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#FFDEA4]">
                <Sparkles size={16} />
                Lecture de caisse
              </div>
              <p className="text-[18px] font-semibold leading-7">{insight}</p>
            </div>
            {canWrite && isOpen ? (
              <button
                type="button"
                onClick={() => document.getElementById("cash-close")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#FFDEA4] px-4 text-[14px] font-bold text-[#261900]"
              >
                Rapprochement
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            {!isOpen && canWrite ? (
              <div className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-[18px] font-semibold">Ouvrir la caisse</h2>
                {session?.status === "CLOSED" ? (
                  <p className="text-[13px] text-ink/55">
                    Dernière caisse fermée le {formatCashTime(session.closedAt)}
                    {session.closedAt ? ` (${new Date(session.closedAt).toLocaleDateString("fr-MA")})` : ""}
                    {session.difference != null ? ` · écart ${formatMad(session.difference)}` : ""}.
                  </p>
                ) : (
                  <p className="text-[13px] text-ink/55">Aucune caisse ouverte.</p>
                )}
                <label className="block text-[13px]">
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
              </div>
            ) : !isOpen && !canWrite ? (
              <p className="rounded-xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">Lecture seule. Aucune caisse ouverte.</p>
            ) : null}

            {tab === "history" ? (
              <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-[22px] font-semibold">Historique des clôtures</h2>
                {recentClosed.length === 0 ? (
                  <p className="text-[13px] text-ink/50">Aucune clôture enregistrée.</p>
                ) : (
                  recentClosed.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-3"
                    >
                      <div>
                        <p className="text-[14px] font-semibold">{closedHistoryLabel(row)}</p>
                        <p className="text-[12px] text-ink/50">
                          {row.closedByName ?? "—"}
                          {row.expectedBalance != null ? ` · Th. ${formatMad(row.expectedBalance)}` : ""}
                          {row.closingCounted != null ? ` · Réel ${formatMad(row.closingCounted)}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[11px] font-bold",
                          (row.difference ?? 0) === 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-[#FFDAD6] text-[#93000A]",
                        )}
                      >
                        {row.difference == null ? "—" : formatMad(row.difference)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-[22px] font-semibold">Journal des flux</h2>
                    <p className="text-[13px] text-ink/50">Mouvements de la session courante.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink/35" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ticket, motif…"
                        className="h-9 w-56 rounded-lg bg-[#FFEFF8] pl-8 pr-3 text-[13px] outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      title="Exporter CSV"
                      onClick={() => exportCashCsv(filtered)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFEFF8] text-ink hover:bg-[#FCE9F4]"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                        <th className="rounded-l-lg px-3 py-2.5">Heure</th>
                        <th className="px-3 py-2.5">Type / motif</th>
                        <th className="px-3 py-2.5">Mode</th>
                        <th className="px-3 py-2.5">Opérateur</th>
                        <th className="px-3 py-2.5 text-right">Montant</th>
                        <th className="rounded-r-lg px-3 py-2.5 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t.id} className="border-t border-transparent hover:bg-[#FFEFF8]/60">
                          <td className="whitespace-nowrap px-3 py-3 font-semibold">
                            {formatCashTime(t.createdAt)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold">{CASH_TXN_LABEL[t.type]}</div>
                            <div className="text-[12px] text-ink/50">{t.reason || "—"}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {t.method ? PAYMENT_METHOD_LABEL[t.method] : "—"}
                          </td>
                          <td className="px-3 py-3 text-ink/55">{t.userName ?? "—"}</td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-3 py-3 text-right font-semibold",
                              t.amount < 0 ? "text-[#BA1A1A]" : "text-primary",
                            )}
                          >
                            {t.amount > 0 ? "+" : ""}
                            {formatMad(t.amount)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                                txnTypeChip(t.type),
                              )}
                            >
                              {CASH_TXN_LABEL[t.type]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 ? (
                    <p className="p-6 text-center text-[13px] text-ink/50">Aucun mouvement.</p>
                  ) : null}
                </div>

                {session ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFEFF8] p-4 text-[13px]">
                    <span className="text-ink/55">
                      {filtered.length} ligne{filtered.length > 1 ? "s" : ""} affichée
                      {filtered.length > 1 ? "s" : ""}
                    </span>
                    <div className="flex flex-wrap gap-2 text-[14px] font-semibold">
                      <span className="rounded bg-white px-3 py-1">
                        Carte : {formatMad(session.paymentsToday.card)}
                      </span>
                      <span className="rounded bg-white px-3 py-1">
                        Espèces : {formatMad(session.paymentsToday.cash)}
                      </span>
                      <span className="rounded bg-white px-3 py-1">
                        Virement : {formatMad(session.paymentsToday.transfer)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold">Permissions caisse</h3>
              <p className="text-[13px] text-ink/50">
                Vous êtes <strong>{ROLE_LABEL[user.role]}</strong>
                {canWrite
                  ? " : ouverture, encaissement, sorties et clôture."
                  : " : consultation du journal."}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <RoleCard
                  title="Propriétaire / responsable"
                  items={["Ouvrir et clôturer", "Sorties tiroir", "Encaisser les tickets"]}
                />
                <RoleCard
                  title="Caisse"
                  items={["Encaisser", "Consulter le tiroir", "Sorties justifiées"]}
                />
                <RoleCard
                  title="Comptable"
                  items={["Lecture des sessions", "Paiements du jour", "Sans clôture"]}
                  muted
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-4">
            {isOpen ? (
              <div id="cash-close" className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-[18px] font-semibold">Rapprochement espèces</h3>
                <p className="text-[13px] text-ink/50">Contrôle du tiroir — solde théorique vs comptage.</p>
                <div className="space-y-2 rounded-lg bg-[#FFEFF8] p-3 text-[13px]">
                  <div className="flex justify-between text-ink/55">
                    <span>Fonds initial</span>
                    <span className="font-semibold text-ink">{formatMad(session?.openingFloat ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-ink/55">
                    <span>+ Encaissements espèces</span>
                    <span className="font-semibold text-emerald-700">{formatMad(session?.cashIn ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-ink/55">
                    <span>- Sorties tiroir</span>
                    <span className="font-semibold text-[#BA1A1A]">{formatMad(-(session?.cashOut ?? 0))}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#E4BDC2]/40 pt-2 font-bold">
                    <span>= Solde théorique</span>
                    <span className="text-[22px] text-primary">{formatMad(theoretical)}</span>
                  </div>
                </div>
                {canWrite ? (
                  <>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/45">
                      Espèces comptées
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={counted}
                        onChange={(e) => setCounted(e.target.value)}
                        className="mt-1 h-12 w-full rounded-lg bg-[#F0DDE9] px-4 text-[22px] font-bold outline-none"
                      />
                    </label>
                    {gap != null && gap !== 0 ? (
                      <div className="rounded-lg bg-[#FFDAD6] p-3 text-[#93000A]">
                        <div className="flex items-center gap-1.5 text-[14px] font-bold">
                          <AlertTriangle size={16} />
                          Écart constaté : {formatMad(gap)}
                        </div>
                        <p className="mt-1 text-[13px]">Un motif est obligatoire avant validation.</p>
                      </div>
                    ) : gap === 0 ? (
                      <p className="text-[13px] font-semibold text-emerald-700">Comptage aligné.</p>
                    ) : null}
                    <label className="block text-[13px]">
                      <span className="mb-1 block text-ink/55">Motif de clôture</span>
                      <textarea
                        value={closeReason}
                        onChange={(e) => setCloseReason(e.target.value)}
                        rows={2}
                        placeholder="Ex. fond conforme, rendu monnaie…"
                        className="w-full rounded-lg bg-[#FFEFF8] p-2.5 text-[13px] outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={submitting || counted === "" || !closeReason.trim()}
                      onClick={handleClose}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-bold text-white shadow-md disabled:opacity-40"
                    >
                      <Lock size={18} />
                      Valider le rapprochement
                    </button>
                  </>
                ) : (
                  <p className="text-[13px] text-ink/45">Lecture seule.</p>
                )}
              </div>
            ) : null}

            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-semibold">Ventilation du jour</h3>
                <span className="text-[13px] font-semibold text-[#7B5900]">
                  {formatMad(session?.paymentsToday.total ?? 0)}
                </span>
              </div>
              {mix.length === 0 ? (
                <p className="text-[13px] text-ink/50">Aucun paiement aujourd’hui.</p>
              ) : (
                <div className="space-y-3">
                  {mix.map((m) => (
                    <div key={m.key} className="space-y-1">
                      <div className="flex justify-between text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <span className={cn("h-2.5 w-2.5 rounded-full", m.dot)} />
                          {m.label}
                        </span>
                        <span className="font-semibold">
                          {formatMad(m.amount)} ({m.pct} %)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#FFEFF8]">
                        <div className={cn("h-full rounded-full", m.bar)} style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold">Dernières clôtures</h3>
              {recentClosed.length === 0 ? (
                <p className="text-[13px] text-ink/50">Aucune clôture.</p>
              ) : (
                recentClosed.slice(0, 4).map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2.5">
                    <div>
                      <p className="text-[13px] font-semibold">{closedHistoryLabel(row)}</p>
                      <p className="text-[12px] text-ink/50">{row.closedByName ?? "—"}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[11px] font-bold",
                        (row.difference ?? 0) === 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-[#FFDAD6] text-[#93000A]",
                      )}
                    >
                      {row.difference == null ? "—" : formatMad(row.difference)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {showPayments ? (
              <Link href="/payments/" className="block text-center text-[13px] font-semibold text-primary hover:underline">
                Historique des paiements →
              </Link>
            ) : null}
          </div>
        </div>
      </div>

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

      <Drawer
        open={outOpen}
        onClose={() => setOutOpen(false)}
        title={outKind === "bank" ? "Sortie banque / coffre" : "Sortie de caisse"}
      >
        <div className="space-y-4">
          <p className="text-[13px] text-ink/55">
            Enregistre une sortie espèces (CASH_OUT). Les dépenses fournisseurs restent dans Dépenses.
          </p>
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
    </>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  alert,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  alert?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="rounded-lg bg-[#FCE9F4] p-1.5 text-primary">{icon}</span>
      </div>
      <div className="mt-2">
        <div className={cn("text-[22px] font-semibold tracking-tight", accent ? "text-primary" : "text-ink")}>
          {value}
        </div>
        <p className={cn("mt-1 text-[13px]", alert ? "font-semibold text-[#BA1A1A]" : "text-ink/50")}>{hint}</p>
      </div>
    </div>
  );
}

function RoleCard({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div className={cn("space-y-2 rounded-lg p-4", muted ? "bg-[#FFEFF8]" : "bg-[#F0DDE9]/50")}>
      <p className="text-[14px] font-bold">{title}</p>
      <ul className="space-y-1 text-[13px] text-ink">
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}
