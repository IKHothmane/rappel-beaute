"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  KeyRound,
  MessageCircle,
  PauseCircle,
  Pencil,
  Sparkles,
  Timer,
  Wallet,
  XCircle,
} from "lucide-react";
import { whatsappHref } from "@/components/customers/customers-helpers";
import {
  commissionRuleLabel,
  currentApprovedLeave,
  formatHireLabel,
  staffInitials,
  statusChipClass,
  todayScheduleLabel,
} from "@/components/staff/staff-helpers";
import { cn } from "@/lib/utils";
import { formatMad as formatCommissionMad, getStaffCommissions } from "@/modules/commissions/service";
import { formatMad } from "@/modules/analytics/service";
import { getStaff } from "@/modules/staff/service";
import type { StaffCommissionSummary } from "@/types/commission";
import type { StaffDetail, StaffListItem, StaffStatus } from "@/types/staff";
import { LEAVE_TYPE_LABEL, STAFF_STATUS_LABEL } from "@/types/staff";

type StaffFocusPanelProps = {
  staffId: string;
  fallback: StaffListItem;
  canWrite: boolean;
  canPerf: boolean;
  canCommissions: boolean;
  financeHidden: boolean;
  isTopSeller: boolean;
  teamRevenue: number;
  insight: string;
  onEdit: () => void;
  onStatus: (status: StaffStatus) => void;
};

