"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Cake,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  APPOINTMENT_STATUS_UI,
  averageVisitGapDays,
  customerInitials,
  favoriteService,
  favoriteStaff,
  formatRelativeVisit,
  segmentBadge,
  shortCustomerRef,
  whatsappHref,
} from "@/components/customers/customers-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatPct } from "@/modules/analytics/service";
import {
  formatLastVisit,
  formatSegmentLabel,
  getCustomer,
  getCustomerStats,
  listCustomerNotes,
} from "@/modules/customers/service";
import { getCustomerLoyalty, LOYALTY_LEVEL_LABEL } from "@/modules/loyalty/service";
import type { AnalyticsOverview } from "@/types/analytics";
import type { CustomerAppointmentHistory, CustomerDetail, CustomerKpis, CustomerListItem, CustomerSegment } from "@/types/customer";
import type { Customer360Stats, CustomerNoteItem } from "@/types/customer-360";
import type { CustomerLoyaltyView } from "@/types/loyalty";

type MobileView = "list" | "focus";
type FocusTab = "rdv" | "spend" | "fidelity" | "risk";

const SEGMENTS: CustomerSegment[] = ["ALL", "ACTIVE", "AT_RISK", "VIP", "NEW"];

type CustomersMobileProps = {
  orgName: string;
  roleLabel: string;
  kpis: CustomerKpis;
  overview: AnalyticsOverview | null;
  reactivationPotential: number | null;
  financeHidden: boolean;
  canWrite: boolean;
  canExport: boolean;
  searchInput: string;
  onSearchChange: (value: string) => void;
  segment: CustomerSegment;
  onSegmentChange: (segment: CustomerSegment) => void;
  segmentCount: (segment: CustomerSegment) => number;
  rows: CustomerListItem[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  selected: CustomerListItem | null;
  onNewCustomer: () => void;
  onEdit: (id: string) => void;
  onExport: () => void;
};

export function CustomersMobile({
  orgName,
  roleLabel,
  kpis,
  overview,
  reactivationPotential,
  financeHidden,
  canWrite,
  canExport,
  searchInput,
  onSearchChange,
  segment,
  onSegmentChange,
  segmentCount,
  rows,
  loading,
  total,
  page,
  totalPages,
  onPageChange,
  onSelect,
  selected,
  onNewCustomer,
  onEdit,
  onExport,
}: CustomersMobileProps) {
  const [view, setView] = useState<MobileView>("list");
  const searchRef = useRef<HTMLInputElement>(null);
  const activeShare = kpis.total > 0 ? Math.round((kpis.activeCount / kpis.total) * 100) : 0;
  const focusName = selected?.firstName ?? "360°";

  function openFocus(id: string) {
    onSelect(id);
    setView("focus");
  }

  useEffect(() => {
    if (view === "focus" && !selected) setView("list");
  }, [view, selected]);

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
              Répertoire Clientes 360°
            </h1>
            <p className="mt-1 text-[13px] text-ink/50">
              {orgName || "Votre institut"} • {kpis.total} {kpis.total > 1 ? "profils" : "profil"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#F6E3EF] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            {roleLabel}
          </span>
        </div>

        {canWrite || canExport ? (
        <div className={cn("grid gap-2", canWrite && canExport ? "grid-cols-2" : "grid-cols-1")}>
          {canWrite ? (
            <button
              type="button"
              onClick={onNewCustomer}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-white shadow-md active:scale-[0.98]"
            >
              <UserPlus size={18} />
              Nouvelle cliente
            </button>
          ) : null}
          {canExport ? (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F0DDE9] text-[13px] font-semibold text-ink shadow-sm"
            >
              <Download size={18} />
              Exporter
            </button>
          ) : null}
        </div>
        ) : null}

        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            ref={searchRef}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher nom, téléphone, VIP…"
            className="h-12 w-full rounded-xl bg-white pl-11 pr-12 text-sm text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            aria-label="Filtrer les clientes"
            onClick={() => searchRef.current?.focus()}
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#FCE9F4] text-ink/50"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-ink">Indicateurs de rétention</span>
          <span className="text-[11px] font-semibold text-[#7B5900]">Mois en cours</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <KpiCard
            label="Total clientes"
            value={String(kpis.total)}
            hint={
              overview?.customers.changePercent != null
                ? `${formatPct(overview.customers.changePercent)} ce mois`
                : `${kpis.vipCount} VIP`
            }
            icon={<Users size={14} />}
            trend={overview?.customers.changePercent != null && overview.customers.changePercent > 0}
          />
          <KpiCard
            label="Nouvelles"
            value={String(kpis.newCount)}
            hint="30 derniers jours"
            gold
          />
          <KpiCard
            label="Actives"
            value={String(kpis.activeCount)}
            hint={`${activeShare} % de la base`}
            dot="emerald"
          />
          <KpiCard
            label="À relancer"
            value={String(kpis.atRiskCount)}
            hint={
              !financeHidden && reactivationPotential != null
                ? `Potentiel ${formatMad(reactivationPotential)}`
                : "Sans visite récente"
            }
            dot="amber"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#F6E3EF] p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary">
              <Wallet size={16} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink/45">CA du mois</p>
              <p className="text-[18px] font-bold text-ink">
                {financeHidden ? "—" : overview ? formatMad(overview.revenue.value) : "—"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-ink/45">Panier moyen</p>
            <p className="text-[18px] font-bold text-primary">
              {financeHidden ? "—" : overview ? formatMad(overview.averageTicket.value) : "—"}
              <span className="ml-1 text-[12px] font-normal text-ink/45">/visite</span>
            </p>
          </div>
        </div>
      </section>

      <section className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 py-1">
        {SEGMENTS.map((s) => {
          const active = segment === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSegmentChange(s)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold shadow-sm",
                active
                  ? s === "AT_RISK"
                    ? "bg-[#FCCA66] text-[#7B5900]"
                    : "bg-primary text-white"
                  : "bg-white text-ink",
              )}
            >
              {s === "VIP" ? <Star size={12} className="text-amber-500" /> : null}
              <span>{formatSegmentLabel(s)}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  active ? (s === "AT_RISK" ? "bg-[#F0BF5C]/80" : "bg-white/20") : "bg-[#FCE9F4] text-ink/50",
                )}
              >
                {segmentCount(s)}
              </span>
            </button>
          );
        })}
      </section>

      <section className="flex items-center rounded-xl bg-[#F6E3EF] p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "flex-1 rounded-lg py-2 text-center text-[13px] font-semibold transition-all",
            view === "list" ? "bg-white text-primary shadow-sm" : "text-ink/45",
          )}
        >
          Liste ({total})
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && setView("focus")}
          className={cn(
            "flex-1 rounded-lg py-2 text-center text-[13px] font-semibold transition-all disabled:opacity-40",
            view === "focus" ? "bg-white text-primary shadow-sm" : "text-ink/45",
          )}
        >
          Fiche 360° ({focusName})
        </button>
      </section>

      {view === "list" ? (
        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink/40">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/45">Aucune cliente trouvée.</p>
          ) : (
            rows.map((c) => (
              <CustomerListCard
                key={c.id}
                customer={c}
                onOpen={() => openFocus(c.id)}
              />
            ))
          )}
          {total > 0 ? (
            <div className="flex items-center justify-between pt-1 text-[11px] text-ink/45">
              <span>
                {total} cliente{total > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary px-2 font-bold text-white">
                  {page}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : selected ? (
        <CustomerFocusMobile
          key={selected.id}
          customerId={selected.id}
          fallback={selected}
          canWrite={canWrite}
          onEdit={() => onEdit(selected.id)}
        />
      ) : null}

      <p className="flex flex-col items-center gap-1 pb-2 text-center text-[11px] text-ink/40">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck size={12} />
          Les fiches restent dans votre institut
        </span>
        <span>Aucun WhatsApp n’est envoyé sans votre clic.</span>
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  gold,
  dot,
  trend,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
  gold?: boolean;
  dot?: "emerald" | "amber";
  trend?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink/45">{label}</span>
        {icon ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FCE9F4] text-primary">{icon}</span>
        ) : null}
        {gold ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFDEA4] text-[#7B5900]">
            <Star size={14} />
          </span>
        ) : null}
        {dot ? (
          <span className={cn("h-2 w-2 rounded-full", dot === "emerald" ? "bg-emerald-500" : "bg-amber-500")} />
        ) : null}
      </div>
      <div className="mt-2">
        <p className="font-display text-[22px] font-bold leading-7 text-ink">{value}</p>
        <p className={cn("mt-0.5 flex items-center gap-1 text-[11px] font-medium", trend ? "text-primary" : "text-ink/45")}>
          {trend ? <TrendingUp size={12} /> : null}
          {hint}
        </p>
      </div>
    </div>
  );
}

