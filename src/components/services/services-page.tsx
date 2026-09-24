"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Filter,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  Scissors,
  Search,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { ServiceForm } from "@/components/services/service-form";
import {
  categoryIcon,
  hourlyRate,
  staffInitials,
} from "@/components/services/services-helpers";
import { ServicesMobile } from "@/components/services/services-mobile";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canEditServicePrice, canReadAnalytics, canWriteFeature } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatMad, formatPct, getAnalyticsOverview, getAnalyticsServices } from "@/modules/analytics/service";
import { openReportExport } from "@/modules/reports/service";
import {
  createService,
  deleteService,
  formatDuration,
  getService,
  getServiceFormOptions,
  listServices,
  updateService,
} from "@/modules/services/service";
import type { AnalyticsOverview, ServiceAnalyticsRow } from "@/types/analytics";
import type { ServiceDetail, ServiceFormOptions, ServiceListItem } from "@/types/service";

type ActiveFilter = "all" | "active" | "inactive";

export function ServicesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeature(user.role, "services");
  const canPrice = canEditServicePrice(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const canExport = canReadAnalytics(user.role) && !financeHidden;

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [catalog, setCatalog] = useState<ServiceListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [options, setOptions] = useState<ServiceFormOptions | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [serviceStats, setServiceStats] = useState<ServiceAnalyticsRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
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
      const res = await listServices({ limit: 200 });
      setCatalog(res.data);
      setCategories(res.categories);
    } catch {
      toast("Impossible de charger les services.", "error");
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
    getAnalyticsServices({ preset: "month" })
      .then((res) => setServiceStats(res.items))
      .catch(() => setServiceStats([]));
  }, []);

  const statsById = useMemo(() => {
    const map = new Map<string, ServiceAnalyticsRow>();
    for (const row of serviceStats) map.set(row.serviceId, row);
    return map;
  }, [serviceStats]);

  const activeCount = catalog.filter((s) => s.active).length;
  const inactiveCount = catalog.length - activeCount;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return catalog.filter((s) => {
      if (activeFilter === "active" && !s.active) return false;
      if (activeFilter === "inactive" && s.active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.staffNames.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [catalog, search, activeFilter]);

  const topByRevenue = serviceStats[0] ?? null;
  const topByAppointments = useMemo(() => {
    if (!serviceStats.length) return null;
    return serviceStats.reduce((best, row) => (row.appointments > best.appointments ? row : best), serviceStats[0]);
  }, [serviceStats]);

  const topHourly = useMemo(() => {
    let best: { service: ServiceListItem; rate: number } | null = null;
    for (const s of catalog.filter((x) => x.active)) {
      const rate = hourlyRate(s.price, s.durationMin);
      if (rate == null) continue;
      if (!best || rate > best.rate) best = { service: s, rate };
    }
    return best;
  }, [catalog]);

  const hourlyRanking = useMemo(() => {
    return catalog
      .filter((s) => s.active)
      .map((s) => ({ service: s, rate: hourlyRate(s.price, s.durationMin) }))
      .filter((x): x is { service: ServiceListItem; rate: number } => x.rate != null)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 4);
  }, [catalog]);
  const maxHourly = hourlyRanking[0]?.rate ?? 0;

  async function ensureOptions() {
    if (options) return options;
    const opts = await getServiceFormOptions();
    setOptions(opts);
    return opts;
  }

  async function openCreate() {
    try {
      await ensureOptions();
    } catch {
      toast("Impossible de charger les options.", "error");
      return;
    }
    setEditing(null);
    setDrawerOpen(true);
  }

  async function openEdit(id: string) {
    try {
      const [detail, opts] = await Promise.all([
        getService(id),
        options ? Promise.resolve(options) : getServiceFormOptions(),
      ]);
      setOptions(opts);
      setEditing(detail);
      setDrawerOpen(true);
      setMenuId(null);
    } catch {
      toast("Impossible de charger le service.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createService>[0]) {
    setSubmitting(true);
    const result = editing ? await updateService(editing.id, data) : await createService(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    setEditing(null);
    toast(editing ? "Service mis à jour." : "Service créé.", "success");
    refresh();
  }

  async function toggleActive(row: ServiceListItem) {
    if (!canWrite) return;
    const result = await updateService(row.id, { active: !row.active });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(row.active ? "Service désactivé." : "Service réactivé.", "success");
    setMenuId(null);
    refresh();
  }

  async function confirmDelete(row: ServiceListItem) {
    if (!canWrite) return;
    const ok = window.confirm(`Supprimer « ${row.name} » ? Cette action est définitive.`);
    if (!ok) {
      setMenuId(null);
      return;
    }
    const result = await deleteService(row.id);
    if (!result.ok) {
      toast(result.error, "error");
      setMenuId(null);
      return;
    }
    toast("Service supprimé.", "success");
    setMenuId(null);
    refresh();
  }

  const insight =
    topByAppointments && topByAppointments.appointments > 0
      ? `${topByAppointments.serviceName} est la prestation la plus demandée ce mois (${topByAppointments.appointments} RDV${
          !financeHidden ? ` • ${formatMad(topByAppointments.revenue)}` : ""
        }).`
      : overview && overview.appointments.value > 0
        ? "Des rendez-vous sont prévus ce mois, mais aucun n’est encore terminé — le classement ventes s’affiche après réalisation."
        : "Pas encore assez de rendez-vous ce mois pour un classement.";

  return (
    <div className="flex flex-col gap-5 pb-8">
      <ServicesMobile
        orgName={user.orgName}
        catalogCount={catalog.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        canWrite={canWrite}
        financeHidden={financeHidden}
        overview={overview}
        insight={insight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        filtered={filtered}
        statsById={statsById}
        loading={loading}
        topByAppointments={topByAppointments}
        topHourlyId={topHourly?.service.id ?? null}
        topHourlyRate={topHourly?.rate ?? null}
        menuId={menuId}
        onMenu={setMenuId}
        onCreate={() => void openCreate()}
        onEdit={(id) => void openEdit(id)}
        onToggle={(s) => void toggleActive(s)}
        onDelete={(s) => void confirmDelete(s)}
      />

      <div className="hidden flex-col gap-5 lg:flex">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-display text-[28px] font-bold leading-9 tracking-tight text-ink lg:text-[32px]">
              <Scissors size={26} className="text-primary" />
              Services & Prestations
            </h1>
            <p className="mt-1 max-w-3xl text-[15px] text-ink/50">
              Catalogue, tarifs en MAD et durées de réservation — {ROLE_LABEL[user.role]}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite ? (
              <button
                type="button"
                onClick={() => void openCreate()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md"
              >
                <Plus size={18} />
                Nouveau service
              </button>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            ref={searchRef}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher un service…"
            className="h-12 w-full rounded-xl bg-white pl-12 pr-28 text-sm text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            <span className="hidden rounded bg-[#F6E3EF] px-2 py-0.5 font-mono text-[11px] text-ink/45 sm:inline">
              ⌘K
            </span>
            <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#FCE9F4] px-2.5 text-[12px] font-semibold text-ink">
              <Filter size={14} />
              Filtres
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Catalogue"
          value={String(catalog.length)}
          hint={`${activeCount} actifs • ${inactiveCount} inactif${inactiveCount > 1 ? "s" : ""}`}
          icon={Scissors}
        />
        <KpiCard
          label="Prestations actives"
          value={String(activeCount)}
          hint={
            catalog.length
              ? `${Math.round((activeCount / catalog.length) * 100)} % du catalogue`
              : "Aucun service"
          }
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCard
          label="Réservations du mois"
          value={overview ? String(overview.appointments.value) : "—"}
          hint={
            overview?.appointments.changePercent != null
              ? `${formatPct(overview.appointments.changePercent)} vs mois préc.`
              : "Soins de la période"
          }
          icon={CalendarDays}
          tone="gold"
        />
        <KpiCard
          label="Chiffre d’affaires"
          value={financeHidden ? "—" : overview ? formatMad(overview.revenue.value) : "—"}
          hint={financeHidden ? "Accès limité" : "Mois en cours"}
          icon={Wallet}
          tone="primary"
        />
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFDEA4]/50 text-[#7B5900]">
            <Wallet size={16} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Panier moyen</p>
            <p className="text-[16px] font-bold text-ink">
              {financeHidden ? "—" : overview ? formatMad(overview.averageTicket.value) : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD9DE] text-primary">
            <Star size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Service n°1 ventes</p>
            <p className="truncate text-[16px] font-bold text-ink">
              {topByAppointments && topByAppointments.appointments > 0
                ? topByAppointments.serviceName
                : overview && overview.appointments.value > 0
                  ? "Aucun soin terminé ce mois"
                  : "Pas encore de RDV ce mois"}
              {topByAppointments && topByAppointments.appointments > 0 && !financeHidden ? (
                <span className="ml-1 text-[12px] font-normal text-ink/45">
                  ({topByAppointments.appointments} RDV • {formatMad(topByAppointments.revenue)})
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <TrendingUp size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Le plus rentable / heure</p>
            <p className="truncate text-[16px] font-bold text-ink">
              {topHourly ? topHourly.service.name : "—"}
              {topHourly && !financeHidden ? (
                <span className="ml-1 text-[12px] font-semibold text-emerald-800">
                  {formatMad(topHourly.rate)}/h
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        <FilterPill
          active={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          label="Tous"
          count={catalog.length}
        />
        <FilterPill
          active={activeFilter === "active"}
          onClick={() => setActiveFilter("active")}
          label="Actifs"
          count={activeCount}
        />
        <FilterPill
          active={activeFilter === "inactive"}
          onClick={() => setActiveFilter("inactive")}
          label="Inactifs"
          count={inactiveCount}
        />
      </div>

      <div className="flex flex-col gap-5">
        {!financeHidden && hourlyRanking.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[16px] font-bold text-ink">Matrice de rentabilité</h2>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Tarif / heure de soin</p>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                MAD / h
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {hourlyRanking.map(({ service, rate }) => (
                <div key={service.id}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="truncate font-semibold text-ink">{service.name}</span>
                    <span className="shrink-0 font-bold text-emerald-800">{formatMad(rate)}/h</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#FCE9F4]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxHourly ? Math.round((rate / maxHourly) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-[#FFEFF8] p-3">
              <Info size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-[12px] leading-5 text-ink/60">
                <strong className="text-ink">Impact agenda :</strong> modifier la durée d’une prestation recalcule
                les créneaux disponibles.
              </p>
            </div>
          </div>
        ) : null}

        {topByRevenue && !financeHidden ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7B5900]">Meilleur CA du mois</p>
              <h3 className="truncate text-[15px] font-bold text-ink">{topByRevenue.serviceName}</h3>
              <p className="text-[13px] text-ink/50">
                {topByRevenue.appointments} RDV • {formatMad(topByRevenue.revenue)}
              </p>
            </div>
            <Link
              href="/agenda/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FCE9F4] text-primary"
            >
              <CalendarDays size={18} />
            </Link>
          </div>
        ) : null}

        {loading ? (
          <p className="rounded-xl bg-white py-12 text-center text-sm text-ink/40 shadow-sm">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl bg-white py-12 text-center text-sm text-ink/45 shadow-sm">
            Aucun service trouvé.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                stats={statsById.get(s.id)}
                financeHidden={financeHidden}
                canWrite={canWrite}
                isBestSeller={topByAppointments?.serviceId === s.id && (topByAppointments?.appointments ?? 0) > 0}
                isTopHourly={topHourly?.service.id === s.id}
                menuOpen={menuId === s.id}
                onMenu={() => setMenuId(menuId === s.id ? null : s.id)}
                onEdit={() => void openEdit(s.id)}
                onToggle={() => void toggleActive(s)}
                onDelete={() => void confirmDelete(s)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-ink/35">
        Les tarifs et durées affichés sont ceux de votre catalogue. Aucune recommandation IA n’est appliquée sans
        votre action.
      </p>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier le service" : "Nouveau service"}
        side="right"
      >
        {options ? (
          <ServiceForm
            key={editing?.id ?? "new"}
            initial={editing ?? { active: true }}
            options={options}
            extraCategories={categories}
            canEditPrice={canPrice}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDrawerOpen(false);
              setEditing(null);
            }}
          />
        ) : (
          <p className="text-sm text-ink/50">Chargement…</p>
        )}
      </Drawer>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold shadow-sm",
          active ? "bg-primary text-white" : "bg-white text-ink",
        )}
    >
      <span>{label}</span>
      <span className={cn("rounded-full px-1.5 text-[11px]", active ? "bg-white/20" : "text-ink/40")}>{count}</span>
    </button>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Scissors;
  tone?: "ink" | "emerald" | "gold" | "primary";
}) {
  const box = {
    ink: "bg-[#FCE9F4] text-primary",
    emerald: "bg-emerald-50 text-emerald-700",
    gold: "bg-[#FFDEA4]/50 text-[#7B5900]",
    primary: "bg-[#FFD9DE] text-primary",
  };
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex items-start justify-between p-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
          <p
            className={cn(
              "mt-1 font-display text-[26px] font-bold leading-8",
              tone === "primary" ? "text-primary" : "text-ink",
            )}
          >
            {value}
          </p>
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", box[tone])}>
          <Icon size={20} />
        </span>
      </div>
      <div className="bg-[#FFEFF8] px-3 py-2 text-[12px] text-ink/50">{hint}</div>
    </div>
  );
}

function ServiceCard({
  service: s,
  stats,
  financeHidden,
  canWrite,
  isBestSeller,
  isTopHourly,
  menuOpen,
  onMenu,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: ServiceListItem;
  stats?: ServiceAnalyticsRow;
  financeHidden: boolean;
  canWrite: boolean;
  isBestSeller: boolean;
  isTopHourly: boolean;
  menuOpen: boolean;
  onMenu: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const Icon = categoryIcon(s.category);
  const hourly = hourlyRate(s.price, s.durationMin);
  const rdv = stats?.appointments ?? 0;
  const ca = stats?.revenue ?? 0;

  return (
    <article className="relative flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                s.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-ink/50",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", s.active ? "bg-emerald-600" : "bg-ink/30")} />
              {s.active ? "Actif" : "Inactif"}
            </span>
            {isBestSeller ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FCCA66] px-2 py-0.5 text-[11px] font-bold text-[#7B5900]">
                <Star size={12} />
                Best-seller
              </span>
            ) : null}
            {isTopHourly && !financeHidden ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4]/60 px-2 py-0.5 text-[11px] font-bold text-[#7B5900]">
                Rentabilité max
              </span>
            ) : null}
          </div>
          {canWrite ? (
            <div className="relative">
              <button
                type="button"
                aria-label="Options du service"
                onClick={onMenu}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/40 hover:bg-[#FCE9F4]"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-line bg-white py-1 text-left text-xs shadow-lg">
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#FFEFF8]" onClick={onEdit}>
                    Modifier
                  </button>
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#FFEFF8]" onClick={onToggle}>
                    {s.active ? "Désactiver" : "Réactiver"}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                    onClick={onDelete}
                  >
                    Supprimer
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFEFF8] text-primary">
            <Icon size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold leading-snug text-ink">{s.name}</h2>
            {s.category ? <p className="text-[12px] text-ink/45">{s.category}</p> : null}
            {s.description ? (
              <p className="mt-1 line-clamp-2 text-[13px] text-ink/50">{s.description}</p>
            ) : null}
          </div>
        </div>

        <div className="my-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFEFF8] px-2.5 py-1 text-[12px] font-semibold text-ink">
            {formatDuration(s.durationMin)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FCE9F4] px-2.5 py-1 text-[12px] font-bold text-primary">
            {formatMad(s.price)}
          </span>
          {rdv > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFEFF8] px-2.5 py-1 text-[12px] text-ink/55">
              {rdv} RDV ce mois
            </span>
          ) : null}
        </div>

        {!financeHidden ? (
          <div className="flex items-center justify-between rounded-lg bg-[#FFEFF8]/80 p-2.5 text-[13px]">
            <div>
              <span className="block text-[11px] font-bold uppercase text-ink/40">CA du mois</span>
              <span className="font-bold text-ink">{formatMad(ca)}</span>
            </div>
            <div className="text-right">
              <span className="block text-[11px] font-bold uppercase text-ink/40">Tarif / heure</span>
              <span className="font-bold text-emerald-800">{hourly != null ? `${formatMad(hourly)}/h` : "—"}</span>
            </div>
          </div>
        ) : null}

        {s.staffNames.length > 0 ? (
          <div className="mt-3 flex items-center gap-1.5 pt-1">
            <div className="flex -space-x-1.5">
              {s.staffNames.slice(0, 4).map((name) => (
                <span
                  key={name}
                  title={name}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-white"
                >
                  {staffInitials(name)}
                </span>
              ))}
            </div>
            <span className="truncate text-[11px] text-ink/50">{s.staffNames.join(", ")}</span>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-ink/40">Aucune employée rattachée</p>
        )}
      </div>

      {canWrite ? (
        <div className="mt-4 flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-[#FFEFF8] text-[13px] font-semibold text-ink"
          >
            <Pencil size={14} />
            Modifier
          </button>
        </div>
      ) : null}
    </article>
  );
}
