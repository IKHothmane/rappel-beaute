"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Brain,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Target,
  Timer,
  Users,
  X,
  Zap,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type CancelledSlot,
  type WaitingPriority,
  type WaitingRow,
  type WaitingTab,
  HOLD_MS,
  TIME_WINDOWS,
  WAITING_PAGE_SIZE,
  WEEKDAYS,
  bestOpportunity,
  buildAppointmentTimes,
  demandMix,
  enrichWaitingRows,
  exportWaitingCsv,
  filterWaitingRows,
  findCancelledSlot,
  formatCountdown,
  formatRelativeAdded,
  formatSlotClock,
  formatWaitDate,
  formatWaitMad,
  hhmm,
  nextBest,
  nextDateForWeekdays,
  priorityChip,
  saturdayOpportunity,
  slotToLocalParts,
  staffShort,
  statusChip,
  tabCounts,
  tenureLabel,
  timeWindowLabel,
  vipLabel,
  waitingKpis,
  waitlistWhatsappHref,
  waitlistWhatsappPreview,
} from "@/components/waiting-list/waiting-list-helpers";
import { WaitingListMobile } from "@/components/waiting-list/waiting-list-mobile";
import { createAppointment, listAppointments } from "@/modules/appointments/service";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteFeatureLimited } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listCustomers } from "@/modules/customers/service";
import { listServices } from "@/modules/services/service";
import { listStaff } from "@/modules/staff/service";
import {
  createWaitingList,
  listWaitingList,
  updateWaitingListEntryStatus,
} from "@/modules/waiting-list/service";
import type { CustomerListItem } from "@/types/customer";
import type { ServiceListItem } from "@/types/service";
import type { WaitingListEntry } from "@/types/waiting-list";