function CustomerListCard({ customer: c, onOpen }: { customer: CustomerListItem; onOpen: () => void }) {
  const badge = segmentBadge(c.segment);
  const statusDot =
    c.segment === "AT_RISK" || c.segment === "INACTIVE"
      ? "bg-amber-500"
      : c.segment === "VIP"
        ? "bg-[#7B5900]"
        : "bg-emerald-500";

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-white p-3 shadow-sm">
      <button type="button" onClick={onOpen} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE9F4] text-sm font-bold text-primary shadow-sm">
              {customerInitials(c.firstName, c.lastName)}
            </div>
            <span className={cn("absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-white", statusDot)} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[16px] font-bold text-ink">
                {c.firstName} {c.lastName}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", badge.className)}>
                {badge.label}
              </span>
            </div>
            <p className="text-[12px] text-ink/45">
              {shortCustomerRef(c.id)} • {c.visits} RDV
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="mt-1 shrink-0 text-primary" />
      </button>
      <div className="flex items-center justify-between rounded-lg bg-[#FFEFF8]/80 px-2 py-1.5 text-[12px] text-ink/50">
        <span>
          Dernière :{" "}
          <span className={cn("font-medium", c.segment === "AT_RISK" ? "text-rose-600" : "text-ink")}>
            {formatRelativeVisit(c.lastVisitAt)}
          </span>
        </span>
        <span>
          CA : <span className="font-semibold text-primary">{formatMad(c.revenue)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={whatsappHref(c.phone, c.firstName)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-[12px] font-semibold text-white shadow-sm"
        >
          <MessageCircle size={14} />
          WhatsApp
        </a>
        {c.segment === "AT_RISK" ? (
          <Link
            href="/reactivation/"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[#FCCA66] px-3 text-[12px] font-semibold text-[#7B5900]"
          >
            <Send size={14} />
            Relancer
          </Link>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[#F6E3EF] px-3 text-[12px] font-semibold text-ink"
          >
            <Eye size={14} />
            Fiche 360°
          </button>
        )}
      </div>
    </div>
  );
}

function CustomerFocusMobile({
  customerId,
  fallback,
  canWrite,
  onEdit,
}: {
  customerId: string;
  fallback: CustomerListItem;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState<FocusTab>("rdv");
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [history, setHistory] = useState<CustomerAppointmentHistory[]>([]);
  const [stats, setStats] = useState<Customer360Stats | null>(null);
  const [notes, setNotes] = useState<CustomerNoteItem[]>([]);
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTab("rdv");
    (async () => {
      const [detail, s, n, loy] = await Promise.allSettled([
        getCustomer(customerId, true),
        getCustomerStats(customerId),
        listCustomerNotes(customerId),
        getCustomerLoyalty(customerId),
      ]);
      if (cancelled) return;
      if (detail.status === "fulfilled") {
        setCustomer(detail.value.customer);
        setHistory(detail.value.history ?? []);
      } else {
        setCustomer(null);
        setHistory([]);
      }
      setStats(s.status === "fulfilled" ? s.value : null);
      setNotes(n.status === "fulfilled" ? n.value : []);
      setLoyalty(loy.status === "fulfilled" ? loy.value : null);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const person = customer ?? fallback;
  const badge = segmentBadge(person.segment);
  const visits = stats?.visits ?? person.visits;
  const spent = person.revenue;
  const ticket = person.averageTicket;
  const lastVisit = stats?.lastVisitAt ?? person.lastVisitAt;
  const noShows = stats?.noShowCount ?? person.noShowCount;
  const points = stats?.loyaltyPoints ?? loyalty?.account?.balance ?? 0;
  const fav = useMemo(() => favoriteService(history), [history]);
  const favStaff = useMemo(() => favoriteStaff(history), [history]);
  const cycle = useMemo(() => averageVisitGapDays(history), [history]);
  const noteText = notes[0]?.content ?? customer?.notes ?? null;
  const honorRate = visits + noShows > 0 ? Math.round((visits / (visits + noShows)) * 100) : null;
  const riskLow = (noShows ?? 0) <= 1;
  const birth = customer?.birthDate
    ? new Date(customer.birthDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;
  const age = customer?.birthDate
    ? (() => {
        const b = new Date(customer.birthDate);
        const now = new Date();
        let years = now.getFullYear() - b.getFullYear();
        if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) {
          years -= 1;
        }
        return Math.max(0, years);
      })()
    : null;

  const recommended = useMemo(() => {
    if (stats?.nextVisitAt) {
      return { kind: "planned" as const, date: new Date(stats.nextVisitAt) };
    }
    if (!lastVisit || cycle == null) return null;
    const d = new Date(lastVisit);
    d.setDate(d.getDate() + cycle);
    if (d.getTime() < Date.now() - 86_400_000) return null;
    return { kind: "suggested" as const, date: d };
  }, [stats?.nextVisitAt, lastVisit, cycle]);

  const dateLabel = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FCE9F4] text-lg font-bold text-primary shadow-sm">
              {customerInitials(person.firstName, person.lastName)}
            </div>
            <span
              className={cn(
                "absolute bottom-0 right-0 h-4 w-4 rounded-full ring-2 ring-white",
                person.segment === "AT_RISK" ? "bg-amber-500" : "bg-emerald-500",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-[18px] font-bold text-ink">
                {person.firstName} {person.lastName}
              </h2>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badge.className)}>
                {badge.label}
                {loyalty?.account ? ` ${LOYALTY_LEVEL_LABEL[loyalty.account.level]}` : ""}
              </span>
            </div>
            <p
              className={cn(
                "text-[12px] font-medium",
                person.segment === "AT_RISK" ? "text-amber-700" : "text-emerald-600",
              )}
            >
              {person.segment === "AT_RISK"
                ? "Sans visite récente"
                : person.segment === "NEW"
                  ? "Nouvelle cliente"
                  : "Cliente active"}
            </p>
            <p className="font-mono text-[11px] text-ink/40">{shortCustomerRef(person.id)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-[13px] text-ink/60">
          <p className="flex items-center gap-1.5 truncate">
            <Phone size={14} className="shrink-0 text-primary" />
            <span className="truncate font-mono">{person.phone}</span>
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <Cake size={14} className="shrink-0 text-[#7B5900]" />
            {birth ? `${birth}${age != null ? ` (${age} ans)` : ""}` : "Anniversaire —"}
          </p>
          <p className="col-span-2 flex items-center gap-1.5 truncate">
            <Mail size={14} className="shrink-0 text-primary" />
            <span className="truncate">{person.email || "Pas d’e-mail"}</span>
          </p>
          {favStaff ? (
            <p className="col-span-2 flex items-center gap-1.5 rounded-lg bg-[#FFEFF8] p-2 text-ink">
              <Star size={14} className="text-[#7B5900]" />
              Praticienne favorite : <span className="font-semibold text-primary">{favStaff}</span>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/agenda/?customerId=${person.id}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-[12px] font-semibold text-white shadow-sm"
          >
            <CalendarPlus size={16} />
            Nouveau RDV
          </Link>
          <a
            href={whatsappHref(person.phone, person.firstName)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-[12px] font-semibold text-white shadow-sm"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
          <Link
            href={`/payments/?customerId=${person.id}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-ink text-[12px] font-semibold text-white shadow-sm"
          >
            <Wallet size={16} />
            Encaisser
          </Link>
          <Link
            href={`/loyalty/?customerId=${person.id}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#FFDEA4] text-[12px] font-semibold text-[#7B5900] shadow-sm"
          >
            <Star size={16} />
            Points Club
          </Link>
        </div>
        {canWrite ? (
          <button type="button" onClick={onEdit} className="text-center text-[12px] font-semibold text-primary">
            Modifier le profil
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniStat
          label="Visites totales"
          value={String(visits)}
          hint={honorRate != null ? `${honorRate} % honorés (${noShows} no-show)` : "—"}
          hintClass={noShows === 0 ? "text-emerald-600" : undefined}
        />
        <MiniStat label="Total dépensé" value={formatMad(spent)} hint={`Moy. ${formatMad(ticket)} / visite`} valueClass="text-primary" />
        <MiniStat
          label="Points Club"
          value={`${points} pts`}
          hint={
            loyalty?.nextReward
              ? loyalty.pointsToNextReward != null
                ? `Encore ${loyalty.pointsToNextReward} pts`
                : loyalty.nextReward.name
              : "Fidélité"
          }
          valueClass="text-[#7B5900]"
        />
        <MiniStat label="Dernier soin" value={formatLastVisit(lastVisit)} hint={formatRelativeVisit(lastVisit)} />
      </div>

      {cycle != null || fav || recommended ? (
        <div className="flex flex-col gap-2 rounded-xl bg-gradient-to-br from-[#FCE9F4] to-[#FFEFF8] p-3 shadow-sm">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={18} />
            <span className="text-[13px] font-semibold">À partir de l’historique</span>
          </div>
          <p className="text-[13px] leading-5 text-ink">
            {cycle != null ? (
              <>
                {person.firstName} revient en moyenne{" "}
                <span className="font-semibold text-primary">tous les {cycle} jours</span>
                {fav || recommended ? ". " : "."}
              </>
            ) : null}
            {fav ? (
              <>
                Prestation la plus fréquente : <span className="font-semibold">{fav}</span>
                {recommended ? ". " : "."}
              </>
            ) : null}
            {recommended ? (
              <>
                {recommended.kind === "planned" ? "Prochain rendez-vous prévu" : "Prochain rendez-vous recommandé"} :{" "}
                <span className="font-semibold text-[#7B5900]">{dateLabel(recommended.date)}</span>.
              </>
            ) : null}
          </p>
          <a
            href={whatsappHref(person.phone, person.firstName)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white text-[12px] font-semibold text-primary shadow-sm"
          >
            <MessageCircle size={14} />
            Préparer un message WhatsApp
          </a>
        </div>
      ) : null}

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {(
          [
            ["rdv", `Rendez-vous (${history.length})`],
            ["spend", "Dépenses"],
            ["fidelity", "Fidélité"],
            ["risk", "Score risque"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[12px] font-semibold shadow-sm",
              tab === id ? "bg-primary text-white" : "bg-white text-ink/50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-6 text-center text-xs text-ink/40">Chargement de la fiche…</p>
      ) : tab === "rdv" ? (
        <div className="flex flex-col gap-2">
          {loyalty?.nextReward && points >= loyalty.nextReward.pointsCost ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FCCA66]/50 p-3">
              <div>
                <p className="text-[13px] font-bold text-[#7B5900]">{loyalty.nextReward.name}</p>
                <p className="text-[11px] text-[#5D4200]">{loyalty.nextReward.pointsCost} pts</p>
              </div>
              <Link
                href={`/loyalty/?customerId=${person.id}`}
                className="rounded-lg bg-[#7B5900] px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                Appliquer
              </Link>
            </div>
          ) : null}
          <span className="text-[14px] font-semibold text-ink">Historique des soins récents</span>
          {history.length === 0 ? (
            <p className="text-xs text-ink/45">Aucun rendez-vous enregistré.</p>
          ) : (
            history.slice(0, 8).map((item) => {
              const st = APPOINTMENT_STATUS_UI[item.status] ?? APPOINTMENT_STATUS_UI.PENDING;
              return (
                <div key={item.id} className="flex flex-col gap-1.5 rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[15px] font-semibold text-ink">{item.serviceName}</span>
                    <span className="shrink-0 text-[15px] font-bold text-primary">{formatMad(item.price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-ink/45">
                    <span>
                      {new Date(item.startAt).toLocaleDateString("fr-FR")}
                      {item.staffFirstName ? ` • ${item.staffFirstName}` : ""}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", st.className)}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : tab === "spend" ? (
        <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm text-[13px] text-ink/70">
          <p>
            Total : <strong className="text-ink">{formatMad(spent)}</strong>
          </p>
          <p>
            Panier moyen : <strong className="text-ink">{formatMad(ticket)}</strong>
          </p>
          <p>
            {visits} visite{visits > 1 ? "s" : ""} honorée{visits > 1 ? "s" : ""}
          </p>
          <Link href={`/payments/?customerId=${person.id}`} className="font-semibold text-primary">
            Voir les encaissements
          </Link>
        </div>
      ) : tab === "fidelity" ? (
        <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm text-[13px] text-ink/70">
          <p>
            Solde : <strong className="text-ink">{points} pts</strong>
            {loyalty?.account ? ` · ${LOYALTY_LEVEL_LABEL[loyalty.account.level]}` : ""}
          </p>
          {loyalty?.nextReward ? (
            <p>
              Prochaine récompense : {loyalty.nextReward.name}
              {loyalty.pointsToNextReward != null ? ` · encore ${loyalty.pointsToNextReward} pts` : ""}
            </p>
          ) : (
            <p>Aucune récompense configurée pour le moment.</p>
          )}
          <Link href={`/loyalty/?customerId=${person.id}`} className="font-semibold text-primary">
            Ouvrir la fidélité
          </Link>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm",
            riskLow ? "text-emerald-700" : "text-rose-800",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              riskLow ? "bg-emerald-100" : "bg-rose-100",
            )}
          >
            <ShieldCheck size={16} />
          </span>
          <div>
            <p className="text-[11px] font-medium text-ink/45">Risque de désistement / no-show</p>
            <p className="text-[13px] font-bold">
              {riskLow ? "Faible" : "À surveiller"} • {noShows} no-show
              {stats?.cancellationCount ? ` • ${stats.cancellationCount} annulation(s)` : ""}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 rounded-xl bg-[#F6E3EF] p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            Notes internes
          </p>
          <Lock size={14} className="text-ink/40" />
        </div>
        {noteText ? (
          <p className="rounded-lg bg-white/70 p-2.5 text-[13px] italic leading-5 text-ink">« {noteText} »</p>
        ) : (
          <p className="text-xs text-ink/45">Aucune note interne.</p>
        )}
      </div>

      <Link
        href={`/customers/${person.id}/`}
        className="flex h-11 items-center justify-center rounded-xl bg-[#F6E3EF] text-[13px] font-bold text-primary"
      >
        Ouvrir la fiche complète
      </Link>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  valueClass,
  hintClass,
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
  hintClass?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
      <span className="text-[11px] font-semibold text-ink/45">{label}</span>
      <div className="mt-1">
        <p className={cn("font-display text-[22px] font-bold leading-7 text-ink", valueClass)}>{value}</p>
        <p className={cn("text-[11px] font-medium text-ink/45", hintClass)}>{hint}</p>
      </div>
    </div>
  );
}
