"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  Users,
} from "lucide-react";
import {
  type CancelledSlot,
  type WaitingKpis,
  type WaitingRow,
  type WaitingTab,
  formatCountdown,
  formatWaitDate,
  formatWaitMad,
  staffShort,
  tenureLabel,
  timeWindowLabel,
  vipLabel,
  waitlistWhatsappHref,
  waitlistWhatsappPreview,
} from "@/components/waiting-list/waiting-list-helpers";
import { cn } from "@/lib/utils";

type Props = {
  orgName: string;
  roleLabel: string;
  kpis: WaitingKpis;
  mix: { label: string; pct: number }[];
  saturday: { count: number; revenue: number; staffName: string | null } | null;
  slot: CancelledSlot | null;
  opportunity: WaitingRow | null;
  nextMatch: WaitingRow | null;
  alertDismissed: boolean;
  onDismissAlert: () => void;
  search: string;
  onSearch: (v: string) => void;
  tab: WaitingTab;
  onTab: (t: WaitingTab) => void;
  counts: Record<WaitingTab, number>;
  loading: boolean;
  rows: WaitingRow[];
  selected: WaitingRow | null;
  onSelect: (id: string) => void;
  canWrite: boolean;
  onAdd: () => void;
  onSettings: () => void;
  onWhatsApp: (row: WaitingRow) => void;
  onHold: (row: WaitingRow) => void;
  onConfirm: (row: WaitingRow) => void;
  holdUntil: number | null;
  holdEntryId: string | null;
};

const TABS: { id: WaitingTab; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "high", label: "Haute priorité" },
  { id: "today", label: "Aujourd’hui" },
  { id: "match", label: "Avec match" },
  { id: "booked", label: "Converties" },
];