export function WaitingListPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "agenda");
  const canAgenda = canAccessNav(user.role, "agenda");
  const canWhatsapp = canAccessNav(user.role, "whatsapp");

  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<WaitingListEntry[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [staffOpts, setStaffOpts] = useState<{ id: string; name: string }[]>([]);
  const [slot, setSlot] = useState<CancelledSlot | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<WaitingTab>("all");
  const [serviceFilter, setServiceFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<WaitingPriority | "">("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [holdUntil, setHoldUntil] = useState<number | null>(null);
  const [holdEntryId, setHoldEntryId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 6]);
  const [windowId, setWindowId] = useState<(typeof TIME_WINDOWS)[number]["id"]>("afternoon");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [list, apts] = await Promise.all([
        listWaitingList(),
        listAppointments().catch(() => []),
      ]);
      setRaw(list.items);
      setSlot(findCancelledSlot(apts));
    } catch {
      toast("Impossible de charger la liste d’attente.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listCustomers({ page: 1, limit: 200 })
      .then((r) => setCustomers(r.data))
      .catch(() => undefined);
    listServices({ page: 1, limit: 100, active: true })
      .then((r) => setServices(r.data))
      .catch(() => undefined);
    listStaff({ limit: 100, status: "ACTIVE" })
      .then((r) =>
        setStaffOpts(
          r.data.map((s) => ({
            id: s.id,
            name: s.displayName ?? `${s.firstName} ${s.lastName}`,
          })),
        ),
      )
      .catch(() => undefined);
  }, []);

  const rowsAll = useMemo(
    () => enrichWaitingRows(raw, customers, services, slot),
    [raw, customers, services, slot],
  );
  const filtered = useMemo(
    () => filterWaitingRows(rowsAll, tab, search, serviceFilter, staffFilter, priorityFilter),
    [rowsAll, tab, search, serviceFilter, staffFilter, priorityFilter],
  );
  const kpis = useMemo(() => waitingKpis(rowsAll), [rowsAll]);
  const counts = useMemo(() => tabCounts(rowsAll), [rowsAll]);
  const mix = useMemo(() => demandMix(rowsAll), [rowsAll]);
  const saturday = useMemo(() => saturdayOpportunity(rowsAll), [rowsAll]);
  const opportunity = useMemo(() => bestOpportunity(rowsAll, slot), [rowsAll, slot]);
  const nextMatch = useMemo(
    () => (opportunity ? nextBest(rowsAll, opportunity.id) : null),
    [rowsAll, opportunity],
  );

  useEffect(() => {
    setPage(1);
  }, [tab, search, serviceFilter, staffFilter, priorityFilter]);

  useEffect(() => {
    if (selectedId && !filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    } else if (!selectedId && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / WAITING_PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * WAITING_PAGE_SIZE, pageSafe * WAITING_PAGE_SIZE);
  const selected = (selectedId ? rowsAll.find((r) => r.id === selectedId) : null) ?? pageRows[0] ?? null;
  const holdLeft = holdUntil && holdEntryId === selected?.id ? holdUntil - now : 0;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !serviceId) return;
    const win = TIME_WINDOWS.find((w) => w.id === windowId);
    setSubmitting(true);
    try {
      await createWaitingList({
        customerId,
        serviceId,
        staffId: staffId || null,
        preferredDate: nextDateForWeekdays(days),
        preferredTimeFrom: win?.from || null,
        preferredTimeTo: win?.to || null,
        notes: notes.trim() || null,
      });
      toast("Cliente ajoutée à la liste d’attente.", "success");
      setAddOpen(false);
      setCustomerId("");
      setNotes("");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: WaitingListEntry["status"]) {
    try {
      await updateWaitingListEntryStatus(id, status);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  function onWhatsApp(row: WaitingRow) {
    if (row.status === "WAITING") {
      void setStatus(row.id, "NOTIFIED");
    }
  }

  function onHold(row: WaitingRow) {
    setHoldEntryId(row.id);
    setHoldUntil(Date.now() + HOLD_MS);
    setSelectedId(row.id);
    if (row.status === "WAITING") void setStatus(row.id, "NOTIFIED");
    toast("Créneau bloqué 10 minutes — confirmez le RDV ou contactez la cliente.", "success");
  }

  async function onConfirm(row: WaitingRow) {
    const staff = row.staffId || slot?.staffId || "";
    if (!staff) {
      toast("Choisissez une praticienne avant de confirmer le rendez-vous.", "error");
      return;
    }
    const svc = services.find((s) => s.id === row.serviceId);
    let date = row.preferredDate;
    let time = hhmm(row.preferredTimeFrom) || "10:00";
    if (slot && slot.serviceId === row.serviceId) {
      const parts = slotToLocalParts(slot.startAt);
      date = parts.date;
      time = parts.time;
    }
    setSubmitting(true);
    try {
      const times = buildAppointmentTimes(date, time, svc?.durationMin ?? 60);
      const created = await createAppointment({
        customerId: row.customerId,
        serviceId: row.serviceId,
        staffId: staff,
        startAt: times.startAt,
        endAt: times.endAt,
        price: svc?.price ?? slot?.price ?? 0,
        notes: row.notes ?? undefined,
        source: "WHATSAPP",
      });
      if (!created.ok) {
        toast(created.error, "error");
        return;
      }
      await updateWaitingListEntryStatus(row.id, "BOOKED");
      toast("Rendez-vous inscrit à l’agenda.", "success");
      setHoldUntil(null);
      setHoldEntryId(null);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const slotTime = slot ? formatSlotClock(slot.startAt) : null;

  const shared = {
    orgName: user.orgName,
    roleLabel: ROLE_LABEL[user.role],
    kpis,
    mix,
    saturday,
    slot,
    opportunity,
    nextMatch,
    alertDismissed,
    onDismissAlert: () => setAlertDismissed(true),
    search: searchInput,
    onSearch: setSearchInput,
    tab,
    onTab: setTab,
    counts,
    loading,
    rows: filtered,
    selected,
    onSelect: setSelectedId,
    canWrite,
    onAdd: () => setAddOpen(true),
    onSettings: () => setSettingsOpen(true),
    onWhatsApp,
    onHold,
    onConfirm,
    holdUntil,
    holdEntryId,
  };

  return (
    <>
      <WaitingListMobile {...shared} />

      <div className="hidden space-y-5 lg:block">
        <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <nav className="flex items-center gap-1 text-[13px] text-ink/45">
              <span>Opérations</span>
              <ChevronRight size={14} />
              <span className="font-semibold text-primary">Liste d’attente intelligente</span>
            </nav>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-semibold leading-9 tracking-tight">
                Liste d’attente intelligente
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink">
                <Lock size={12} className="text-[#7B5900]" />
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Matching actif
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#261900]">
                <MapPin size={12} />
                {user.orgName}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
              Comblement des annulations agenda en temps réel — proposition WhatsApp, jamais de
              réservation automatique.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canWrite ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-primary px-5 text-[14px] font-semibold text-white shadow-sm"
              >
                <Plus size={18} />
                Ajouter à la liste d’attente
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-[#FFEFF8] px-4 text-[14px] font-semibold"
            >
              <SlidersHorizontal size={18} className="text-ink/45" />
              Paramètres matching
            </button>
            <button
              type="button"
              onClick={() => exportWaitingCsv(filtered)}
              className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
            >
              <Download size={18} className="text-[#7B5900]" />
              Exporter
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="En attente active"
            value={`${kpis.waiting}`}
            hint={kpis.addedToday ? `+${kpis.addedToday} aujourd’hui` : "File courante"}
            icon={<Users size={18} className="text-primary" />}
            accent={kpis.addedToday > 0}
          />
          <Kpi
            label="Prioritaires"
            value={`${kpis.highPriority}`}
            hint="Demande sous 48h"
            icon={<Flame size={18} className="text-primary" />}
          />
          <Kpi
            label="Dispo aujourd’hui"
            value={`${kpis.todayReady}`}
            hint="Créneaux compatibles"
            icon={<CalendarCheck size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Matchs détectés"
            value={`${kpis.matches}`}
            hint="Slots ou dates proches"
            icon={<Target size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Converties ce mois"
            value={`${kpis.bookedMonth} RDV`}
            hint={kpis.bookedMonthRevenue ? formatWaitMad(kpis.bookedMonthRevenue) : "CA sauvé"}
            icon={<CheckCircle2 size={18} className="text-primary" />}
          />
          <Kpi
            label="Délai moyen"
            value={kpis.avgWaitDays == null ? "—" : `${String(kpis.avgWaitDays).replace(".", ",")} j`}
            hint="Rotation de la file"
            icon={<Timer size={18} className="text-ink/40" />}
          />
        </section>

        {!alertDismissed && opportunity && (slot || opportunity.hasMatch) ? (
          <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FCE9F4] to-[#FFEFF8] p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                  <Zap size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#F0DDE9] px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-primary">
                      Alerte opportunité
                    </span>
                    {slot ? (
                      <span className="text-[12px] text-ink/50">Créneau agenda libéré aujourd’hui</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[18px] font-semibold">
                    {slot
                      ? `Slot libéré à ${slotTime} — ${slot.serviceName} (${slot.staffName})`
                      : `${opportunity.serviceName} · ${opportunity.matchSlotLabel ?? opportunity.preferredDate}`}
                  </p>
                  <p className="mt-0.5 text-[15px] text-ink/55">
                    Correspondance <strong className="text-ink">{opportunity.matchScore}%</strong> :{" "}
                    <span className="font-semibold text-primary">{opportunity.customerName}</span>
                    {vipLabel(opportunity.customerSegment)
                      ? ` (${vipLabel(opportunity.customerSegment)})`
                      : ""}
                    {opportunity.staffName ? ` · ${opportunity.staffName}` : ""}.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <a
                  href={waitlistWhatsappHref(opportunity, user.orgName, slotTime)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onWhatsApp(opportunity)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
                >
                  <MessageCircle size={18} className="text-[#7B5900]" />
                  Contacter WhatsApp
                </a>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => onHold(opportunity)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-white shadow-sm"
                  >
                    <CalendarPlus size={18} />
                    Bloquer & réserver (10 min)
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setAlertDismissed(true)}
                  className="h-11 rounded-lg px-3 text-[14px] font-semibold text-ink/50 hover:bg-white/60"
                >
                  Ignorer
                  {nextMatch ? ` (suivante : ${nextMatch.firstName} ${nextMatch.matchScore}%)` : ""}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <div className="flex flex-col gap-4 xl:col-span-8">
            <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ["all", "Toutes"],
                      ["high", "Haute priorité"],
                      ["today", "Aujourd’hui"],
                      ["match", "Avec match"],
                      ["booked", "Converties"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-semibold",
                        tab === id ? "bg-primary text-white shadow-sm" : "bg-[#FFEFF8] text-ink/70 hover:bg-[#FCE9F4]",
                      )}
                    >
                      {label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                          tab === id ? "bg-white/20 text-white" : "bg-white text-ink/55",
                        )}
                      >
                        {counts[id]}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[12px] text-ink/45">
                  Tri : <strong className="text-ink">Score matching ↓</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                <div className="relative md:col-span-5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Rechercher cliente, service, tél…"
                    className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-10 pr-3 text-[13px] outline-none ring-primary/30 focus:bg-white focus:ring-2"
                  />
                </div>
                <div className="md:col-span-3">
                  <Select
                    className="h-11"
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                  >
                    <option value="">Tous les services</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Select
                    className="h-11"
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                  >
                    <option value="">Praticienne</option>
                    {staffOpts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Select
                    className="h-11"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as WaitingPriority | "")}
                  >
                    <option value="">Priorité</option>
                    <option value="high">Haute (48h)</option>
                    <option value="medium">Moyenne</option>
                    <option value="normal">Normale</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead>
                    <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                      <th className="px-4 py-3">Cliente & profil</th>
                      <th className="px-4 py-3">Prestation</th>
                      <th className="px-4 py-3">Disponibilités</th>
                      <th className="px-4 py-3">Praticienne</th>
                      <th className="px-4 py-3">Matching</th>
                      <th className="px-4 py-3">Priorité</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FCE9F4] text-[13px]">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-ink/45">
                          Chargement…
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-ink/50">
                          Aucune entrée sur ce filtre.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row) => {
                        const vip = vipLabel(row.customerSegment);
                        const prio = priorityChip(row.priority);
                        const st = statusChip(row.status);
                        const selectedRow = selected?.id === row.id;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedId(row.id)}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-[#FFEFF8]/70",
                              selectedRow && "bg-[#FFEFF8]/80",
                            )}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="relative">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD9DE] text-[12px] font-bold text-primary">
                                    {row.initials}
                                  </div>
                                  {vip === "VIP" ? (
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#7B5900] text-[8px] text-white">
                                      ★
                                    </span>
                                  ) : null}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1 font-semibold">
                                    {row.customerName}
                                    {vip ? (
                                      <span className="rounded bg-[#FFDEA4] px-1.5 text-[10px] font-bold text-[#261900]">
                                        {vip}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-[12px] text-ink/45">{row.customerPhone}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold">{row.serviceName}</div>
                              <div className="text-[12px] text-ink/45">
                                {row.serviceDurationMin ? `${row.serviceDurationMin} min · ` : ""}
                                <span className="font-bold text-primary">
                                  {formatWaitMad(row.servicePrice)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="rounded bg-[#FCE9F4] px-1.5 py-0.5 text-[11px] font-semibold">
                                {formatWaitDate(row.preferredDate)}
                              </span>
                              <div className="pt-0.5 text-[12px] text-ink/45">
                                {timeWindowLabel(row.preferredTimeFrom, row.preferredTimeTo)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="rounded bg-[#FCE9F4] px-2 py-1 text-[12px] font-semibold">
                                {staffShort(row.staffName)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {row.hasMatch ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[12px] font-bold text-primary">
                                  <Zap size={14} />
                                  {row.matchScore}%{row.matchSlotLabel ? ` · ${row.matchSlotLabel}` : ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[12px] text-ink/40">
                                  <Timer size={14} />
                                  En attente créneau
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", prio.className)}>
                                {prio.label}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn("inline-flex items-center gap-1 text-[12px]", st.className)}>
                                {row.status === "NOTIFIED" ? (
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                                ) : null}
                                {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="relative flex items-center justify-end gap-0.5">
                                <a
                                  href={waitlistWhatsappHref(row, user.orgName)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="WhatsApp"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onWhatsApp(row);
                                  }}
                                  className="rounded p-1 text-[#7B5900] hover:bg-[#FFEFF8]"
                                >
                                  <MessageCircle size={18} />
                                </a>
                                {canWrite && (row.status === "WAITING" || row.status === "NOTIFIED") ? (
                                  <button
                                    type="button"
                                    title="Valider RDV"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void onConfirm(row);
                                    }}
                                    className="rounded p-1 text-primary hover:bg-[#FFEFF8]"
                                  >
                                    <CheckCircle2 size={18} />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  title="Plus"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuId(menuId === row.id ? null : row.id);
                                  }}
                                  className="rounded p-1 text-ink/35 hover:bg-[#FFEFF8]"
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {menuId === row.id ? (
                                  <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg bg-white p-1 text-left shadow-lg">
                                    {canWrite && (row.status === "WAITING" || row.status === "NOTIFIED") ? (
                                      <button
                                        type="button"
                                        className="block w-full rounded px-3 py-1.5 text-left text-[12px] hover:bg-[#FFEFF8]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMenuId(null);
                                          void setStatus(row.id, "CANCELLED");
                                        }}
                                      >
                                        Retirer de la liste
                                      </button>
                                    ) : null}
                                    {canWrite && (row.status === "WAITING" || row.status === "NOTIFIED") ? (
                                      <button
                                        type="button"
                                        className="block w-full rounded px-3 py-1.5 text-left text-[12px] hover:bg-[#FFEFF8]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMenuId(null);
                                          void setStatus(row.id, "BOOKED");
                                        }}
                                      >
                                        Marquer convertie (sans RDV)
                                      </button>
                                    ) : null}
                                    {canAgenda ? (
                                      <Link
                                        href="/agenda/"
                                        className="block rounded px-3 py-1.5 text-[12px] hover:bg-[#FFEFF8]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Ouvrir l’agenda
                                      </Link>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-center justify-between gap-2 bg-white px-4 py-3 text-[13px] text-ink/50 sm:flex-row">
                <div className="flex items-center gap-2">
                  <span>
                    Affichage de {pageRows.length} sur {filtered.length} cliente
                    {filtered.length > 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B5900]">
                    <Lock size={13} /> Isolation institut
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded bg-[#FFEFF8] p-1 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-2 font-semibold text-ink">
                    Page {pageSafe} sur {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pageSafe >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded bg-[#FFEFF8] p-1 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 xl:col-span-4">
            {selected ? (
              <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFD9DE] text-[16px] font-bold text-primary">
                        {selected.initials}
                      </div>
                      {vipLabel(selected.customerSegment) === "VIP" ? (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#7B5900] text-[10px] text-white">
                          ★
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <div className="text-[18px] font-semibold">{selected.customerName}</div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {vipLabel(selected.customerSegment) ? (
                          <span className="rounded bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold text-[#261900]">
                            {vipLabel(selected.customerSegment)}
                          </span>
                        ) : null}
                        <span className="text-[12px] text-ink/45">
                          {tenureLabel(selected.customerCreatedAt) ?? selected.customerPhone}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selected.hasMatch ? (
                    <span className="rounded bg-primary px-2 py-1 text-[11px] font-bold text-white">
                      Score {selected.matchScore}%
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5 rounded-xl bg-[#FFEFF8] p-3 text-[13px]">
                  <Row label="Prestation ciblée" value={selected.serviceName} />
                  <Row
                    label="Praticienne"
                    value={selected.staffName ?? "Première disponible"}
                    accent={Boolean(selected.staffName)}
                  />
                  <Row label="Tarif" value={formatWaitMad(selected.servicePrice)} />
                  <Row label="Ajoutée le" value={formatRelativeAdded(selected.createdAt)} />
                  <Row
                    label="Fenêtre"
                    value={timeWindowLabel(selected.preferredTimeFrom, selected.preferredTimeTo)}
                  />
                </div>

                {selected.hasMatch || holdLeft > 0 ? (
                  <div className="space-y-2 rounded-xl bg-[#FCE9F4] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary">
                        <CalendarCheck size={18} />
                        Créneau identifié
                      </span>
                      <span className="rounded bg-white px-2 py-0.5 text-[12px]">
                        {selected.matchSlotLabel ?? selected.preferredDate}
                      </span>
                    </div>
                    <p className="text-[13px] text-ink/55">
                      {slot && slot.serviceId === selected.serviceId
                        ? `Créneau libéré suite à une annulation agenda (${slot.staffName}).`
                        : "Date souhaitée proche — proposez le créneau manuellement."}
                    </p>
                    {holdLeft > 0 ? (
                      <div className="mt-1 flex items-center justify-between rounded-lg bg-white p-2">
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold">
                          <Timer size={14} className="text-primary" />
                          Réservation temporaire
                        </span>
                        <span className="font-mono text-[14px] font-bold text-primary">
                          {formatCountdown(holdLeft)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <MessageCircle size={14} className="text-[#7B5900]" />
                    Proposition WhatsApp
                  </p>
                  <p className="rounded-lg bg-[#FFEFF8] p-3 text-[13px] italic leading-relaxed text-ink/70">
                    “{waitlistWhatsappPreview(selected, user.orgName, slotTime)}”
                  </p>
                </div>

                <div className="space-y-2">
                  <a
                    href={waitlistWhatsappHref(selected, user.orgName, slotTime)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onWhatsApp(selected)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-[14px] font-semibold text-white"
                  >
                    <MessageCircle size={18} />
                    Ouvrir WhatsApp
                  </a>
                  {canWrite && (selected.status === "WAITING" || selected.status === "NOTIFIED") ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void onConfirm(selected)}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm disabled:opacity-50"
                    >
                      <CalendarCheck size={18} />
                      Confirmer le rendez-vous agenda
                    </button>
                  ) : null}
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/35">Journal</p>
                  <ul className="space-y-1.5 text-[12px] text-ink/50">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B5900]" />
                      <span>
                        <strong className="text-ink">{formatRelativeAdded(selected.createdAt)} :</strong> ajoutée
                        en liste d’attente.
                      </span>
                    </li>
                    {selected.notifiedAt ? (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>
                          <strong className="text-primary">{formatRelativeAdded(selected.notifiedAt)} :</strong>{" "}
                          cliente notifiée (WhatsApp préparé).
                        </span>
                      </li>
                    ) : null}
                    {selected.hasMatch ? (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>
                          <strong className="text-primary">Match {selected.matchScore}%</strong> généré sur la
                          date et la praticienne.
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-5 text-[13px] text-ink/45 shadow-sm">
                Sélectionnez une cliente pour afficher sa fiche.
              </div>
            )}
          </aside>
        </div>

        <section className="relative overflow-hidden rounded-2xl bg-ink p-6 text-[#FEECF7] shadow-sm">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C79A3B]/20 text-[#FFDEA4]">
                  <Brain size={18} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFDEA4]">
                  Copilote · remplissage & rentabilité
                </span>
              </div>
              <h2 className="text-[28px] font-semibold tracking-tight text-white">
                {kpis.bookedMonthRevenue
                  ? `${formatWaitMad(kpis.bookedMonthRevenue)} récupérés ce mois-ci`
                  : "Aucun RDV encore converti ce mois-ci"}
              </h2>
              <p className="text-[15px] leading-relaxed text-white/80">
                {kpis.bookedMonth
                  ? `${kpis.bookedMonth} entrée${kpis.bookedMonth > 1 ? "s" : ""} passée${kpis.bookedMonth > 1 ? "s" : ""} en rendez-vous. Les propositions restent manuelles (wa.me).`
                  : "Ajoutez des clientes, puis proposez un créneau dès qu’une annulation apparaît à l’agenda."}
              </p>
              {mix.length ? (
                <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  {mix.map((s) => (
                    <div key={s.label} className="rounded bg-white/5 p-2">
                      <div className="truncate text-[11px] text-white/60">{s.label}</div>
                      <div className="text-[18px] font-semibold text-[#FFDEA4]">{s.pct}%</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="w-full space-y-3 rounded-xl bg-white/5 p-4 lg:w-96">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#FFDEA4]">
                <Lightbulb size={18} />
                Opportunité détectée
              </div>
              <p className="text-[13px] leading-relaxed text-white/90">
                {saturday ? (
                  <>
                    <strong>{saturday.count} clientes</strong> attendent un samedi
                    {saturday.staffName ? ` avec ${saturday.staffName.split(" ")[0]}` : ""}. Gain potentiel{" "}
                    <strong>{formatWaitMad(saturday.revenue)}</strong>.
                  </>
                ) : (
                  <>
                    Le matching croise service, date souhaitée, praticienne et créneaux annulés du jour. Aucun
                    booking automatique.
                  </>
                )}
              </p>
              <div className="space-y-2 pt-1">
                {canAgenda ? (
                  <Link
                    href="/agenda/"
                    className="flex h-10 w-full items-center justify-center rounded-lg bg-[#C79A3B] text-[14px] font-bold text-[#171018]"
                  >
                    Ouvrir l’agenda
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setTab("match")}
                  className="flex h-10 w-full items-center justify-center rounded-lg text-[14px] font-semibold text-white hover:bg-white/10"
                >
                  Voir les {kpis.matches} correspondance{kpis.matches > 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 rounded-xl bg-white p-4 text-[13px] text-ink/50 shadow-sm md:flex-row">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#7B5900]" />
            <span>
              Données cloisonnées par institut · conforme à la{" "}
              <strong className="text-ink">loi marocaine CNDP 09-08</strong>.
            </span>
          </div>
          {canWhatsapp ? (
            <Link href="/whatsapp/" className="font-semibold text-ink/60 hover:text-ink">
              Modèles WhatsApp →
            </Link>
          ) : null}
        </footer>
      </div>

      {addOpen && isDesktop ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[22px] font-semibold">Ajouter une cliente en liste d’attente</h3>
                <p className="text-[13px] text-ink/50">
                  Liaison au matching agenda — pas de réservation automatique.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg p-2 text-ink/40 hover:bg-[#FFEFF8]"
              >
                <X size={20} />
              </button>
            </div>
            <AddForm
              customers={customers}
              services={services}
              staffOpts={staffOpts}
              customerId={customerId}
              setCustomerId={setCustomerId}
              serviceId={serviceId}
              setServiceId={setServiceId}
              staffId={staffId}
              setStaffId={setStaffId}
              days={days}
              setDays={setDays}
              windowId={windowId}
              setWindowId={setWindowId}
              notes={notes}
              setNotes={setNotes}
              submitting={submitting}
              onCancel={() => setAddOpen(false)}
              onSubmit={onCreate}
            />
          </div>
        </div>
      ) : null}

      <Drawer
        open={addOpen && !isDesktop}
        onClose={() => setAddOpen(false)}
        title="Ajouter à la liste d’attente"
        side="bottom"
      >
        <div className="p-4">
          <AddForm
            customers={customers}
            services={services}
            staffOpts={staffOpts}
            customerId={customerId}
            setCustomerId={setCustomerId}
            serviceId={serviceId}
            setServiceId={setServiceId}
            staffId={staffId}
            setStaffId={setStaffId}
            days={days}
            setDays={setDays}
            windowId={windowId}
            setWindowId={setWindowId}
            notes={notes}
            setNotes={setNotes}
            submitting={submitting}
            onCancel={() => setAddOpen(false)}
            onSubmit={onCreate}
          />
        </div>
      </Drawer>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Paramètres matching">
        <div className="space-y-4 overflow-y-auto p-5 text-[14px] leading-relaxed text-ink/70">
          <p>
            Le moteur croise les clientes en <strong>attente</strong> avec les créneaux{" "}
            <strong>annulés aujourd’hui</strong> : même prestation, praticienne (si indiquée), date et plage
            horaire.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Aucune réservation n’est créée toute seule.</li>
            <li>WhatsApp s’ouvre via wa.me — envoi manuel depuis le téléphone de l’institut.</li>
            <li>« Bloquer 10 min » est un rappel local, pas un verrou agenda.</li>
            <li>Confirmer le RDV inscrit réellement le créneau à l’agenda.</li>
          </ul>
          <p className="text-[12px] text-ink/45">
            Ces règles sont celles du produit — il n’y a pas de seuils éditables en V1.
          </p>
        </div>
      </Drawer>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-ink/50">
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8]">{icon}</span>
      </div>
      <div className="pt-2">
        <div className="text-[22px] font-bold">{value}</div>
        <div className={cn("pt-1 text-[12px]", accent ? "font-semibold text-primary" : "text-ink/45")}>
          {hint}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink/50">{label} :</span>
      <strong className={accent ? "text-primary" : "text-ink"}>{value}</strong>
    </div>
  );
}

function AddForm({
  customers,
  services,
  staffOpts,
  customerId,
  setCustomerId,
  serviceId,
  setServiceId,
  staffId,
  setStaffId,
  days,
  setDays,
  windowId,
  setWindowId,
  notes,
  setNotes,
  submitting,
  onCancel,
  onSubmit,
}: {
  customers: CustomerListItem[];
  services: ServiceListItem[];
  staffOpts: { id: string; name: string }[];
  customerId: string;
  setCustomerId: (v: string) => void;
  serviceId: string;
  setServiceId: (v: string) => void;
  staffId: string;
  setStaffId: (v: string) => void;
  days: number[];
  setDays: (v: number[]) => void;
  windowId: (typeof TIME_WINDOWS)[number]["id"];
  setWindowId: (v: (typeof TIME_WINDOWS)[number]["id"]) => void;
  notes: string;
  setNotes: (v: string) => void;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Cliente</span>
        <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
          <option value="">Choisir…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName} · {c.phone}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Prestation</span>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
            <option value="">Choisir…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatWaitMad(s.price)})
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Praticienne</span>
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Indifférent / première disponible</option>
            {staffOpts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider">Jours acceptés</p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() =>
                  setDays(on ? days.filter((x) => x !== d.id) : [...days, d.id])
                }
                className={cn(
                  "rounded-lg px-3 py-2 text-[14px] font-semibold",
                  on ? "bg-primary text-white" : "bg-[#FFEFF8] text-ink",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[12px] text-ink/40">
          Date enregistrée : prochain jour coché ({nextDateForWeekdays(days)})
        </p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Plage horaire</span>
        <Select
          value={windowId}
          onChange={(e) => setWindowId(e.target.value as (typeof TIME_WINDOWS)[number]["id"])}
        >
          {TIME_WINDOWS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider">Notes</span>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Préférence cabine, contraintes horaires…"
        />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-lg bg-[#FFEFF8] px-4 text-[14px] font-semibold"
        >
          Annuler
        </button>
        <Button type="submit" variant="brand" disabled={submitting} className="h-12 rounded-lg">
          {submitting ? "…" : "Enregistrer en liste d’attente"}
        </Button>
      </div>
    </form>
  );
}
