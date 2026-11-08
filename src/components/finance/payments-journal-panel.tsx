"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Banknote, CreditCard, Gift, Landmark, Search, Wallet } from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import {
  PAYMENT_PAGE_SIZE,
  type PaymentPeriod,
  billableToDuePayment,
  filterPayments,
  formatPaymentDateTime,
  formatPaymentServices,
  groupPaymentsByClient,
  isUnpaidDue,
  paymentInitials,
  paymentOrigin,
  paymentDisplayId,
  paymentStatusChip,
  periodLabel,
  signedPaymentAmount,
  sortPaymentsNewestFirst,
} from "@/components/finance/payment-helpers";
import { PaymentTicketModal } from "@/components/finance/payment-ticket";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  formatMad,
  listBillableAppointments,
  listPayments,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/modules/finance/service";
import type { PaymentItem, PaymentMethod } from "@/types/finance";

type Billable = Awaited<ReturnType<typeof listBillableAppointments>>[number];

function MethodGlyph({ method, className }: { method: PaymentMethod; className?: string }) {
  const cls = cn("h-4 w-4", className);
  if (method === "CARD") return <CreditCard className={cls} />;
  if (method === "CASH") return <Banknote className={cls} />;
  if (method === "TRANSFER") return <Landmark className={cls} />;
  if (method === "GIFT_CARD") return <Gift className={cls} />;
  return <Wallet className={cls} />;
}

type Props = {
  canWrite?: boolean;
  onCollect?: (input: { appointmentId: string; amount: number }) => void;
  /** Rafraîchir depuis l’extérieur (ex. après encaissement caisse) */
  refreshKey?: number;
  className?: string;
  headerExtra?: ReactNode;
};

export function PaymentsJournalPanel({
  canWrite = false,
  onCollect,
  refreshKey = 0,
  className,
  headerExtra,
}: Props) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentItem[]>([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PaymentPeriod>("today");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticketPayment, setTicketPayment] = useState<PaymentItem | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [payments, unpaid] = await Promise.all([
        listPayments({ limit: 120 }),
        listBillableAppointments().catch(() => [] as Billable[]),
      ]);
      const dueRows = unpaid.map(billableToDuePayment);
      setRows(sortPaymentsNewestFirst([...dueRows, ...payments]));
    } catch {
      toast("Impossible de charger les paiements.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh, refreshKey]);

  const filtered = useMemo(
    () =>
      groupPaymentsByClient(
        filterPayments(rows, {
          period,
          method: "",
          staff: "",
          search,
          tab: "all",
        }),
      ),
    [rows, period, search],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAYMENT_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAYMENT_PAGE_SIZE, page * PAYMENT_PAGE_SIZE);
  const selected =
    (selectedId
      ? filtered.find((p) => p.id === selectedId || p.groupIds?.includes(selectedId))
      : undefined) ??
    paged[0] ??
    filtered[0] ??
    null;

  useEffect(() => {
    setPage(1);
  }, [search, period]);

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  return (
    <>
      <section className={cn("overflow-hidden rounded-xl bg-white shadow-sm", className)}>
        <div className="flex flex-col gap-3 bg-[#FFEFF8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[18px] font-semibold">Journal · paiements & RDV non payés</span>
            <span className="rounded-full bg-[#F0DDE9] px-2 py-0.5 text-[11px] font-bold text-ink/55">
              {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {headerExtra}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cliente, ticket…"
                className="h-9 w-44 rounded-lg bg-white pl-8 pr-2 text-[13px] outline-none ring-1 ring-[#F0DDE9] focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Select
              className="h-9 w-36 text-[13px]"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PaymentPeriod)}
            >
              <option value="today">Aujourd’hui</option>
              <option value="7d">7 jours</option>
              <option value="month">Ce mois</option>
              <option value="all">Tout</option>
            </Select>
            <span className="text-[11px] text-ink/50">{periodLabel(period)}</span>
          </div>
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
                    <th className="px-3 py-2.5">N° passage · date</th>
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
                            {paymentDisplayId(p)}
                          </div>
                          <div className="text-[11px] text-ink/50">
                            {formatPaymentDateTime(p.paidAt)}
                          </div>
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
                          <div className="font-semibold leading-snug">
                            {formatPaymentServices(p.serviceName)}
                          </div>
                          {p.groupParts && p.groupParts.length > 1 ? (
                            <div className="mt-0.5 space-y-0.5 text-[11px] text-ink/50">
                              {p.groupParts.map((part, index) => (
                                <div key={`${p.id}-part-${index}`}>
                                  {part.label} · {formatMad(Math.abs(part.amount))}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-ink/45">{origin.label}</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isUnpaidDue(p) ? (
                            <span className="text-[11px] font-semibold text-ink/40">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-[#F6E3EF] px-2 py-1 text-[11px] font-semibold">
                              <MethodGlyph method={p.method} />
                              {PAYMENT_METHOD_LABEL[p.method]}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <div className={cn("font-bold", signed < 0 && "text-[#BA1A1A]")}>
                            {signed < 0 ? "−" : ""}
                            {formatMad(Math.abs(signed))}
                          </div>
                          <div className="text-[10px] uppercase text-ink/45">
                            {isUnpaidDue(p) ? "Reste à payer" : PAYMENT_KIND_LABEL[p.kind]}
                          </div>
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
                          <div className="flex flex-col items-center gap-1">
                            {isUnpaidDue(p) && p.appointmentId && canWrite && onCollect ? (
                              <button
                                type="button"
                                className="text-[12px] font-semibold text-primary hover:underline"
                                onClick={() =>
                                  onCollect({
                                    appointmentId: p.appointmentId!,
                                    amount: p.amount,
                                  })
                                }
                              >
                                Encaisser
                              </button>
                            ) : null}
                            {!isUnpaidDue(p) ? (
                              <button
                                type="button"
                                className="text-[12px] font-semibold text-primary hover:underline"
                                onClick={() => setTicketPayment(p)}
                              >
                                Ticket
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

      {ticketPayment ? (
        <PaymentTicketModal
          payment={ticketPayment}
          orgName={user.orgName || "Institut"}
          remaining={null}
          onClose={() => setTicketPayment(null)}
        />
      ) : null}
    </>
  );
}
