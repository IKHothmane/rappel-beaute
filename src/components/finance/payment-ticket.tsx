"use client";

import { useEffect, useMemo, useState } from "react";
import { soinLabelsFromNotes } from "@/components/agenda/service-notes";
import {
  formatPaymentDateTime,
  paymentServiceLabels,
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
import type { Appointment } from "@/types/appointment";
import type { AppointmentPaymentSummary, PaymentItem } from "@/types/finance";

type TicketLine = { name: string; price: number | null; detail?: string };

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildLines(
  payment: PaymentItem,
  appointment: Appointment | null,
  catalog: { id: string; name: string; price: number }[],
): TicketLine[] {
  const fromNotes = soinLabelsFromNotes(appointment?.notes);
  const fromPayment = paymentServiceLabels(payment.serviceName);
  const names =
    fromNotes.length > 1
      ? fromNotes
      : fromPayment.length > 1
        ? fromPayment
        : fromNotes.length > 0
          ? fromNotes
          : fromPayment;

  if (names.length > 0) {
    return names.map((name) => {
      const match = catalog.find((service) => clean(service.name) === clean(name));
      return { name, price: match?.price ?? null };
    });
  }

  if (appointment?.serviceName) {
    const match = catalog.find((service) => service.id === appointment.serviceId);
    return [
      {
        name: appointment.serviceName,
        price: match?.price ?? appointment.price ?? null,
      },
    ];
  }

  return [
    {
      name:
        payment.serviceName ??
        (payment.kind === "REFUND" ? "Remboursement" : "Règlement"),
      price: Math.abs(signedPaymentAmount(payment)),
    },
  ];
}

export function PaymentTicketModal({
  payment,
  orgName,
  remaining,
  onClose,
}: {
  payment: PaymentItem;
  orgName: string;
  remaining: AppointmentPaymentSummary | null;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<TicketLine[]>(() =>
    buildLines(payment, null, []),
  );
  const [summary, setSummary] = useState<AppointmentPaymentSummary | null>(remaining);
  const [loading, setLoading] = useState(Boolean(payment.appointmentId));
  const signed = signedPaymentAmount(payment);

  useEffect(() => {
    setSummary(remaining);
  }, [remaining]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!payment.appointmentId) {
        setLines(buildLines(payment, null, []));
        setLoading(false);
        return;
      }
      try {
        const [aptRes, svcRes, summaryRes] = await Promise.all([
          fetch(`/api/appointments/${payment.appointmentId}/`, { credentials: "include" }),
          fetch("/api/services/?agenda=1", { credentials: "include" }),
          remaining ? Promise.resolve(null) : getPaymentSummary(payment.appointmentId),
        ]);
        const appointment = aptRes.ok ? ((await aptRes.json()) as Appointment) : null;
        const servicesRaw = svcRes.ok ? await svcRes.json() : null;
        const serviceList = Array.isArray(servicesRaw)
          ? servicesRaw
          : Array.isArray(servicesRaw?.data)
            ? servicesRaw.data
            : [];
        const catalog = serviceList.map(
          (service: { id: string; name: string; price?: number }) => ({
            id: service.id,
            name: service.name,
            price: Number(service.price) || 0,
          }),
        );
        if (!cancelled) {
          setLines(buildLines(payment, appointment, catalog));
          if (summaryRes) setSummary(summaryRes);
        }
      } catch {
        if (!cancelled) {
          setLines(buildLines(payment, null, []));
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

  const ticket = useMemo<BeautyTicket>(() => {
    const priced = lines.map((line) => ({
      name: line.name,
      detail: line.detail,
      price: line.price ?? 0,
    }));
    const linesTotal = priced.reduce((sum, line) => sum + line.price, 0);
    const total =
      summary?.price != null && summary.price > 0
        ? summary.price
        : linesTotal > 0
          ? linesTotal
          : Math.abs(signed);

    return {
      instituteName: orgName || "Institut",
      ticketNumber: `RB-${payment.id.slice(-8).toUpperCase()}`,
      date: formatPaymentDateTime(payment.paidAt),
      clientName: payment.customerName ?? "Cliente",
      paymentMethod: `${PAYMENT_KIND_LABEL[payment.kind]} · ${PAYMENT_METHOD_LABEL[payment.method]}`,
      lines:
        priced.length > 0
          ? priced
          : [
              {
                name: payment.serviceName ?? "Règlement",
                price: Math.abs(signed),
              },
            ],
      total,
      currency: "DH",
    };
  }, [lines, orgName, payment, signed, summary]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/55 p-3 sm:p-4 print:static print:inset-auto print:bg-transparent print:p-0">
      <div
        className="absolute inset-0 print:hidden"
        role="presentation"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[95dvh] w-full max-w-[560px] items-end justify-center overflow-visible print:max-h-none">
        {loading ? (
          <p className="text-center text-sm text-white/80">Préparation du ticket…</p>
        ) : (
          <TicketPrinterAnimation
            key={ticket.ticketNumber}
            mode="payment"
            ticket={ticket}
            onPrint={printBeautyTicket}
          />
        )}
      </div>
    </div>
  );
}