export function StaffFocusPanel({
  staffId,
  fallback,
  canWrite,
  canPerf,
  canCommissions,
  financeHidden,
  isTopSeller,
  teamRevenue,
  insight,
  onEdit,
  onStatus,
}: StaffFocusPanelProps) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<StaffDetail | null>(null);
  const [summary, setSummary] = useState<StaffCommissionSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setSummary(null);
    (async () => {
      try {
        const staff = await getStaff(staffId);
        if (cancelled) return;
        setDetail(staff);
        if (canCommissions) {
          try {
            const comm = await getStaffCommissions(staffId);
            if (!cancelled) setSummary(comm);
          } catch {
            if (!cancelled) setSummary(null);
          }
        }
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId, canCommissions]);

  const person = detail ?? fallback;
  const activity = fallback;
  const share =
    canPerf && teamRevenue > 0 && activity.revenue > 0
      ? Math.round((activity.revenue / teamRevenue) * 100)
      : null;
  const hire = formatHireLabel(person.hireDate);
  const leave = detail ? currentApprovedLeave(detail.leaves) : null;
  const enabledServices = detail?.services.filter((s) => s.active) ?? [];
  const disabledServices = detail?.services.filter((s) => !s.active) ?? [];
  const shownEnabled = enabledServices.slice(0, 4);
  const shownDisabled = disabledServices.slice(0, 2);
  const nextStatus: StaffStatus = person.status === "ACTIVE" ? "ON_LEAVE" : "ACTIVE";

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-[#E4BDC2]/30 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFD9DE] text-[15px] font-bold text-primary ring-2 ring-primary/15">
              {staffInitials(person.firstName, person.lastName)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-[18px] font-bold text-ink">{person.displayName}</h3>
              {isTopSeller ? (
                <span className="rounded-full bg-[#FCCA66] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#755400]">
                  Top vendeuse
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", statusChipClass(person.status))}>
                {STAFF_STATUS_LABEL[person.status]}
              </span>
              {person.position ? (
                <span className="text-[12px] font-medium text-primary">{person.position}</span>
              ) : null}
            </div>
          </div>
        </div>
        {canWrite ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              title="Modifier la fiche"
              className="rounded-lg bg-[#FCE9F4] p-2 text-ink/50 hover:text-primary"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onStatus(nextStatus)}
              title={person.status === "ACTIVE" ? "Mettre en congé" : "Réactiver"}
              className="rounded-lg bg-[#FCE9F4] p-2 text-ink/50 hover:text-amber-700"
            >
              <PauseCircle size={16} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Link
          href="/planning/"
          className="flex flex-col items-center gap-1 rounded-lg bg-[#FCE9F4] px-2 py-2 text-center text-ink"
        >
          <CalendarDays size={16} className="text-primary" />
          <span className="text-[11px] font-semibold">Planning</span>
        </Link>
        <Link
          href={`/staff/${staffId}/`}
          className="flex flex-col items-center gap-1 rounded-lg bg-[#FCE9F4] px-2 py-2 text-center text-ink"
        >
          <Timer size={16} className="text-[#7B5900]" />
          <span className="text-[11px] font-semibold">Fiche</span>
        </Link>
        <Link
          href={`/staff/${staffId}/`}
          className="flex flex-col items-center gap-1 rounded-lg bg-[#FCE9F4] px-2 py-2 text-center text-ink"
        >
          <KeyRound size={16} className="text-ink/45" />
          <span className="text-[11px] font-semibold">Accès</span>
        </Link>
        {person.phone ? (
          <a
            href={whatsappHref(person.phone, person.firstName)}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-lg bg-[#FCE9F4] px-2 py-2 text-center text-ink"
          >
            <MessageCircle size={16} className="text-[#B61149]" />
            <span className="text-[11px] font-semibold">Message</span>
          </a>
        ) : (
          <span className="flex flex-col items-center gap-1 rounded-lg bg-[#FCE9F4] px-2 py-2 text-center text-ink/35">
            <MessageCircle size={16} />
            <span className="text-[11px] font-semibold">Message</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-[#FFEFF8] p-3">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink/40">
          <span>Contrat & identité</span>
          <span className="font-bold text-[#7B5900]">{STAFF_STATUS_LABEL[person.status]}</span>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-[12px]">
          <div className="min-w-0">
            <span className="text-ink/45">E-mail</span>
            <p className="truncate font-medium text-ink">{person.email || "—"}</p>
          </div>
          <div>
            <span className="text-ink/45">Téléphone</span>
            <p className="font-medium text-ink">{person.phone || "—"}</p>
          </div>
          <div>
            <span className="text-ink/45">Embauche</span>
            <p className="font-medium text-ink">{hire ?? "Non renseignée"}</p>
          </div>
          <div>
            <span className="text-ink/45">Rémunération</span>
            <p className="font-medium text-ink">
              {canCommissions && detail ? commissionRuleLabel(detail.commissions) : canCommissions ? "…" : "Accès limité"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
            Habilitations
          </h4>
          <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-semibold text-[#7B5900]">
            {loading ? "…" : `${enabledServices.length} soin${enabledServices.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <p className="text-[12px] text-ink/50">
          Seuls les soins actifs sont proposés dans l’agenda pour cette praticienne.
        </p>
        {loading ? (
          <p className="text-[12px] text-ink/40">Chargement des prestations…</p>
        ) : shownEnabled.length === 0 && shownDisabled.length === 0 ? (
          <p className="text-[12px] text-ink/45">Aucune habilitation renseignée.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {shownEnabled.map((s) => (
              <div
                key={s.serviceId}
                className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2 text-[13px]"
              >
                <span className="flex items-center gap-2 font-medium text-ink">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  {s.serviceName}
                </span>
                <span className="text-[12px] font-semibold text-emerald-700">Habilitée</span>
              </div>
            ))}
            {shownDisabled.map((s) => (
              <div
                key={s.serviceId}
                className="flex items-center justify-between rounded-lg bg-[#F6E3EF]/50 p-2 text-[13px] opacity-70"
              >
                <span className="flex items-center gap-2 text-ink">
                  <XCircle size={16} className="text-ink/40" />
                  {s.serviceName}
                </span>
                <span className="text-[12px] text-ink/45">Inactive</span>
              </div>
            ))}
            {enabledServices.length > shownEnabled.length ? (
              <Link href={`/staff/${staffId}/`} className="text-[11px] font-semibold text-primary">
                +{enabledServices.length - shownEnabled.length} autres — voir la fiche
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-[#FFEFF8] p-3">
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
          <Timer size={14} className="text-[#7B5900]" />
          Présence & planning du jour
        </span>
        <div className="rounded-lg bg-white p-2.5">
          <p className="text-[10px] uppercase text-ink/40">Horaires prévus</p>
          <p className="text-[16px] font-bold text-ink">
            {detail ? todayScheduleLabel(detail.schedules) : "…"}
          </p>
        </div>
        {leave ? (
          <p className="text-[11px] text-amber-800">
            Congé en cours · {LEAVE_TYPE_LABEL[leave.type]} jusqu’au{" "}
            {new Date(leave.endAt).toLocaleDateString("fr-FR")}
          </p>
        ) : (
          <p className="text-[11px] text-ink/50">
            Le pointage biométrique n’est pas disponible — le planning agenda fait foi.
          </p>
        )}
      </div>

      {canCommissions ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
              <Wallet size={16} className="text-[#7B5900]" />
              Commissions {summary ? `(${summary.periodLabel})` : ""}
            </h4>
            <Link href={`/staff/${staffId}/`} className="text-[11px] font-semibold text-primary hover:underline">
              Détail
            </Link>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-[#F6E3EF]/60 p-3">
            {loading && !summary ? (
              <p className="text-[12px] text-ink/40">Chargement…</p>
            ) : summary ? (
              <>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink/50">CA prestations</span>
                  <span className="font-bold text-ink">{formatCommissionMad(summary.baseTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink/50">Prestations</span>
                  <span className="font-bold text-ink">{summary.count}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#E4BDC2]/30 pt-1.5 text-[13px]">
                  <span className="font-medium text-ink">Commission nette</span>
                  <span className="text-[15px] font-bold text-primary">{formatCommissionMad(summary.netTotal)}</span>
                </div>
              </>
            ) : (
              <p className="text-[12px] text-ink/45">Aucune commission figée ce mois.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="relative flex flex-col gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#FCCA66]/25 via-[#FCE9F4] to-[#FFD9DE]/40 p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Sparkles size={14} />
          Insight équipe
        </div>
        <p className="text-[12px] leading-relaxed text-ink">{insight}</p>
        <Link
          href="/planning/"
          className="mt-1 inline-flex items-center gap-1.5 self-start rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm"
        >
          <CalendarDays size={14} className="text-[#7B5900]" />
          Ouvrir le planning
        </Link>
      </div>

      <div className="flex items-center justify-between border-t border-[#E4BDC2]/30 pt-2 text-[11px] text-ink/45">
        <span>
          {canPerf && !financeHidden
            ? `${activity.appointmentCount} RDV · ${formatMad(activity.revenue)}${share != null ? ` · ${share} % du CA équipe` : ""}`
            : `${activity.appointmentCount} RDV ce mois`}
        </span>
        <Link href={`/staff/${staffId}/`} className="font-medium text-primary hover:underline">
          Fiche complète
        </Link>
      </div>
    </div>
  );
}
