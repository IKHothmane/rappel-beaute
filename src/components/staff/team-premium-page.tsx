"use client";
import { MetricCard } from "@/components/ui/metric-card";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  Mail,
  Pencil,
  Phone,
  Search,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { whatsappHref } from "@/components/customers/customers-helpers";
import NouveauCollaborateurModal from "@/components/staff/nouveau-collaborateur-modal";
import {
  commissionRuleLabel,
  formatHireLabel,
  staffInitials,
  statusChipClass,
  statusDotClass,
} from "@/components/staff/staff-helpers";
import { useToast } from "@/components/ui/toast";
import {
  canViewStaffCommissions,
  canViewStaffPerformanceFull,
  canWriteStaff,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  formatMad,
  formatPct,
  getAnalyticsOverview,
  getAnalyticsReviews,
  getAnalyticsStaff,
} from "@/modules/analytics/service";
import { createStaff, getStaff, listStaff, updateStaff } from "@/modules/staff/service";
import type { AnalyticsOverview, ReviewAnalytics, StaffAnalyticsRow } from "@/types/analytics";
import type { StaffDetail, StaffListItem, StaffStatus } from "@/types/staff";
import { STAFF_STATUS_LABEL } from "@/types/staff";

type StaffFilter = "all" | "active" | "leave" | "top";

function Metric({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "pink",
}: {
  title: string;
  value: string;
  subtitle?: ReactNode;
  icon: ElementType;
  color?: "pink" | "green" | "gold" | "purple";
}) {
  return <MetricCard title={title} value={value} icon={<Icon />} hint={subtitle}></MetricCard>;
}

function Avatar({
  staff,
  large = false,
}: {
  staff: Pick<StaffListItem, "id" | "firstName" | "lastName" | "status">;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-[#ffe5ef] to-[#d9a0b9] font-bold text-[#831d4a]",
        large ? "h-16 w-16 text-xl" : "h-12 w-12 text-sm",
      )}
    >
      {staffInitials(staff.firstName, staff.lastName)}
      <span
        className={cn(
          "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white",
          statusDotClass(staff.status),
        )}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: StaffStatus }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusChipClass(status))}>
      {STAFF_STATUS_LABEL[status]}
    </span>
  );
}

