"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CreditCard,
  Download,
  Gift,
  Landmark,
  Plus,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  PAYMENT_PAGE_SIZE,
  type PaymentPeriod,
  type PaymentTab,
  exportPaymentsCsv,
  filterPayments,
  formatPaymentDateTime,
  formatPaymentTime,
  paymentInsight,
  paymentInitials,
  paymentKpis,
  paymentMix,
  paymentOrigin,
  paymentShortId,
  paymentStatusChip,
  periodLabel,
  signedPaymentAmount,
  staffOptions,
  matchesPaymentTab,
  waMeLink,
} from "@/components/finance/payment-helpers";
import { PaymentsMobile } from "@/components/finance/payments-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canCreateRefund, canWriteCashRegister } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  createPayments,
  formatMad,
  getPaymentSummary,
  listBillableAppointments,
  listPayments,
  newIdempotencyKey,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
  refundPayment,
} from "@/modules/finance/service";
import type { AppointmentPaymentSummary, PaymentItem, PaymentMethod } from "@/types/finance";
import { PAYMENT_METHODS } from "@/types/finance";

type Billable = Awaited<ReturnType<typeof listBillableAppointments>>[number];

function MethodGlyph({ method, className }: { method: PaymentMethod; className?: string }) {
  const cls = cn("h-4 w-4", className);
  if (method === "CARD") return <CreditCard className={cls} />;
  if (method === "CASH") return <Banknote className={cls} />;
  if (method === "TRANSFER") return <Landmark className={cls} />;
  if (method === "GIFT_CARD") return <Gift className={cls} />;
  return <Wallet className={cls} />;
}

