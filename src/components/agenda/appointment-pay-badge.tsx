import type { Appointment, AppointmentPaymentState } from "@/types/appointment";
import { formatMad } from "@/modules/analytics/service";
import { cn } from "@/lib/utils";

export function appointmentRemaining(appointment: Appointment): number {
  const due = appointment.amountDue ?? appointment.price;
  const paid = appointment.netPaid ?? 0;
  return Math.max(0, Math.round((due - paid) * 100) / 100);
}

const LABEL: Record<AppointmentPaymentState, string> = {
  paid: "Payé",
  partial: "Partiel",
  unpaid: "Non payé",
};

const TONE: Record<AppointmentPaymentState, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-900",
  unpaid: "bg-[#F3F4F6] text-ink/60",
};

export function AppointmentPayBadge({
  appointment,
  className,
}: {
  appointment: Appointment;
  className?: string;
}) {
  const state = appointment.paymentState;
  if (!state) return null;
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", TONE[state], className)}>
      {LABEL[state]}
    </span>
  );
}

export function appointmentPayDetail(appointment: Appointment): string | null {
  const state = appointment.paymentState;
  if (!state) return null;
  if (state === "paid") return "Payé";
  const remaining = appointmentRemaining(appointment);
  if (state === "partial") {
    return `Partiel · payé ${formatMad(appointment.netPaid ?? 0)} · reste ${formatMad(remaining)}`;
  }
  return `Non payé · reste ${formatMad(remaining)}`;
}
