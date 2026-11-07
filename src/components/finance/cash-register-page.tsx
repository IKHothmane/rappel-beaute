"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Search } from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { AppointmentPromoNote } from "@/components/finance/appointment-promo-note";
import {
  type CashTab,
  cashInsight,
  closedHistoryLabel,
  exportCashCsv,
  filterCashTxns,
  formatCashDateTime,
  opsCount,
  paymentMix,
  sumAbsTypes,
  txnTypeChip,
} from "@/components/finance/cash-helpers";
import { formatPaymentServices } from "@/components/finance/payment-helpers";
import { CashRegisterHero } from "@/components/finance/cash-register-hero";
import { CashRegisterMobile } from "@/components/finance/cash-register-mobile";
import { PaymentMethodPicker } from "@/components/finance/payment-method-picker";
import { PaymentsJournalPanel } from "@/components/finance/payments-journal-panel";
import { PaymentTicketModal } from "@/components/finance/payment-ticket";
import {
  ProductSalePanel,
  type ProductAddonCart,
} from "@/components/finance/product-sale-panel";
import {
  createPosSaleApi,
  newPosIdempotencyKey,
} from "@/modules/pos/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
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
  getPaymentById,
  listBillableAppointments,
  newIdempotencyKey,
  openCashRegister,
  PAYMENT_METHOD_LABEL,
} from "@/modules/finance/service";
import { listPurchases } from "@/modules/procurement/service";
import type { CashRegisterState, PaymentItem, PaymentMethod } from "@/types/finance";
import type { PurchaseListItem } from "@/types/procurement";

type Billable = Awaited<ReturnType<typeof listBillableAppointments>>[number];

