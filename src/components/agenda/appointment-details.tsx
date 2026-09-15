"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  MessageCircle,
  Pencil,
  Phone,
  UserX,
  Wallet,
} from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/types/appointment";
import type { CustomerDetail } from "@/types/customer";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_STYLE,
  STATUS_TRANSITIONS,
} from "@/modules/appointments/constants";
import { formatMad } from "@/modules/analytics/service";
import { getCustomer } from "@/modules/customers/service";
import { staffColor } from "@/components/agenda/staff-colors";
import { cn } from "@/lib/utils";
import { DEPOSIT_STATE_LABEL } from "@/types/booking-policy";

type AppointmentDetailsProps = {
  appointment: Appointment;
  onEdit: () => void;
  onStatusChange: (status: AppointmentStatus) => void;
  onCancel: () => void;
};

function durationMin(startAt: string, endAt: string) {
  return Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000));
}

function waDigits(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("212")) return d;
  if (d.startsWith("0") && d.length >= 9) return `212${d.slice(1)}`;
  return d;
}

export function AppointmentDetails({
  appointment,
  onEdit,
  onStatusChange,
  onCancel,
}: AppointmentDetailsProps) {
  const s = APPOINTMENT_STATUS_STYLE[appointment.status];
  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);
  const transitions = STATUS_TRANSITIONS[appointment.status] ?? [];
  const depositState = appointment.depositState ?? "NOT_REQUIRED";
  const awaitingDeposit = depositState === "AWAITING";
  const color = staffColor(appointment.staffId);
  const mins = durationMin(appointment.startAt, appointment.endAt);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCustomer(appointment.customerId, false)
      .then((res) => {
        if (!cancelled) setCustomer(res.customer);
      })
      .catch(() => {
        if (!cancelled) setCustomer(null);
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.customerId]);

  const phone = customer?.phone?.trim() || "";
  const noShows = customer?.noShowCount ?? 0;
  const vip = customer?.segment === "VIP";
  const waHref = phone
    ? `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(
        `Bonjour ${appointment.customerName.split(" ")[0]}, votre rendez-vous ${appointment.serviceName} est prévu le ${start.toLocaleDateString("fr-FR")} à ${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
      )}`
    : "/whatsapp/";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", color.bar)} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
            Fiche rendez-vous
          </span>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", s.bg, s.text)}>
          {APPOINTMENT_STATUS_LABEL[appointment.status]}
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-[#FBF4F6] p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow-sm">
          {(appointment.customerName.trim() || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-lg font-bold text-ink">{appointment.customerName}</h3>
            {vip ? (
              <span className="rounded bg-[#FFF1D6] px-1.5 text-[10px] font-bold text-gold">VIP</span>
            ) : null}
          </div>
          {phone ? (
            <a href={`tel:${phone}`} className="flex items-center gap-1 text-sm text-ink/50 hover:text-primary">
              <Phone size={13} />
              {phone}
            </a>
          ) : (
            <Link href={`/customers/`} className="text-sm text-ink/45">
              Fiche cliente
            </Link>
          )}
        </div>
      </div>

      {noShows >= 2 ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-[#FBF4F6] p-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="text-xs font-bold text-red-600">Risque no-show</p>
            <p className="text-[12px] leading-snug text-ink">
              {noShows} absence{noShows > 1 ? "s" : ""} recensée{noShows > 1 ? "s" : ""} sur cette
              cliente.
              {customer?.noShowRisk === "REQUIRE_DEPOSIT"
                ? " Un acompte est recommandé avant confirmation."
                : ""}
            </p>
          </div>
        </div>
      ) : null}

      {awaitingDeposit ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-medium">Acompte en attente — {DEPOSIT_STATE_LABEL[depositState]}</p>
          <Link
            href={`/cash-register/?appointmentId=${appointment.id}&kind=DEPOSIT`}
            className="mt-1 inline-block font-semibold text-primary underline"
          >
            Enregistrer l&apos;acompte
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg bg-[#FBF4F6]/70 p-3.5 text-sm">
        <Row label="Prestation" value={appointment.serviceName} />
        <Row
          label="Créneau"
          value={`${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} → ${end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} (${mins} min)`}
          mono
        />
        <Row label="Praticienne" value={appointment.staffName} accent />
        <Row label="Espace" value={appointment.resourceName || "—"} />
        <div className="mt-1 flex items-center justify-between rounded-lg bg-white p-2">
          <span className="font-bold text-ink">Total</span>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-primary">{formatMad(appointment.price)}</p>
            <p className="text-[11px] text-ink/45">
              Acompte : {formatMad(appointment.deposit ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {appointment.notes ? <p className="text-sm text-ink/60">{appointment.notes}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        {transitions.includes("COMPLETED") ? (
          <button
            type="button"
            onClick={() => onStatusChange("COMPLETED")}
            className="flex items-center justify-center gap-1 rounded-lg bg-[#FBF4F6] py-2.5 text-sm font-semibold text-ink hover:bg-[#F0DDE9]"
          >
            <CheckCheck size={16} />
            Marquer fait
          </button>
        ) : transitions.includes("ARRIVED") ? (
          <button
            type="button"
            onClick={() => onStatusChange("ARRIVED")}
            className="flex items-center justify-center gap-1 rounded-lg bg-[#FBF4F6] py-2.5 text-sm font-semibold text-ink hover:bg-[#F0DDE9]"
          >
            <CheckCheck size={16} />
            Marquer présente
          </button>
        ) : transitions.includes("IN_PROGRESS") ? (
          <button
            type="button"
            onClick={() => onStatusChange("IN_PROGRESS")}
            className="flex items-center justify-center gap-1 rounded-lg bg-[#FBF4F6] py-2.5 text-sm font-semibold text-ink hover:bg-[#F0DDE9]"
          >
            <CheckCheck size={16} />
            Commencer
          </button>
        ) : (
          <span />
        )}
        <Link
          href={`/cash-register/?appointmentId=${appointment.id}`}
          className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
        >
          <Wallet size={16} />
          Encaisser
        </Link>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center justify-center gap-1 rounded-lg bg-[#FBF4F6] py-2 text-sm font-semibold text-ink/70 hover:text-ink"
        >
          <Pencil size={14} />
          Modifier
        </button>
        {transitions.includes("NO_SHOW") || transitions.includes("CANCELLED") ? (
          <button
            type="button"
            onClick={transitions.includes("NO_SHOW") ? () => onStatusChange("NO_SHOW") : onCancel}
            className="flex items-center justify-center gap-1 rounded-lg bg-[#FBF4F6] py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <UserX size={14} />
            {transitions.includes("NO_SHOW") ? "No-show / Annuler" : "Annuler"}
          </button>
        ) : (
          <span />
        )}
        {transitions.includes("CONFIRMED") ? (
          <button
            type="button"
            disabled={awaitingDeposit}
            onClick={() => onStatusChange("CONFIRMED")}
            className="col-span-2 rounded-lg bg-[#FBF4F6] py-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {awaitingDeposit ? "Confirmer (acompte requis)" : "Confirmer le rendez-vous"}
          </button>
        ) : null}
        {transitions.includes("CANCELLED") && transitions.includes("NO_SHOW") ? (
          <button
            type="button"
            onClick={onCancel}
            className="col-span-2 text-center text-xs text-ink/40 underline"
          >
            Annuler le rendez-vous
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-emerald-50 p-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <MessageCircle size={16} />
            Rappel WhatsApp
          </span>
          <CalendarClock size={14} className="text-emerald-700" />
        </div>
        <p className="text-[12px] leading-relaxed text-ink/70">
          Message prêt à l&apos;envoi avec l&apos;horaire du soin.
        </p>
        <a
          href={waHref}
          target={phone ? "_blank" : undefined}
          rel={phone ? "noreferrer" : undefined}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          {phone ? "Ouvrir WhatsApp" : "Ouvrir le module WhatsApp"}
        </a>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink/45">{label}</span>
      <span className={cn("text-right font-semibold text-ink", mono && "font-mono", accent && "text-gold")}>
        {value}
      </span>
    </div>
  );
}
