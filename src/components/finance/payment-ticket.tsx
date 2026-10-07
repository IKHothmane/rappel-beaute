"use client";

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import {
  formatPaymentDateTime,
  signedPaymentAmount,
} from "@/components/finance/payment-helpers";
import {
  formatMad,
  getPaymentSummary,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/modules/finance/service";
import type { Appointment } from "@/types/appointment";
import type { AppointmentPaymentSummary, PaymentItem } from "@/types/finance";
import { cn } from "@/lib/utils";

type TicketLine = { name: string; price: number | null };

function soinsNames(notes: string | undefined): string[] {
  const line = notes?.split("\n").find((item) => item.startsWith("Soins:"));
  if (!line) return [];
  return line
    .slice("Soins:".length)
    .split("+")
    .map((name) => name.trim())
    .filter(Boolean);
}

function buildLines(
  payment: PaymentItem,
  appointment: Appointment | null,
  catalog: { id: string; name: string; price: number }[],
): TicketLine[] {
  const names = soinsNames(appointment?.notes);
  if (names.length > 0) {
    return names.map((name) => {
      const match = catalog.find((service) => service.name === name);
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
      name: payment.serviceName ?? (payment.kind === "REFUND" ? "Remboursement" : "Règlement"),
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
  const [lines, setLines] = useState<TicketLine[]>([
    {
      name: payment.serviceName ?? "Règlement",
      price: Math.abs(signedPaymentAmount(payment)),
    },
  ]);
  const [summary, setSummary] = useState<AppointmentPaymentSummary | null>(remaining);
  const [loading, setLoading] = useState(Boolean(payment.appointmentId));
  const signed = signedPaymentAmount(payment);
  const totalDue = summary?.price ?? null;
  const netPaid = summary?.netPaid ?? null;
  const left = summary?.remaining ?? null;

  useEffect(() => {
    setSummary(remaining);
  }, [remaining]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!payment.appointmentId) {
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
          setLines([
            {
              name: payment.serviceName ?? "Règlement",
              price: Math.abs(signedPaymentAmount(payment)),
            },
          ]);
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

  const linesTotal = lines.reduce((sum, line) => sum + (line.price ?? 0), 0);
  const hasPricedLines = lines.some((line) => line.price != null);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 p-4 print:static print:inset-auto print:bg-transparent print:p-0">
      <div
        className="absolute inset-0 print:hidden"
        role="presentation"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 print:hidden">
          <h2 className="text-[16px] font-bold">Ticket</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white"
            >
              <Printer size={15} />
              Imprimer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6] text-ink/60"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div id="payment-ticket-print" className="space-y-4 p-5 text-ink">
          <div className="text-center">
            <p className="text-[18px] font-extrabold tracking-tight">{orgName || "Institut"}</p>
            <p className="mt-1 text-[12px] uppercase tracking-wider text-ink/45">Ticket de règlement</p>
            <p className="mt-2 text-[13px] font-semibold">{formatPaymentDateTime(payment.paidAt)}</p>
          </div>

          <div className="border-y border-dashed border-ink/20 py-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <span className="text-ink/50">Cliente</span>
              <span className="text-right font-semibold">{payment.customerName ?? "—"}</span>
            </div>
            {payment.customerPhone ? (
              <div className="mt-1 flex justify-between gap-3">
                <span className="text-ink/50">Téléphone</span>
                <span className="text-right">{payment.customerPhone}</span>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-ink/50">Réf.</span>
              <span className="text-right font-mono text-[12px]">{payment.id.slice(-10)}</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink/45">Services</p>
            {loading ? (
              <p className="text-[13px] text-ink/45">Chargement…</p>
            ) : (
              <ul className="space-y-1.5 text-[13px]">
                {lines.map((line, index) => (
                  <li key={`${line.name}-${index}`} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1">{line.name}</span>
                    <span className="shrink-0 font-semibold">
                      {line.price != null ? formatMad(line.price) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5 border-t border-dashed border-ink/20 pt-3 text-[13px]">
            {hasPricedLines && lines.length > 1 ? (
              <div className="flex justify-between gap-3">
                <span className="text-ink/50">Sous-total services</span>
                <span className="font-semibold">{formatMad(linesTotal)}</span>
              </div>
            ) : null}
            {totalDue != null ? (
              <div className="flex justify-between gap-3">
                <span className="text-ink/50">Total prestation</span>
                <span className="font-semibold">{formatMad(totalDue)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-ink/50">
                {PAYMENT_KIND_LABEL[payment.kind]} · {PAYMENT_METHOD_LABEL[payment.method]}
              </span>
              <span className={cn("text-[16px] font-extrabold", signed < 0 && "text-[#BA1A1A]")}>
                {signed < 0 ? "−" : ""}
                {formatMad(Math.abs(signed))}
              </span>
            </div>
            {netPaid != null ? (
              <div className="flex justify-between gap-3">
                <span className="text-ink/50">Déjà encaissé</span>
                <span className="font-semibold">{formatMad(netPaid)}</span>
              </div>
            ) : null}
            {left != null ? (
              <div className="flex justify-between gap-3">
                <span className="text-ink/50">Reste à payer</span>
                <span className="font-semibold">{formatMad(left)}</span>
              </div>
            ) : null}
          </div>

          {payment.userName ? (
            <p className="text-center text-[11px] text-ink/45">Opérateur · {payment.userName}</p>
          ) : null}
          <p className="text-center text-[11px] text-ink/35">Merci de votre visite</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #payment-ticket-print,
          #payment-ticket-print * {
            visibility: visible !important;
          }
          #payment-ticket-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
