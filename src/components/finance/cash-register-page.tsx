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
  sumAbsTypes,
  txnTypeChip,
} from "@/components/finance/cash-helpers";
import { formatPaymentServices } from "@/components/finance/payment-helpers";
import { CashRegisterHero } from "@/components/finance/cash-register-hero";
import { CashRegisterMobile } from "@/components/finance/cash-register-mobile";
import { PaymentMethodPicker } from "@/components/finance/payment-method-picker";
import { PaymentsPageView } from "@/components/finance/payments-page";
import { PaymentTicketModal } from "@/components/finance/payment-ticket";
import {
  ProductSalePanel,
  type ProductAddonCart,
} from "@/components/finance/product-sale-panel";
import { applyAppointmentPromo } from "@/modules/appointments/service";
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
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

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

  async function applyServicePromo(
    code: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!aptId) return { ok: false, error: "Choisissez un rendez-vous." };
    const result = await applyAppointmentPromo(aptId, code);
    if (!result.ok) return result;
    try {
      const list = await listBillableAppointments(aptId);
      const found = list.find((item) => item.id === aptId) ?? list[0];
      if (found) {
        setBillable([found]);
        setPayAmount(String(found.remaining));
      }
    } catch {
      /* montant mis à jour au prochain rechargement */
    }
    toast("Code promo appliqué sur le service.", "success");
    return { ok: true };
  }

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
      const selectedBillable = billable.find((item) => item.id === aptId);
      const sale = await createPosSaleApi({
        lines: addonCart.lines,
        paymentMethod: payMethod,
        appointmentId: aptId,
        customerId: selectedBillable?.customerId || null,
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
    setPaymentsRefreshKey((n) => n + 1);
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
    { id: "overview", label: "Caisse & paiements" },
    { id: "out", label: `Sorties (${formatMad(session?.cashOut ?? 0)})` },
    { id: "refunds", label: `Remboursements (${formatMad(refunds)})` },
    { id: "history", label: "Clôtures" },
  ];

  if (loading) {
    return <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">Chargement…</div>;
  }

  return (
    <>
      <div className="space-y-4 lg:hidden">
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
        {tab === "overview" && showPayments ? (
          <PaymentsPageView embedded refreshKey={paymentsRefreshKey} />
        ) : null}
      </div>

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
            if (kpi === "in" || kpi === "movements") setTab("overview");
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

        <div className="min-w-0 space-y-4">
          {!isOpen && !canWrite ? (
            <p className="rounded-2xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">
              Lecture seule. Aucune caisse ouverte.
            </p>
          ) : null}

          {tab === "history" ? (
            <div className="space-y-4 overflow-hidden rounded-2xl border border-[#EEDFE7] bg-white shadow-[0_8px_28px_rgba(60,20,40,0.06)]">
              <div className="border-b border-[#EEDFE7] bg-gradient-to-r from-[#FFF7FB] to-[#FCE9F4] px-5 py-4">
                <h2 className="text-[20px] font-bold text-[#3A1528]">Historique des clôtures</h2>
              </div>
              <div className="space-y-2 px-4 pb-4">
                {recentClosed.length === 0 ? (
                  <p className="rounded-xl bg-[#FFF7FB] p-6 text-center text-[13px] text-[#765E6B]">
                    Aucune clôture enregistrée.
                  </p>
                ) : (
                  recentClosed.map((row, index) => (
                    <div
                      key={row.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border border-[#F3E6EC] px-4 py-3",
                        index % 2 === 0 ? "bg-white" : "bg-[#FFF9FB]",
                      )}
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-[#3A1528]">{closedHistoryLabel(row)}</p>
                        <p className="text-[12px] text-[#765E6B]">
                          {row.closedByName ?? "—"}
                          {row.expectedBalance != null ? ` · Th. ${formatMad(row.expectedBalance)}` : ""}
                          {row.closingCounted != null ? ` · Réel ${formatMad(row.closingCounted)}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
                          (row.difference ?? 0) === 0
                            ? "bg-[#E6F6ED] text-[#0F6B3C] ring-[#9FD4B3]/55"
                            : "bg-[#FFE2E0] text-[#8C1D18] ring-[#F5B5B0]/60",
                        )}
                      >
                        {row.difference == null ? "—" : formatMad(row.difference)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : tab === "out" || tab === "refunds" ? (
            <div className="space-y-5 overflow-hidden rounded-2xl border border-[#EEDFE7] bg-white shadow-[0_8px_28px_rgba(60,20,40,0.06)]">
              <div className="flex flex-col gap-3 border-b border-[#EEDFE7] bg-gradient-to-r from-[#FFF7FB] to-[#FCE9F4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#3A1528]">
                    {tab === "out" ? "Sorties de caisse" : "Remboursements tiroir"}
                  </h2>
                  <p className="text-[13px] text-[#765E6B]">Mouvements de la session courante.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#765E6B]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Ticket, motif…"
                      className="h-10 w-56 rounded-xl border border-[#EEDFE7] bg-white pl-9 pr-3 text-[13px] text-[#3A1528] outline-none focus:ring-2 focus:ring-[#981C52]/20"
                    />
                  </div>
                  <button
                    type="button"
                    title="Exporter CSV"
                    onClick={() => exportCashCsv(filtered)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEDFE7] bg-white text-[#981C52] hover:bg-[#FCE9F4]"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 px-4 pb-4">
                {filtered.length === 0 ? (
                  <p className="rounded-xl bg-[#FFF7FB] p-8 text-center text-[13px] text-[#765E6B]">
                    Aucun mouvement.
                  </p>
                ) : (
                  filtered.map((t, index) => (
                    <div
                      key={t.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F3E6EC] px-4 py-3.5 transition hover:border-[#E8C9D6] hover:bg-[#FFF0F6]",
                        index % 2 === 0 ? "bg-white" : "bg-[#FFF9FB]",
                        t.amount < 0 && "bg-[#FFF5F4]",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[15px] font-bold text-[#3A1528]">
                            {CASH_TXN_LABEL[t.type]}
                          </p>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1",
                              txnTypeChip(t.type),
                            )}
                          >
                            {t.method ? PAYMENT_METHOD_LABEL[t.method] : "Espèces"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#765E6B]">
                          {formatCashDateTime(t.createdAt)}
                          {t.userName ? ` · ${t.userName}` : ""}
                          {t.reason ? ` · ${t.reason}` : ""}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "text-[16px] font-extrabold tabular-nums",
                          t.amount < 0 ? "text-[#BA1A1A]" : "text-[#0F6B3C]",
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
          ) : showPayments ? (
            <PaymentsPageView embedded refreshKey={paymentsRefreshKey} />
          ) : (
            <p className="rounded-2xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">
              Les paiements ne sont pas accessibles pour votre rôle.
            </p>
          )}
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

          {aptId ? (
            <div className={cn("space-y-4", payMode !== "products" && "hidden")}>
              <div className="rounded-xl bg-[#FFEFF8] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                  Produits pour
                </p>
                <p className="mt-1 text-[15px] font-semibold text-ink">
                  {selectedApt?.customerName ?? "Cliente"}
                </p>
                <p className="mt-0.5 text-[13px] text-ink/55">
                  {formatPaymentServices(selectedApt?.serviceName)} · service{" "}
                  {formatMad(Number(payAmount) || 0)}
                </p>
              </div>
              <ProductSalePanel
                embedded
                startExpanded
                resetToken={addonReset}
                disabled={!canWrite || submitting}
                cashOpen={isOpen}
                onError={(message) => toast(message, "error")}
                onCartChange={setAddonCart}
              />
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => setPayMode("service")}
              >
                {addonCart.lines.length > 0
                  ? `Retour au service · ${addonCart.lines.length} produit${addonCart.lines.length > 1 ? "s" : ""}`
                  : "Retour au service"}
              </Button>
            </div>
          ) : null}

          {payMode === "products" && !aptId ? (
            <ProductSalePanel
              disabled={!canWrite || submitting}
              cashOpen={isOpen}
              onError={(message) => toast(message, "error")}
              onSold={(sale) => {
                toast(`Vente produits · ${formatMad(sale.total)}`, "success");
                setPayOpen(false);
                setPaymentsRefreshKey((n) => n + 1);
                void refresh();
              }}
            />
          ) : null}

          {payMode === "service" ? (
            <>
              <p className="text-[13px] text-ink/55">
                Encaissez le rendez-vous. Pour ajouter des produits, passez sur l’onglet Produits.
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
                canApply={Boolean(aptId)}
                disabled={!canWrite || submitting}
                serviceId={selectedApt?.serviceId}
                onApply={applyServicePromo}
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

              {aptId ? (
                <button
                  type="button"
                  disabled={!canWrite || submitting}
                  onClick={() => setPayMode("products")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-white text-[13px] font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-40"
                >
                  {addonCart.lines.length > 0
                    ? `Produits ajoutés (${addonCart.lines.length}) · modifier`
                    : "Ajouter des produits"}
                </button>
              ) : null}

              {addonCart.lines.length > 0 ? (
                <div className="space-y-2 rounded-xl bg-[#FFEFF8] px-3 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    Produits ajoutés
                  </p>
                  <ul className="space-y-1.5">
                    {addonCart.lines.map((line) => (
                      <li
                        key={line.productId}
                        className="flex items-center justify-between gap-2 text-[13px]"
                      >
                        <span className="min-w-0 truncate font-medium text-ink">
                          {line.name}
                          <span className="text-ink/45"> × {line.quantity}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-ink">
                          {formatMad(line.unitPrice * line.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {addonCart.discount > 0 ? (
                    <p className="text-[12px] text-primary">
                      Remise
                      {addonCart.promoCode ? ` (${addonCart.promoCode})` : ""} −
                      {formatMad(addonCart.discount)}
                    </p>
                  ) : null}
                  <p className="border-t border-primary/10 pt-2 text-[12px] text-ink/60">
                    Total à encaisser : service {formatMad(Number(payAmount) || 0)} + produits{" "}
                    {formatMad(addonCart.total)} ={" "}
                    <strong className="text-ink">
                      {formatMad((Number(payAmount) || 0) + addonCart.total)}
                    </strong>
                  </p>
                </div>
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
          ) : null}
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