export function CashRegisterPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCashRegister(user.role);
  const showExpenses = canAccessNav(user.role, "expenses");
  const showPayments = canAccessNav(user.role, "payments");

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<CashRegisterState | null>(null);
  const [float, setFloat] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<CashTab>("overview");
  const [search, setSearch] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [outKind, setOutKind] = useState<"out" | "bank">("out");

  const [billable, setBillable] = useState<Billable[]>([]);
  const [payMode, setPayMode] = useState<"service" | "products">("service");
  const [aptId, setAptId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [addonCart, setAddonCart] = useState<ProductAddonCart>({
    lines: [],
    total: 0,
    discount: 0,
    promoCode: null,
  });
  const [addonReset, setAddonReset] = useState(0);

  const [outAmount, setOutAmount] = useState("");
  const [outReason, setOutReason] = useState("");
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [purchaseId, setPurchaseId] = useState("");
  const [counted, setCounted] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [ticketPayment, setTicketPayment] = useState<PaymentItem | null>(null);
  const [ticketLoadingId, setTicketLoadingId] = useState<string | null>(null);
  const [paymentsJournalKey, setPaymentsJournalKey] = useState(0);

  const payKeyRef = useRef(newIdempotencyKey());

  async function openTicket(paymentId: string | null) {
    if (!paymentId) {
      toast("Aucun paiement lié à ce mouvement.", "error");
      return;
    }
    setTicketLoadingId(paymentId);
    const result = await getPaymentById(paymentId);
    setTicketLoadingId(null);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setTicketPayment(result.payment);
  }

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

  const selectedApt = billable.find((b) => b.id === aptId) ?? null;
  const session = state?.session ?? null;
  const txns = state?.transactions ?? [];
  const recentClosed = state?.recentClosed ?? [];
  const isOpen = session?.status === "OPEN";
  const insight = useMemo(() => cashInsight(session, txns), [session, txns]);
  const filtered = useMemo(() => filterCashTxns(txns, tab, search), [txns, tab, search]);
  const mix = paymentMix(session);
  const refunds = sumAbsTypes(txns, ["REFUND_OUT"]);
  const ops = opsCount(txns);
  const theoretical = session?.theoreticalBalance ?? 0;
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

  async function openPayDrawer(presetId?: string) {
    const id = typeof presetId === "string" ? presetId : undefined;
    try {
      const list = await listBillableAppointments(id);
      const chosen = id && list.some((item) => item.id === id) ? id : "";
      const selectedOnly = chosen ? list.filter((item) => item.id === chosen) : [];
      setBillable(selectedOnly);
      setAptId(chosen);
      setPayMode(chosen ? "service" : "products");
      const found = selectedOnly[0];
      setPayAmount(found ? String(found.remaining) : "");
      setAddonCart({ lines: [], total: 0, discount: 0, promoCode: null });
      setAddonReset((n) => n + 1);
      payKeyRef.current = newIdempotencyKey();
      setPayOpen(true);
    } catch {
      toast("Impossible de charger les RDV.", "error");
    }
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("appointmentId");
    if (!id) return;
    void openPayDrawer(id);
    // Ouverture unique depuis le lien Encaisser de l’agenda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay() {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast("Indiquez un montant.", "error");
      return;
    }

    if (!aptId) {
      toast("Choisissez un rendez-vous.", "error");
      return;
    }

    if (addonCart.lines.length > 0 && payMethod === "CASH" && !isOpen) {
      toast("Ouvrez la caisse pour encaisser des produits en espèces.", "error");
      return;
    }

    const items: { amount: number; method: PaymentMethod }[] = [
      { amount, method: payMethod },
    ];
    setSubmitting(true);
    const result = await createPayments({
      appointmentId: aptId,
      items,
      idempotencyKey: payKeyRef.current,
    });
    if (!result.ok) {
      setSubmitting(false);
      toast(result.error, "error");
      return;
    }

    let productMsg = "";
    if (addonCart.lines.length > 0) {
      const sale = await createPosSaleApi({
        lines: addonCart.lines,
        paymentMethod: payMethod,
        discountTotal: addonCart.discount > 0 ? addonCart.discount : 0,
        notes: addonCart.promoCode
          ? `Vente POS · avec service · Promo: ${addonCart.promoCode}`
          : "Vente POS · avec service",
        idempotencyKey: newPosIdempotencyKey(),
      });
      if (!sale.ok) {
        setSubmitting(false);
        toast(`Service encaissé, mais produits : ${sale.error}`, "error");
        setPayOpen(false);
        payKeyRef.current = newIdempotencyKey();
        refresh();
        return;
      }
      productMsg = ` · produits ${formatMad(sale.sale.total)}`;
    }

    setSubmitting(false);
    toast(`Paiement enregistré${productMsg}.`, "success");
    setPayOpen(false);
    setAddonCart({ lines: [], total: 0, discount: 0, promoCode: null });
    payKeyRef.current = newIdempotencyKey();
    setPaymentsJournalKey((n) => n + 1);
    refresh();
  }

  async function openOut(kind: "out" | "bank") {
    setOutKind(kind);
    setPurchaseId("");
    setOutAmount("");
    setOutReason(kind === "bank" ? "Dépôt banque / coffre" : "");
    setOutOpen(true);
    try {
      const res = await listPurchases({ limit: 50 });
      setPurchases(
        res.data.filter((p) => p.status !== "DRAFT" && p.status !== "CANCELLED"),
      );
    } catch {
      setPurchases([]);
    }
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
    { id: "journal", label: "Journal paiements" },
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
        onPay={() => void openPayDrawer()}
        onOut={() => openOut("out")}
        onClose={handleClose}
        onTicket={(paymentId) => void openTicket(paymentId)}
        ticketLoadingId={ticketLoadingId}
      />

      {ticketPayment ? (
        <PaymentTicketModal
          payment={ticketPayment}
          orgName={user.orgName}
          remaining={null}
          onClose={() => setTicketPayment(null)}
        />
      ) : null}

      <div className="hidden min-w-0 space-y-6 lg:block">
        <CashRegisterHero
          isOpen={Boolean(isOpen)}
          balance={drawer}
          openedAt={session?.openedAt}
          canWrite={canWrite}
          float={float}
          onFloatChange={setFloat}
          submitting={submitting}
          lastClosedLabel={
            session?.status === "CLOSED" && session.closedAt
              ? formatCashDateTime(session.closedAt)
              : null
          }
          lastCloseHint={
            session?.status === "CLOSED" && session.difference != null
              ? session.difference === 0
                ? "écart nul"
                : `écart ${formatMad(session.difference)}`
              : null
          }
          openingFloat={session?.openingFloat ?? 0}
          cashIn={session?.cashIn ?? 0}
          cashOut={session?.cashOut ?? 0}
          theoretical={theoretical}
          paymentsToday={session?.paymentsToday.total ?? 0}
          refunds={refunds}
          movements={ops}
          counted={counted}
          onCountedChange={setCounted}
          closeReason={closeReason}
          onCloseReasonChange={setCloseReason}
          onSelectKpi={(kpi) => {
            if (kpi === "in" || kpi === "movements") setTab("journal");
            else if (kpi === "out") setTab("out");
            else setTab("refunds");
          }}
          onPayment={() => void openPayDrawer()}
          onWithdrawal={() => void openOut("out")}
          onRefund={() => {
            setTab("refunds");
            if (showPayments) {
              toast("Les remboursements liés aux tickets se gèrent aussi dans Paiements.", "info");
            }
          }}
          onClose={handleClose}
          onOpen={handleOpen}
        />

        <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-[#F1E8EC] bg-white p-2 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-semibold transition",
                tab === t.id ? "bg-[#981C52] text-white shadow-sm" : "text-[#765E6B] hover:bg-[#FAF0F5]",
              )}
            >
              {t.label}
            </button>
          ))}
          {showExpenses ? (
            <Link
              href="/expenses/"
              className="whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[#765E6B] hover:bg-[#FAF0F5]"
            >
              Dépenses
            </Link>
          ) : null}
        </nav>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <div className="min-w-0 space-y-4 xl:col-span-8">
            {!isOpen && !canWrite ? (
              <p className="rounded-2xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">
                Lecture seule. Aucune caisse ouverte.
              </p>
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
            ) : tab === "out" || tab === "refunds" ? (
              <div className="space-y-5 rounded-[24px] border border-[#F1E8EC] bg-white p-6 shadow-[0_8px_30px_rgba(60,20,40,0.06)] sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-ink">
                      {tab === "out" ? "Sorties de caisse" : "Remboursements tiroir"}
                    </h2>
                    <p className="text-[13px] text-ink/50">Mouvements de la session courante.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ticket, motif…"
                        className="h-10 w-56 rounded-xl bg-[#FAF0F5] pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <button
                      type="button"
                      title="Exporter CSV"
                      onClick={() => exportCashCsv(filtered)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF0F5] text-ink hover:bg-[#FCE9F4]"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {filtered.length === 0 ? (
                    <p className="rounded-2xl bg-[#FAF0F5] p-8 text-center text-[13px] text-ink/50">
                      Aucun mouvement.
                    </p>
                  ) : (
                    filtered.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F1E8EC] bg-[#FFFBFD] px-4 py-3.5 transition hover:border-[#E8C9D6]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-bold text-ink">
                              {CASH_TXN_LABEL[t.type]}
                            </p>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                                txnTypeChip(t.type),
                              )}
                            >
                              {t.method ? PAYMENT_METHOD_LABEL[t.method] : "Espèces"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-ink/50">
                            {formatCashDateTime(t.createdAt)}
                            {t.userName ? ` · ${t.userName}` : ""}
                            {t.reason ? ` · ${t.reason}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-[16px] font-extrabold tabular-nums",
                            t.amount < 0 ? "text-[#BA1A1A]" : "text-[#981C52]",
                          )}
                        >
                          {t.amount > 0 ? "+" : ""}
                          {formatMad(t.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <PaymentsJournalPanel
                canWrite={canWrite}
                refreshKey={paymentsJournalKey}
                onCollect={({ appointmentId, amount }) => {
                  void openPayDrawer(appointmentId).then(() => {
                    setPayAmount(String(amount));
                  });
                }}
              />
            )}
          </div>

          <div className="space-y-4 xl:col-span-4">
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

      <PremiumSidePanel
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Encaisser"
        description="Encaissez un rendez-vous ou des produits."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#FFEFF8] p-1">
            {(
              [
                ["service", "Service / RDV"],
                ["products", "Produits"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPayMode(id)}
                className={cn(
                  "rounded-lg py-2 text-[12px] font-semibold",
                  payMode === id ? "bg-white text-ink shadow-sm" : "text-ink/55",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {payMode === "products" ? (
            <ProductSalePanel
              disabled={!canWrite || submitting}
              cashOpen={isOpen}
              onError={(message) => toast(message, "error")}
              onSold={(sale) => {
                toast(`Vente produits · ${formatMad(sale.total)}`, "success");
                setPayOpen(false);
                setPaymentsJournalKey((n) => n + 1);
                void refresh();
              }}
            />
          ) : (
            <>
              <p className="text-[13px] text-ink/55">
                Encaissez le rendez-vous et, si besoin, ajoutez des produits au même encaissement.
              </p>
              {selectedApt ? (
                <div className="rounded-xl bg-[#FFEFF8] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                    Rendez-vous
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-ink">
                    {selectedApt.customerName}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink/55">
                    {formatPaymentServices(selectedApt.serviceName)} · reste{" "}
                    {formatMad(selectedApt.remaining)}
                  </p>
                </div>
              ) : (
                <p className="rounded-xl bg-[#FFEFF8] px-3 py-3 text-[13px] text-ink/60">
                  Aucun rendez-vous sélectionné. Choisissez-en un dans le journal.
                </p>
              )}
              <AppointmentPromoNote
                promotionCode={selectedApt?.promotionCode}
                promotionName={selectedApt?.promotionName}
                discount={selectedApt?.discount}
              />
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Montant service</span>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </label>
              <PaymentMethodPicker
                value={payMethod}
                onChange={setPayMethod}
                disabled={submitting}
              />

              <ProductSalePanel
                embedded
                resetToken={addonReset}
                disabled={!canWrite || submitting}
                cashOpen={isOpen}
                onError={(message) => toast(message, "error")}
                onCartChange={setAddonCart}
              />

              {addonCart.lines.length > 0 ? (
                <p className="rounded-lg bg-[#FFEFF8] px-3 py-2 text-[12px] text-ink/60">
                  Total à encaisser : service {formatMad(Number(payAmount) || 0)} + produits{" "}
                  {formatMad(addonCart.total)} ={" "}
                  <strong className="text-ink">
                    {formatMad((Number(payAmount) || 0) + addonCart.total)}
                  </strong>
                </p>
              ) : null}

              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={submitting || !aptId || !payAmount || Number(payAmount) <= 0}
                onClick={() => void handlePay()}
              >
                {submitting
                  ? "Encaissement…"
                  : addonCart.lines.length > 0
                    ? `Encaisser service + produits · ${formatMad((Number(payAmount) || 0) + addonCart.total)}`
                    : "Encaisser le service"}
              </Button>
            </>
          )}
        </div>
      </PremiumSidePanel>

      <PremiumSidePanel
        open={outOpen}
        onClose={() => setOutOpen(false)}
        title={outKind === "bank" ? "Sortie banque / coffre" : "Sortie de caisse"}
        description="Retirez des espèces du tiroir pour un achat ou une sortie libre."
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Facture d’achat (facultatif)</span>
            <Select
              value={purchaseId}
              onChange={(e) => {
                const id = e.target.value;
                setPurchaseId(id);
                const p = purchases.find((row) => row.id === id);
                if (p) {
                  setOutAmount(String(p.total));
                  setOutReason(`Achat ${p.number} · ${p.supplierName}`);
                }
              }}
            >
              <option value="">Sortie libre</option>
              {purchases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number} · {p.supplierName} · {formatMad(p.total)}
                </option>
              ))}
            </Select>
          </label>
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
      </PremiumSidePanel>
    </>
  );
}