export function PaymentsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCashRegister(user.role);
  const canPos = canAccessNav(user.role, "pos");
  const canCash = canAccessNav(user.role, "cash-register");
  const canCustomers = canAccessNav(user.role, "customers");
  const canInvoices = canAccessNav(user.role, "invoices");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentItem[]>([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PaymentPeriod>("all");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "">("");
  const [staff, setStaff] = useState("");
  const [tab, setTab] = useState<PaymentTab>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<AppointmentPaymentSummary | null>(null);

  const [refundTarget, setRefundTarget] = useState<PaymentItem | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("CASH");
  const [refundReason, setRefundReason] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [billable, setBillable] = useState<Billable[]>([]);
  const [aptId, setAptId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await listPayments({ limit: 80 }));
    } catch {
      toast("Impossible de charger les paiements.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const scoped = useMemo(
    () =>
      filterPayments(rows, {
        period,
        method: methodFilter,
        staff,
        search,
        tab: "all",
      }),
    [rows, period, methodFilter, staff, search],
  );

  const kpis = useMemo(() => paymentKpis(scoped), [scoped]);
  const mix = useMemo(() => paymentMix(kpis), [kpis]);
  const insight = useMemo(() => paymentInsight(kpis, period), [kpis, period]);
  const operators = useMemo(() => staffOptions(rows), [rows]);

  const filtered = useMemo(() => scoped.filter((p) => matchesPaymentTab(p, tab)), [scoped, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAYMENT_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAYMENT_PAGE_SIZE, page * PAYMENT_PAGE_SIZE);
  const selected =
    (selectedId ? filtered.find((p) => p.id === selectedId) : undefined) ??
    paged[0] ??
    filtered[0] ??
    null;

  useEffect(() => {
    setPage(1);
  }, [search, period, methodFilter, staff, tab]);

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selected?.appointmentId) {
      setRemaining(null);
      return;
    }
    let cancelled = false;
    getPaymentSummary(selected.appointmentId)
      .then((s) => {
        if (!cancelled) setRemaining(s);
      })
      .catch(() => {
        if (!cancelled) setRemaining(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.appointmentId, selected?.id]);

  function canRefundRow(p: PaymentItem) {
    return (
      canWrite &&
      p.kind !== "REFUND" &&
      p.status === "COMPLETED" &&
      canCreateRefund(user.role, p.amount)
    );
  }

  function openRefund(p: PaymentItem) {
    setRefundTarget(p);
    setRefundAmount(String(p.amount));
    setRefundMethod(p.method);
    setRefundReason("");
  }

  async function openPay(preset?: { appointmentId?: string; amount?: number }) {
    try {
      const list = await listBillableAppointments();
      let next = list;
      if (
        preset?.appointmentId &&
        !list.some((b) => b.id === preset.appointmentId) &&
        selected
      ) {
        next = [
          {
            id: preset.appointmentId,
            customerName: selected.customerName ?? "—",
            serviceName: selected.serviceName ?? "Rendez-vous",
            price: remaining?.price ?? preset.amount ?? 0,
            remaining: preset.amount ?? remaining?.remaining ?? 0,
            status: "CONFIRMED",
            startAt: selected.paidAt,
          },
          ...list,
        ];
      }
      setBillable(next);
      const id = preset?.appointmentId || next[0]?.id || "";
      setAptId(id);
      const fromList = next.find((b) => b.id === id);
      setPayAmount(String(preset?.amount ?? fromList?.remaining ?? ""));
      setPayOpen(true);
    } catch {
      toast("Impossible de charger les RDV à encaisser.", "error");
    }
  }

  async function handlePay() {
    if (!aptId) return;
    setSubmitting(true);
    const result = await createPayments({
      appointmentId: aptId,
      items: [{ amount: Number(payAmount), method: payMethod }],
      idempotencyKey: newIdempotencyKey("pay"),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Paiement enregistré.", "success");
    setPayOpen(false);
    await refresh();
  }

  async function handleRefund() {
    if (!refundTarget) return;
    setSubmitting(true);
    const result = await refundPayment(refundTarget.id, {
      amount: Number(refundAmount),
      method: refundMethod,
      reason: refundReason || undefined,
      idempotencyKey: newIdempotencyKey("ref"),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Remboursement enregistré (paiement d’origine intact).", "success");
    setRefundTarget(null);
    refresh();
  }

  const tabs: { id: PaymentTab; label: string; count: number; dot?: string }[] = [
    { id: "all", label: "Tous", count: kpis.count },
    { id: "paid", label: "Payés", count: kpis.paidCount, dot: "bg-emerald-600" },
    { id: "pending", label: "En attente", count: kpis.pendingCount, dot: "bg-amber-500" },
    { id: "deposit", label: "Acomptes", count: kpis.depositCount, dot: "bg-[#FCCA66]" },
    { id: "refunded", label: "Remboursés", count: kpis.refundedCount, dot: "bg-purple-500" },
    { id: "failed", label: "Échoués", count: kpis.failedCount, dot: "bg-[#BA1A1A]" },
  ];

  return (
    <>
      <PaymentsMobile
        orgName={user.orgName}
        insight={insight}
        kpis={kpis}
        mix={mix}
        search={search}
        onSearch={setSearch}
        tab={tab}
        onTab={setTab}
        period={period}
        onPeriod={setPeriod}
        method={methodFilter}
        onMethod={setMethodFilter}
        canWrite={canWrite}
        canPos={canPos}
        canCash={canCash}
        loading={loading}
        rows={filtered}
        selected={selected}
        onSelect={setSelectedId}
        remaining={remaining}
        onNew={() => openPay()}
        onRefund={openRefund}
        onCollectRemaining={() => {
          if (selected?.appointmentId && remaining) {
            openPay({ appointmentId: selected.appointmentId, amount: remaining.remaining });
          }
        }}
        canRefund={canRefundRow}
        exportCsv={() => exportPaymentsCsv(filtered)}
      />

      <div className="hidden space-y-4 lg:block">
        <section className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[28px] font-semibold leading-9 tracking-tight">Paiements & règlements</h1>
                <span className="rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#261900]">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-ink/55">
                Journal des encaissements Agenda et POS · {user.orgName}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportPaymentsCsv(filtered)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#F6E3EF] px-4 text-[14px] font-semibold"
            >
              <Download size={18} />
              Exporter CSV
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={() => openPay()}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-white shadow-sm"
              >
                <Plus size={18} />
                Nouveau paiement
              </button>
            ) : null}
          </div>
        </section>

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-2 lg:grid-cols-12">
            <div className="relative lg:col-span-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher cliente, id, prestation…"
                className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-10 pr-3 text-[13px] outline-none ring-primary/30 focus:bg-white focus:ring-2"
              />
            </div>
            <div className="lg:col-span-2">
              <Select
                className="h-11"
                value={period}
                onChange={(e) => setPeriod(e.target.value as PaymentPeriod)}
              >
                <option value="all">{periodLabel("all")}</option>
                <option value="today">{periodLabel("today")}</option>
                <option value="yesterday">{periodLabel("yesterday")}</option>
                <option value="7d">{periodLabel("7d")}</option>
                <option value="month">{periodLabel("month")}</option>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select
                className="h-11"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | "")}
              >
                <option value="">Toutes les méthodes</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select className="h-11" value={tab} onChange={(e) => setTab(e.target.value as PaymentTab)}>
                <option value="all">Tous les statuts</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="deposit">Acompte</option>
                <option value="refunded">Remboursé</option>
                <option value="failed">Échoué</option>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select className="h-11" value={staff} onChange={(e) => setStaff(e.target.value)}>
                <option value="">Toute l’équipe</option>
                {operators.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tabs
              .filter((t) => t.id === "all" || t.count > 0)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-semibold",
                    tab === t.id ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink hover:bg-[#F6E3EF]",
                  )}
                >
                  {t.dot ? <span className={cn("h-2 w-2 rounded-full", t.dot)} /> : null}
                  {t.label} ({t.count})
                </button>
              ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi
            label="Total encaissé"
            value={formatMad(kpis.inflow)}
            hint={`${kpis.count} opération${kpis.count > 1 ? "s" : ""}`}
            icon={<Wallet size={20} className="text-primary" />}
          />
          <Kpi
            label="Carte"
            value={formatMad(kpis.byMethod.CARD)}
            hint={mixPct(kpis.inflow, kpis.byMethod.CARD)}
            icon={<CreditCard size={20} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Espèces"
            value={formatMad(kpis.byMethod.CASH)}
            hint={mixPct(kpis.inflow, kpis.byMethod.CASH)}
            icon={<Banknote size={20} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Virements"
            value={formatMad(kpis.byMethod.TRANSFER)}
            hint={mixPct(kpis.inflow, kpis.byMethod.TRANSFER)}
            icon={<Landmark size={20} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Remboursements"
            value={kpis.refunds ? `−${formatMad(kpis.refunds)}` : formatMad(0)}
            hint={`${kpis.refundedCount} ligne${kpis.refundedCount > 1 ? "s" : ""}`}
            negative={kpis.refunds > 0}
            icon={<Wallet size={20} className="text-[#BA1A1A]" />}
          />
          <Kpi
            label="Net réalisé"
            value={formatMad(kpis.net)}
            hint="Encaissé − remboursements"
            inverse
            icon={<Sparkles size={20} className="text-[#FFDEA4]" />}
          />
        </section>

        <section className="relative overflow-hidden rounded-xl bg-ink p-5 text-[#FEECF7] shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#FFDEA4]">
            <Sparkles size={16} />
            Lecture du journal
          </div>
          <p className="mt-2 text-[16px] font-semibold leading-7">{insight}</p>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <section className="overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-8">
            <div className="flex items-center justify-between bg-[#FFEFF8] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-semibold">Journal des règlements</span>
                <span className="rounded-full bg-[#F0DDE9] px-2 py-0.5 text-[11px] font-bold text-ink/55">
                  {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-[11px] text-ink/50">Filtre {periodLabel(period)}</span>
            </div>
            {loading ? (
              <p className="p-8 text-center text-[13px] text-ink/50">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-[13px] text-ink/50">Aucun paiement pour ces filtres.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#FCE9F4] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                        <th className="px-3 py-2.5">Id & heure</th>
                        <th className="px-3 py-2.5">Cliente</th>
                        <th className="px-3 py-2.5">Origine</th>
                        <th className="px-3 py-2.5">Méthode</th>
                        <th className="px-3 py-2.5 text-right">Montant</th>
                        <th className="px-3 py-2.5 text-center">Statut</th>
                        <th className="px-3 py-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((p) => {
                        const chip = paymentStatusChip(p);
                        const origin = paymentOrigin(p);
                        const signed = signedPaymentAmount(p);
                        const active = selected?.id === p.id;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedId(p.id)}
                            className={cn(
                              "cursor-pointer border-t border-transparent transition-colors",
                              p.kind === "REFUND" || p.status === "REFUNDED"
                                ? "bg-[#FFDAD6]/20"
                                : p.kind === "DEPOSIT"
                                  ? "bg-amber-500/10"
                                  : active
                                    ? "bg-[#FFD9DE]/40"
                                    : "hover:bg-[#FFEFF8]/70",
                            )}
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              <div className={cn("font-bold", p.kind === "REFUND" && "text-[#BA1A1A]")}>
                                {paymentShortId(p.id)}
                              </div>
                              <div className="text-[11px] text-ink/50">{formatPaymentTime(p.paidAt)}</div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFDEA4] text-[12px] font-bold text-[#261900]">
                                  {paymentInitials(p.customerName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold">{p.customerName ?? "—"}</div>
                                  {p.customerPhone ? (
                                    <div className="truncate text-[11px] text-ink/45">{p.customerPhone}</div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-semibold">{p.serviceName ?? "—"}</div>
                              <div className="text-[11px] text-ink/45">{origin.label}</div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center gap-1 rounded bg-[#F6E3EF] px-2 py-1 text-[11px] font-semibold">
                                <MethodGlyph method={p.method} />
                                {PAYMENT_METHOD_LABEL[p.method]}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              <div className={cn("font-bold", signed < 0 && "text-[#BA1A1A]")}>
                                {signed < 0 ? "−" : ""}
                                {formatMad(Math.abs(signed))}
                              </div>
                              <div className="text-[10px] uppercase text-ink/45">{PAYMENT_KIND_LABEL[p.kind]}</div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-1 text-[11px] font-bold",
                                  chip.className,
                                )}
                              >
                                {chip.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {canRefundRow(p) ? (
                                <button
                                  type="button"
                                  className="text-[12px] font-semibold text-[#BA1A1A] hover:underline"
                                  onClick={() => openRefund(p)}
                                >
                                  Rembourser
                                </button>
                              ) : (
                                <span className="text-[12px] text-ink/30">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col items-center justify-between gap-2 bg-[#FFEFF8] px-3 py-2 text-[13px] text-ink/55 sm:flex-row">
                  <div>
                    Affichage de {(page - 1) * PAYMENT_PAGE_SIZE + 1} à{" "}
                    {Math.min(page * PAYMENT_PAGE_SIZE, filtered.length)} sur {filtered.length}
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
              <PaymentInspect
                payment={selected}
                remaining={remaining}
                canWrite={canWrite}
                canCustomers={canCustomers}
                canInvoices={canInvoices}
                canPos={canPos}
                canCash={canCash}
                canRefund={canRefundRow(selected)}
                onRefund={() => openRefund(selected)}
                onCollect={() => {
                  if (selected.appointmentId && remaining) {
                    openPay({ appointmentId: selected.appointmentId, amount: remaining.remaining });
                  }
                }}
              />
            ) : (
              <div className="rounded-xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">
                Sélectionnez un paiement pour inspecter la fiche.
              </div>
            )}

            {mix.length > 0 ? (
              <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold">Ventilation</h2>
                  <span className="text-[11px] uppercase text-ink/45">{periodLabel(period)}</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-[#F0DDE9]">
                  {mix.map((m) => (
                    <div key={m.key} className={cn("h-full", m.bar)} style={{ width: `${m.pct}%` }} />
                  ))}
                </div>
                <div className="space-y-1.5 text-[12px]">
                  {mix.map((m) => (
                    <div key={m.key} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("h-2.5 w-2.5 rounded-sm", m.dot)} />
                        {m.label}
                      </span>
                      <span className="font-bold">
                        {m.pct}% ({formatMad(m.amount)})
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <p className="rounded-xl bg-[#FFEFF8] p-3 text-[12px] leading-relaxed text-ink/55">
              Un paiement n’est jamais écrasé. Un remboursement crée une ligne REFUND distincte, dans la limite
              de votre rôle.
            </p>
          </aside>
        </div>
      </div>

      <Drawer open={payOpen} onClose={() => setPayOpen(false)} title="Nouveau paiement">
        <div className="space-y-4">
          <p className="text-[13px] text-ink/55">
            Encaissement sur un rendez-vous facturable. Les ventes boutique se font depuis le POS.
          </p>
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
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <Button type="button" variant="primary" className="w-full" disabled={submitting || !aptId} onClick={handlePay}>
            {submitting ? "Encaissement…" : "Encaisser"}
          </Button>
        </div>
      </Drawer>

      <Drawer open={Boolean(refundTarget)} onClose={() => setRefundTarget(null)} title="Remboursement">
        {refundTarget ? (
          <div className="space-y-4 text-sm">
            <p>
              Paiement d’origine : <span className="font-mono">{formatMad(refundTarget.amount)}</span> —{" "}
              {PAYMENT_METHOD_LABEL[refundTarget.method]}
            </p>
            <p className="text-xs text-ink/45">
              Le paiement original n’est pas modifié. Un mouvement REFUND est créé.
            </p>
            <label className="block">
              <span className="mb-1.5 block font-medium">Montant</span>
              <Input
                type="number"
                min={0.01}
                max={refundTarget.amount}
                step={0.01}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Méthode</span>
              <Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Motif</span>
              <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </label>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={submitting || !canCreateRefund(user.role, Number(refundAmount) || 0)}
              onClick={handleRefund}
            >
              Confirmer le remboursement
            </Button>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

function mixPct(total: number, part: number) {
  if (total <= 0 || part <= 0) return "0 % du volume";
  return `${Math.round((part / total) * 100)} % du volume`;
}

function Kpi({
  label,
  value,
  hint,
  icon,
  inverse,
  negative,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  inverse?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl p-4 shadow-sm",
        inverse ? "bg-ink text-[#FEECF7]" : "bg-white",
      )}
    >
      <div className={cn("flex items-center justify-between", inverse ? "text-[#FFDEA4]" : "text-ink/50")}>
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-2">
        <div className={cn("text-[22px] font-bold", negative && "text-[#BA1A1A]")}>{value}</div>
        <div className={cn("mt-1 text-[11px]", inverse ? "text-[#F0BF5C]" : "text-ink/45")}>{hint}</div>
      </div>
    </div>
  );
}

function PaymentInspect({
  payment,
  remaining,
  canWrite,
  canCustomers,
  canInvoices,
  canPos,
  canCash,
  canRefund,
  onRefund,
  onCollect,
}: {
  payment: PaymentItem;
  remaining: AppointmentPaymentSummary | null;
  canWrite: boolean;
  canCustomers: boolean;
  canInvoices: boolean;
  canPos: boolean;
  canCash: boolean;
  canRefund: boolean;
  onRefund: () => void;
  onCollect: () => void;
}) {
  const chip = paymentStatusChip(payment);
  const signed = signedPaymentAmount(payment);
  const wa = waMeLink(payment.customerPhone);
  const origin = paymentOrigin(payment);

  return (
    <section className="relative space-y-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B5900]">Fiche règlement</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h3 className="text-[22px] font-bold">{paymentShortId(payment.id)}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chip.className)}>{chip.label}</span>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-[22px] font-extrabold text-primary", signed < 0 && "text-[#BA1A1A]")}>
            {signed < 0 ? "−" : ""}
            {formatMad(Math.abs(signed))}
          </p>
          <p className="text-[11px] text-ink/45">{PAYMENT_KIND_LABEL[payment.kind]}</p>
        </div>
      </div>

      <dl className="space-y-1.5 rounded-xl bg-[#FFEFF8] p-3 text-[13px]">
        <InspectRow
          label="Cliente"
          value={
            canCustomers && payment.customerId ? (
              <Link href="/customers/" className="font-semibold text-primary hover:underline">
                {payment.customerName ?? "—"}
              </Link>
            ) : (
              payment.customerName ?? "—"
            )
          }
        />
        {payment.customerPhone ? <InspectRow label="Téléphone" value={payment.customerPhone} /> : null}
        <InspectRow label="Prestation" value={payment.serviceName ?? "—"} />
        <InspectRow label="Origine" value={origin.label} />
        <InspectRow label="Horodatage" value={formatPaymentDateTime(payment.paidAt)} />
        <InspectRow label="Opérateur" value={payment.userName ?? "—"} />
        <InspectRow label="Méthode" value={PAYMENT_METHOD_LABEL[payment.method]} />
        {payment.notes ? <InspectRow label="Notes" value={payment.notes} /> : null}
      </dl>

      {remaining && remaining.remaining > 0 ? (
        <div className="space-y-2 rounded-xl bg-amber-500/10 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Solde du rendez-vous</p>
          <p className="text-[13px] text-amber-950">
            Payé {formatMad(remaining.netPaid)} / {formatMad(remaining.price)} · reste{" "}
            <strong>{formatMad(remaining.remaining)}</strong>
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-700"
              style={{
                width: `${remaining.price > 0 ? Math.min(100, Math.round((remaining.netPaid / remaining.price) * 100)) : 0}%`,
              }}
            />
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={onCollect}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-amber-800 text-[14px] font-semibold text-white"
            >
              Encaisser le solde ({formatMad(remaining.remaining)})
            </button>
          ) : null}
        </div>
      ) : remaining && remaining.remaining === 0 && payment.appointmentId ? (
        <p className="rounded-lg bg-emerald-50 p-2 text-[12px] text-emerald-800">RDV soldé · {formatMad(remaining.netPaid)}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {canInvoices ? (
          <Link
            href="/invoices/"
            className="flex h-10 items-center justify-center rounded-lg bg-[#F6E3EF] text-[13px] font-semibold"
          >
            Factures
          </Link>
        ) : null}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center justify-center rounded-lg bg-emerald-700 text-[13px] font-semibold text-white"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
      {canRefund ? (
        <button
          type="button"
          onClick={onRefund}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-[#FFDAD6] text-[13px] font-semibold text-[#93000A]"
        >
          Effectuer un remboursement
        </button>
      ) : null}
      <div className="flex flex-wrap gap-2 text-[12px]">
        {canCash ? (
          <Link href="/cash-register/" className="font-semibold text-primary hover:underline">
            Caisse →
          </Link>
        ) : null}
        {canPos ? (
          <Link href="/pos/" className="font-semibold text-primary hover:underline">
            POS →
          </Link>
        ) : null}
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