export function WaitingListMobile({
  orgName,
  roleLabel,
  kpis,
  mix,
  saturday,
  slot,
  opportunity,
  nextMatch,
  alertDismissed,
  onDismissAlert,
  search,
  onSearch,
  tab,
  onTab,
  counts,
  loading,
  rows,
  selected,
  onSelect,
  canWrite,
  onAdd,
  onSettings,
  onWhatsApp,
  onHold,
  onConfirm,
  holdUntil,
  holdEntryId,
}: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const holdLeft = holdUntil ? holdUntil - now : 0;

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FCCA66] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#755400]">
            <Shield size={13} />
            {roleLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD9DE] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Sparkles size={13} />
            Matching actif
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[11px] font-semibold text-ink/55">
            <MapPin size={13} className="text-[#7B5900]" />
            {orgName}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-9 tracking-tight">Liste d’attente</h1>
            <p className="mt-0.5 text-[13px] text-ink/55">
              Remplissage des annulations agenda, sans réservation automatique.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
            {kpis.waiting} cliente{kpis.waiting > 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={onAdd}
              className="col-span-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-bold text-white shadow-sm"
            >
              <Plus size={18} />
              Ajouter à la liste d’attente
            </button>
          ) : (
            <div className="col-span-4" />
          )}
          <button
            type="button"
            aria-label="Paramètres matching"
            onClick={onSettings}
            className="flex h-12 items-center justify-center rounded-xl bg-[#FCE9F4] text-ink/60"
          >
            <SlidersHorizontal size={20} className="text-primary" />
          </button>
        </div>
      </section>

      {!alertDismissed && opportunity && (slot || opportunity.hasMatch) ? (
        <section className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-[#FCCA66] to-primary" />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              Alerte opportunité
            </span>
            {slot ? (
              <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[11px] text-ink/50">
                Créneau libéré
              </span>
            ) : null}
          </div>
          <div className="mt-3 rounded-xl bg-[#FFEFF8] p-3">
            <p className="text-[14px] font-bold">
              {slot
                ? `Slot libéré à ${new Date(slot.startAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                : opportunity.matchSlotLabel ?? "Correspondance détectée"}
            </p>
            <p className="text-[13px] text-ink/55">
              {slot?.serviceName ?? opportunity.serviceName}
              {slot ? ` · ${slot.staffName}` : opportunity.staffName ? ` · ${opportunity.staffName}` : ""}
            </p>
            <p className="mt-2 rounded-lg bg-white/80 p-2 text-[13px] leading-snug">
              <span className="font-bold text-primary">
                Score {opportunity.matchScore}% :{" "}
              </span>
              {opportunity.customerName}
              {vipLabel(opportunity.customerSegment) ? ` (${vipLabel(opportunity.customerSegment)})` : ""}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={waitlistWhatsappHref(
                opportunity,
                orgName,
                slot ? new Date(slot.startAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null,
              )}
              target="_blank"
              rel="noreferrer"
              onClick={() => onWhatsApp(opportunity)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#10B981] text-[13px] font-bold text-white"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
            {canWrite ? (
              <button
                type="button"
                onClick={() => onHold(opportunity)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-[13px] font-bold text-white"
              >
                <CalendarClock size={16} />
                Bloquer (10 min)
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismissAlert}
            className="mt-2 flex w-full items-center justify-center gap-1 py-1 text-[12px] text-ink/45"
          >
            Ignorer
            {nextMatch ? ` (suivante : ${nextMatch.firstName} ${nextMatch.matchScore}%)` : ""}
            <ChevronRight size={14} />
          </button>
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-2">
        <MobileKpi label="Attente" value={`${kpis.waiting}`} hint={kpis.addedToday ? `+${kpis.addedToday} ajd` : "Actives"} icon={<Users size={14} className="text-primary" />} accent={kpis.addedToday > 0} />
        <MobileKpi label="Prioritaires" value={`${kpis.highPriority}`} hint="< 48h" icon={<Flame size={14} className="text-primary" />} />
        <MobileKpi label="Aujourd’hui" value={`${kpis.todayReady}`} hint="Prêtes" icon={<CalendarCheck size={14} className="text-[#7B5900]" />} />
        <MobileKpi label="Matchs" value={`${kpis.matches}`} hint="Créneaux" icon={<Target size={14} className="text-primary" />} />
        <MobileKpi label="Sauvés" value={`${kpis.bookedMonth}`} hint={kpis.bookedMonthRevenue ? formatWaitMad(kpis.bookedMonthRevenue) : "Ce mois"} icon={<CheckCircle2 size={14} className="text-emerald-600" />} />
        <MobileKpi label="Rotation" value={kpis.avgWaitDays == null ? "—" : `${String(kpis.avgWaitDays).replace(".", ",")} j`} hint="Délai moy." icon={<Timer size={14} className="text-ink/40" />} />
      </section>

      <section className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher cliente, soin, praticienne…"
            className="h-11 w-full rounded-xl bg-white pl-11 pr-3 text-[13px] shadow-sm outline-none"
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold shadow-sm",
                tab === t.id ? "bg-primary text-white" : "bg-white text-ink",
              )}
            >
              {t.label} ({counts[t.id]})
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold">Demandes</h2>
          <span className="text-[12px] font-bold text-primary">Tri par score</span>
        </div>
        {loading ? (
          <p className="rounded-2xl bg-white p-5 text-[13px] text-ink/45 shadow-sm">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-[13px] text-ink/50 shadow-sm">
            Aucune cliente sur ce filtre.
          </p>
        ) : (
          rows.map((row) => {
            const vip = vipLabel(row.customerSegment);
            const holding = holdEntryId === row.id && holdLeft > 0;
            return (
              <article
                key={row.id}
                className={cn(
                  "space-y-3 rounded-2xl bg-white p-4 shadow-sm",
                  selected?.id === row.id && "ring-1 ring-primary/30",
                )}
                onClick={() => onSelect(row.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD9DE] text-[13px] font-bold text-primary">
                        {row.initials}
                      </div>
                      {vip === "VIP" ? (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FCCA66] text-[10px] font-bold text-[#261900]">
                          ★
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[16px] font-bold">{row.customerName}</h3>
                        {vip ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-bold",
                              vip === "VIP" ? "bg-[#FCCA66] text-[#755400]" : "bg-[#FCE9F4] text-ink/55",
                            )}
                          >
                            {vip}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[13px] text-ink/50">
                        {row.hasMatch ? (
                          <>
                            Match <strong className="text-primary">{row.matchScore}%</strong>
                          </>
                        ) : (
                          tenureLabel(row.customerCreatedAt) ?? row.customerPhone
                        )}
                      </p>
                    </div>
                  </div>
                  {row.hasMatch ? (
                    <span className="shrink-0 rounded-lg bg-primary px-2 py-1 text-[11px] font-bold text-white">
                      Slot prêt
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md bg-[#FCE9F4] px-2 py-1 text-[11px] text-ink/50">
                      {row.priority === "high" ? "Urgent" : "Attente"}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 rounded-xl bg-[#FFEFF8] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-bold">{row.serviceName}</span>
                    <span className="text-[14px] font-bold text-primary">
                      {formatWaitMad(row.servicePrice)}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink/55">
                    {staffShort(row.staffName)}
                    {row.serviceDurationMin ? ` · ${row.serviceDurationMin} min` : ""}
                  </p>
                  {holding ? (
                    <p className="flex items-center gap-1 text-[12px] font-bold text-primary">
                      <Timer size={14} />
                      Réservation temporaire : {formatCountdown(holdLeft)}
                    </p>
                  ) : row.matchSlotLabel ? (
                    <p className="text-[12px] font-bold text-[#7B5900]">
                      Match : {row.matchSlotLabel}
                    </p>
                  ) : (
                    <p className="text-[12px] text-ink/45">
                      {preferredBits(row)}
                    </p>
                  )}
                </div>

                {row.hasMatch ? (
                  <p className="rounded-lg bg-[#FCE9F4] p-2.5 text-[13px] italic text-ink/55">
                    “{waitlistWhatsappPreview(row, orgName).slice(0, 90)}…”
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={waitlistWhatsappHref(row, orgName)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhatsApp(row);
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#10B981] text-[13px] font-bold text-white"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                  {canWrite && (row.status === "WAITING" || row.status === "NOTIFIED") ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirm(row);
                      }}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-[13px] font-bold text-white"
                    >
                      <CheckCircle2 size={16} />
                      Confirmer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(row.id);
                      }}
                      className="flex h-10 items-center justify-center gap-1 rounded-xl bg-[#F6E3EF] text-[13px] font-bold text-ink/60"
                    >
                      Fiche
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-ink p-4 text-[#FEECF7] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C79A3B]/20 text-[#FFDEA4]">
              <Brain size={16} />
            </div>
            <span className="text-[13px] font-bold">Copilote · remplissage</span>
          </div>
          <span className="rounded-full bg-[#7B5900] px-2 py-0.5 text-[11px] font-bold text-white">Live</span>
        </div>
        <div className="mt-3 rounded-xl bg-white/5 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
            CA récupéré ce mois
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-white">
              {formatWaitMad(kpis.bookedMonthRevenue)}
            </span>
            <span className="text-[12px] font-semibold text-emerald-400">
              {kpis.bookedMonth} RDV convertis
            </span>
          </div>
          {mix.length ? (
            <>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
                {mix.map((s, i) => (
                  <div
                    key={s.label}
                    className={cn(
                      "h-full",
                      i === 0 ? "bg-primary" : i === 1 ? "bg-[#FFDEA4]" : i === 2 ? "bg-emerald-500" : "bg-[#F0DDE9]",
                    )}
                    style={{ width: `${Math.max(s.pct, 4)}%` }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-white/70">
                {mix.map((s) => (
                  <span key={s.label} className="truncate px-0.5">
                    {s.label.split(" ")[0]} {s.pct}%
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
        {saturday ? (
          <div className="mt-3 rounded-xl bg-[#C79A3B]/10 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-[#FFDEA4]" />
              <p className="text-[13px] leading-relaxed text-white/90">
                <strong className="text-[#FFDEA4]">{saturday.count} clientes</strong> attendent un samedi
                {saturday.staffName ? ` avec ${saturday.staffName.split(" ")[0]}` : ""}. Gain potentiel{" "}
                <strong className="text-[#FFDEA4]">{formatWaitMad(saturday.revenue)}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-white/70">
            Les scores sont calculés sur la date souhaitée, la praticienne et les créneaux annulés du jour.
          </p>
        )}
      </section>

      <footer className="space-y-2 pb-2 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#FCE9F4] px-3 py-1 text-[11px] text-ink/50">
          <Lock size={13} className="text-[#7B5900]" />
          Isolation par institut · CNDP 09-08
        </div>
      </footer>
    </div>
  );
}

function preferredBits(row: WaitingRow) {
  return `Dispo : ${formatWaitDate(row.preferredDate)} · ${timeWindowLabel(row.preferredTimeFrom, row.preferredTimeTo)}`;
}

function MobileKpi({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px]">{label}</span>
        {icon}
      </div>
      <div className="mt-1">
        <div className="text-[18px] font-bold">{value}</div>
        <div className={cn("text-[11px]", accent ? "font-semibold text-primary" : "text-ink/45")}>{hint}</div>
      </div>
    </div>
  );
}