export function TeamPremiumPage({ createSignal = 0 }: { createSignal?: number }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStaff(user.role);
  const canPerf = canViewStaffPerformanceFull(user.role);
  const canCommissions = canViewStaffCommissions(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const showFinance = canPerf && !financeHidden;

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StaffFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [catalog, setCatalog] = useState<StaffListItem[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [staffStats, setStaffStats] = useState<StaffAnalyticsRow[]>([]);
  const [statsReady, setStatsReady] = useState(false);
  const [reviews, setReviews] = useState<ReviewAnalytics | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await listStaff({ limit: 100 });
      setCatalog(res.data);
      setSelectedId((current) => {
        if (current && res.data.some((row) => row.id === current)) return current;
        return res.data[0]?.id ?? null;
      });
    } catch {
      toast("Impossible de charger les employées.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    getAnalyticsOverview({ preset: "month", compare: true })
      .then(setOverview)
      .catch(() => setOverview(null));
    getAnalyticsStaff({ preset: "month" })
      .then((res) => setStaffStats(res.items))
      .catch(() => setStaffStats([]))
      .finally(() => setStatsReady(true));
    getAnalyticsReviews({ preset: "month" })
      .then(setReviews)
      .catch(() => setReviews(null));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getStaff(selectedId)
      .then((staff) => {
        if (!cancelled) setDetail(staff);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const monthlyById = useMemo(() => {
    const map = new Map<string, StaffAnalyticsRow>();
    for (const row of staffStats) map.set(row.staffId, row);
    return map;
  }, [staffStats]);

  const monthCatalog = useMemo(() => {
    if (!statsReady) return catalog;
    const hasMonthly = staffStats.some((r) => r.appointments > 0 || r.revenue > 0);
    if (!hasMonthly) return catalog;
    return catalog.map((s) => {
      const st = monthlyById.get(s.id);
      return {
        ...s,
        appointmentCount: st?.appointments ?? 0,
        revenue: st?.revenue ?? 0,
      };
    });
  }, [catalog, monthlyById, staffStats, statsReady]);

  const activeCount = catalog.filter((s) => s.status === "ACTIVE").length;
  const leaveCount = catalog.filter((s) => s.status === "ON_LEAVE").length;
  const usingMonthly = statsReady && staffStats.some((r) => r.appointments > 0 || r.revenue > 0);
  const teamRevenue = monthCatalog.reduce((sum, s) => sum + s.revenue, 0);

  const topSellerIds = useMemo(() => {
    const ranked = [...monthCatalog]
      .filter((s) => s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
    return new Set(ranked.slice(0, 3).map((s) => s.id));
  }, [monthCatalog]);

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const s of catalog) {
      if (s.position?.trim()) set.add(s.position.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return monthCatalog.filter((s) => {
      if (filter === "active" && s.status !== "ACTIVE") return false;
      if (filter === "leave" && s.status !== "ON_LEAVE") return false;
      if (filter === "top" && !topSellerIds.has(s.id)) return false;
      if (roleFilter !== "all" && (s.position ?? "") !== roleFilter) return false;
      if (!q) return true;
      return (
        s.displayName.toLowerCase().includes(q) ||
        (s.position ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        s.serviceNames.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [monthCatalog, search, filter, roleFilter, topSellerIds]);

  useEffect(() => {
    setSelectedId((current) => {
      if (current && filtered.some((row) => row.id === current)) return current;
      return filtered[0]?.id ?? null;
    });
  }, [filtered]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;
  const person = detail ?? selected;
  const hire = person ? formatHireLabel(person.hireDate) : null;
  const enabledServices =
    detail?.services.filter((s) => s.active).map((s) => s.serviceName) ??
    selected?.serviceNames ??
    [];

  const apptChange = overview?.appointments.changePercent;
  const revChange = overview?.revenue.changePercent;

  useEffect(() => {
    if (createSignal <= 0 || !canWrite) return;
    setEditing(null);
    setDrawerOpen(true);
  }, [createSignal, canWrite]);

  async function openEdit(id: string) {
    try {
      const staff = await getStaff(id);
      setEditing(staff);
      setDrawerOpen(true);
    } catch {
      toast("Impossible de charger le profil.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createStaff>[0]) {
    setSubmitting(true);
    const result = editing ? await updateStaff(editing.id, data) : await createStaff(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    setEditing(null);
    toast(editing ? "Profil mis à jour." : "Collaboratrice créée.", "success");
    void refresh();
  }

  return (
    <div className="space-y-5 text-[#401126]">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 rb-metric-row">
        <Metric
          title="Équipe totale"
          value={loading ? "…" : String(catalog.length)}
          subtitle={
            catalog.length
              ? `${activeCount} actives · ${leaveCount} congé`
              : "Collaborateurs"
          }
          icon={Users}
        />
        <Metric
          title="Actives"
          value={loading ? "…" : String(activeCount)}
          subtitle={
            catalog.length
              ? `${Math.round((activeCount / catalog.length) * 100)}% de l'équipe`
              : "—"
          }
          icon={BadgeCheck}
          color="green"
        />
        <Metric
          title="En congé"
          value={loading ? "…" : String(leaveCount)}
          subtitle={leaveCount ? "Absences en cours" : "Aucun congé"}
          icon={Clock3}
          color="gold"
        />
        <Metric
          title="Soins honorés"
          value={overview ? String(overview.appointments.value) : loading ? "…" : "—"}
          subtitle={
            apptChange != null ? (
              <span className={apptChange >= 0 ? "text-emerald-700" : "text-red-700"}>
                {formatPct(apptChange)} vs m-1
              </span>
            ) : (
              "Mois en cours"
            )
          }
          icon={CalendarDays}
          color="purple"
        />
        <Metric
          title="CA praticiennes"
          value={showFinance ? formatMad(teamRevenue) : "—"}
          subtitle={
            !showFinance
              ? "Accès limité"
              : revChange != null
                ? (
                    <span className={revChange >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {formatPct(revChange)} vs m-1
                    </span>
                  )
                : usingMonthly
                  ? "CA attribué ce mois"
                  : "CA attribué"
          }
          icon={Wallet}
        />
        <Metric
          title="Satisfaction"
          value={
            reviews?.averageInternalScore != null
              ? String(reviews.averageInternalScore)
              : "—"
          }
          subtitle={
            reviews?.recordedSatisfaction
              ? `${reviews.recordedSatisfaction} avis /5`
              : "Score interne"
          }
          icon={Star}
          color="gold"
        />
      </div>

      <section className="rounded-2xl border border-[#efd8e2] bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#efd8e2] bg-[#fff9fc] px-4 py-3">
            <Search size={18} className="shrink-0 text-[#b52d65]" aria-hidden />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher une praticienne, un poste, un service…"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#b29ba6]"
            />
            {searchInput ? (
              <button type="button" onClick={() => setSearchInput("")} aria-label="Effacer la recherche">
                <X size={16} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#edcfdb] px-4 py-3 text-sm font-semibold"
          >
            <Filter size={16} aria-hidden />
            Filtres
          </button>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", `Toutes (${catalog.length})`],
                ["active", `Actives (${activeCount})`],
                ["leave", `En congé (${leaveCount})`],
                ["top", "Top vendeuses"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-xs font-semibold transition",
                  filter === key
                    ? "bg-[#b00051] text-white"
                    : "border border-[#efd8e2] bg-[#fff8fb] text-[#70445a] hover:bg-[#fce6ef]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showFilters ? (
          <div className="mt-3 border-t border-[#f4e3ea] pt-3">
            <label className="mr-3 text-xs font-semibold" htmlFor="staff-role-filter">
              Poste
            </label>
            <select
              id="staff-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-[#ead2dd] bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tous les postes</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)]">
        <section className="min-w-0 space-y-3">
          <h3 className="px-1 text-sm font-bold text-[#54112f]">
            {filtered.length} collaborateur{filtered.length > 1 ? "s" : ""} affiché
            {filtered.length > 1 ? "s" : ""}
          </h3>

          {loading ? (
            <div className="rounded-2xl border border-[#f0dce5] bg-white p-10 text-center text-sm text-[#947784]">
              Chargement de l&apos;équipe…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#f0dce5] bg-white p-10 text-center text-sm text-[#947784]">
              Aucun collaborateur ne correspond aux filtres.
            </div>
          ) : (
            filtered.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => setSelectedId(employee.id)}
                className={cn(
                  "w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                  selected?.id === employee.id
                    ? "border-[#d31d6b] bg-[#fff3f8] ring-1 ring-[#e9a7c2]"
                    : "border-[#f0dce5]",
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar staff={employee} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-[#401126]">{employee.displayName}</h4>
                      {topSellerIds.has(employee.id) ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Top vendeuse
                        </span>
                      ) : null}
                      <StatusBadge status={employee.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#947785]">{employee.position || "Collaboratrice"}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#987a88]">
                      <Phone size={12} aria-hidden />
                      {employee.phone || "Téléphone non renseigné"}
                    </p>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-[#a61c58]" aria-hidden />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#fdf0f6] p-3">
                  <div>
                    <p className="text-[10px] text-[#a08793]">RDV</p>
                    <p className="mt-1 font-bold">{employee.appointmentCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#a08793]">CA généré</p>
                    <p className="mt-1 font-bold text-[#a9004e]">
                      {showFinance ? formatMad(employee.revenue) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#a08793]">Score</p>
                    <p className="mt-1 font-bold">
                      {employee.rating == null ? "—" : `${employee.rating}/5`}
                    </p>
                  </div>
                </div>

                {employee.serviceNames.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {employee.serviceNames.slice(0, 3).map((service) => (
                      <span
                        key={service}
                        className="rounded-lg bg-[#fce7f0] px-2 py-1 text-[10px] font-medium text-[#923557]"
                      >
                        {service}
                      </span>
                    ))}
                    {employee.serviceNames.length > 3 ? (
                      <span className="rounded-lg bg-[#fce7f0] px-2 py-1 text-[10px] font-medium text-[#923557]">
                        +{employee.serviceNames.length - 3} autres
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </section>

        <aside className="min-w-0 rounded-3xl border border-[#efd6e1] bg-white p-4 shadow-sm md:p-5 xl:sticky xl:top-5">
          {!selected || !person ? (
            <div className="py-16 text-center text-sm text-[#947784]">
              Sélectionnez une collaboratrice.
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Avatar staff={person} large />
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-xl font-bold">{person.displayName}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={person.status} />
                    {topSellerIds.has(person.id) ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Top vendeuse
                      </span>
                    ) : null}
                    <span className="text-xs text-[#a82c62]">
                      {person.position || "Collaboratrice"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Link
                  href="/staff/?tab=planning"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#fce5ef] px-3 py-3 text-xs font-semibold text-[#94164a]"
                >
                  <CalendarDays size={16} aria-hidden />
                  Planning
                </Link>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => void openEdit(person.id)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#fce5ef] px-3 py-3 text-xs font-semibold text-[#94164a]"
                  >
                    <Pencil size={15} aria-hidden />
                    Modifier
                  </button>
                ) : (
                  <span className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-3 text-xs text-slate-400">
                    Modifier
                  </span>
                )}
                {person.phone ? (
                  <a
                    href={whatsappHref(person.phone, person.firstName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-3 text-xs font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-3 text-xs text-slate-400">
                    WhatsApp indisponible
                  </span>
                )}
              </div>

              <div className="mt-5 rounded-2xl bg-[#fff0f6] p-4">
                <h4 className="mb-3 text-sm font-bold">Contact &amp; identité</h4>
                <div className="space-y-3 text-xs text-[#795366]">
                  <p className="flex items-center gap-2 break-all">
                    <Mail size={15} className="shrink-0" aria-hidden />
                    {person.email || "E-mail non renseigné"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone size={15} className="shrink-0" aria-hidden />
                    {person.phone || "Téléphone non renseigné"}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays size={15} className="shrink-0" aria-hidden />
                    {hire ? `Depuis le ${hire}` : "Date d’arrivée non renseignée"}
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#54112f]">Statut :</span>
                    <StatusBadge status={person.status} />
                  </p>
                  {canCommissions && detail ? (
                    <p>
                      <span className="font-semibold text-[#54112f]">Rémunération :</span>{" "}
                      {commissionRuleLabel(detail.commissions)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-bold">Habilitations</h4>
                <p className="mt-1 text-xs text-[#987d89]">
                  Services autorisés pour cette praticienne.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {detailLoading && !enabledServices.length ? (
                    <p className="text-xs text-[#a18a95]">Chargement…</p>
                  ) : enabledServices.length ? (
                    <>
                      {enabledServices.slice(0, 6).map((service) => (
                        <span
                          key={service}
                          className="rounded-full bg-[#fbe1ed] px-3 py-2 text-xs font-medium text-[#8d2350]"
                        >
                          {service}
                        </span>
                      ))}
                      {enabledServices.length > 6 ? (
                        <span className="rounded-full bg-[#fbe1ed] px-3 py-2 text-xs font-medium text-[#8d2350]">
                          +{enabledServices.length - 6} autres
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-[#a18a95]">Aucun service renseigné.</p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-bold">
                  Performance{usingMonthly ? " (30 derniers jours)" : ""}
                </h4>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#fff0f6] p-3 text-center">
                    <CalendarDays size={17} className="mx-auto text-[#b00052]" aria-hidden />
                    <p className="mt-2 text-lg font-extrabold">{selected.appointmentCount}</p>
                    <p className="text-[10px] text-[#997986]">Rendez-vous</p>
                  </div>
                  <div className="rounded-xl bg-[#fff0f6] p-3 text-center">
                    <Wallet size={17} className="mx-auto text-[#b00052]" aria-hidden />
                    <p className="mt-2 text-sm font-extrabold">
                      {showFinance ? formatMad(selected.revenue) : "—"}
                    </p>
                    <p className="text-[10px] text-[#997986]">Chiffre d&apos;affaires</p>
                  </div>
                  <div className="rounded-xl bg-[#fff0f6] p-3 text-center">
                    <Star size={17} className="mx-auto text-[#b00052]" aria-hidden />
                    <p className="mt-2 text-lg font-extrabold">
                      {selected.rating != null ? `${selected.rating}/5` : "—"}
                    </p>
                    <p className="text-[10px] text-[#997986]">Satisfaction</p>
                  </div>
                </div>
              </div>

            </>
          )}
        </aside>
      </div>

      <NouveauCollaborateurModal
        key={editing?.id ?? "new"}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        initial={editing ?? undefined}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default TeamPremiumPage;
