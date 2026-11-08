"use client";

import { useEffect, useMemo, useState } from "react";
import {
  breakdownToTicketLines,
  fetchPaymentBreakdown,
  type PaymentBreakdown,
} from "@/components/finance/payment-breakdown";
import {
  formatPaymentDateTime,
  signedPaymentAmount,
} from "@/components/finance/payment-helpers";
import TicketPrinterAnimation, {
  type BeautyTicket,
} from "@/components/tickets/TicketPrinterAnimation";
import { printBeautyTicket } from "@/components/tickets/print-beauty-ticket";
import {
  getPaymentSummary,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/modules/finance/service";
import type { AppointmentPaymentSummary, PaymentItem } from "@/types/finance";

export function PaymentTicketModal({
  payment,
  orgName,
  remaining,
  onClose,
}: {
  payment: PaymentItem | null;
  orgName: string;
  remaining: AppointmentPaymentSummary | null;
  onClose: () => void;
}) {
  const [breakdown, setBreakdown] = useState<PaymentBreakdown | null>(null);
  const [summary, setSummary] = useState<AppointmentPaymentSummary | null>(remaining);
  const [loading, setLoading] = useState(Boolean(payment));
  const signed = payment ? signedPaymentAmount(payment) : 0;

  useEffect(() => {
    setSummary(remaining);
  }, [remaining]);

  useEffect(() => {
    if (!payment) {
      setBreakdown(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detail, summaryRes] = await Promise.all([
          fetchPaymentBreakdown(payment),
          payment.appointmentId && !remaining
            ? getPaymentSummary(payment.appointmentId).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setBreakdown(detail);
        if (summaryRes) setSummary(summaryRes);
      } catch {
        if (!cancelled) {
          setBreakdown({ services: [], soldProducts: [], usedProducts: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payment, remaining]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ticket = useMemo<BeautyTicket | null>(() => {
    if (!payment) return null;
    const fromBreakdown = breakdown ? breakdownToTicketLines(breakdown) : [];
    const priced =
      fromBreakdown.length > 0
        ? fromBreakdown
        : [
            {
              name: payment.serviceName ?? "Règlement",
              price: Math.abs(signed),
              detail: "Règlement",
            },
          ];

    const servicesTotal = (breakdown?.services ?? []).reduce(
      (sum, line) => sum + (line.price ?? 0),
      0,
    );
    const productsTotal = (breakdown?.soldProducts ?? []).reduce(
      (sum, line) => sum + line.lineTotal,
      0,
    );
    const chargeable = priced.reduce(
      (sum, line) => sum + line.price * (line.quantity ?? 1),
      0,
    );

    const total =
      servicesTotal + productsTotal > 0
        ? Math.round((servicesTotal + productsTotal) * 100) / 100
        : chargeable > 0
          ? Math.round(chargeable * 100) / 100
          : Math.abs(signed);

    return {
      instituteName: orgName || "Institut",
      ticketNumber:
        payment.ticketNumber?.trim() ||
        `RB-${payment.id.slice(-8).toUpperCase()}`,
      date: formatPaymentDateTime(payment.paidAt),
      clientName: payment.customerName ?? "Cliente",
      paymentMethod: `${PAYMENT_KIND_LABEL[payment.kind]} · ${PAYMENT_METHOD_LABEL[payment.method]}`,
      lines: priced,
      total,
      currency: "DH",
    };
  }, [breakdown, orgName, payment, signed, summary]);

  if (!payment || !ticket) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/55 p-3 sm:p-4 print:static print:inset-auto print:bg-transparent print:p-0">
      <div
        className="absolute inset-0 print:hidden"
        role="presentation"
        onClick={onClose}
      />
      <div className="no-scrollbar relative z-10 flex max-h-[95dvh] w-full max-w-[560px] items-center justify-center overflow-y-auto print:max-h-none">
        {loading ? (
          <p className="text-center text-sm text-white/80">Préparation du ticket…</p>
        ) : (
          <TicketPrinterAnimation
            key={`${ticket.ticketNumber}-${ticket.lines.length}-${ticket.total}`}
            mode="payment"
            ticket={ticket}
            onPrint={printBeautyTicket}
          />
        )}
      </div>
    </div>
  );
}
