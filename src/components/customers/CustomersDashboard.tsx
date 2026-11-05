"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Users,
  Search,
  SlidersHorizontal,
  CalendarDays,
  MessageCircle,
  Wallet,
  Heart,
  Clock3,
  Sparkles,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  Star,
  Gift,
  StickyNote,
  Receipt,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";

export type CustomerStatus =
  | "active"
  | "new"
  | "inactive"
  | "followup"
  | "vip";

export type CustomerAppointment = {
  id: string;
  service: string;
  date: string;
  amount: number;
  status: string;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: CustomerStatus;
  lastVisit?: string | null;
  visits: number;
  totalSpent: number;
  loyaltyPoints: number;
  appointments?: CustomerAppointment[];
  notes?: string[];
};

export type CustomerFilter =
  | "all"
  | "active"
  | "followup"
  | "vip"
  | "new";

type ProfileTab = "activity" | "loyalty" | "notes";

const DEFAULT_PAGE_SIZE = 8;

type Props = {
  customers: Customer[];
  monthlyRevenue?: number;
  averageBasket?: number;
  newCustomersCount?: number;
  filterCounts?: Partial<Record<CustomerFilter, number>>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterValue?: CustomerFilter;
  onFilterChange?: (filter: CustomerFilter) => void;
  selectedId?: string | null;
  onSelectCustomer?: (customer: Customer | null) => void;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalResults?: number;
  onPageChange?: (page: number) => void;
  serverControlled?: boolean;
  onCreateCustomer?: () => void;
  onEditCustomer?: (customer: Customer) => void;
  onNewAppointment?: (customer: Customer) => void;
  onPayment?: (customer: Customer) => void;
  onWhatsApp?: (customer: Customer) => void;
  onRefresh?: () => void | Promise<void>;
  loading?: boolean;
  canCreate?: boolean;
};

const mad = (value?: number | null) => {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return (
    new Intl.NumberFormat("fr-MA", {
      maximumFractionDigits: 2,
    }).format(amount) + " MAD"
  );
};

const dateText = (value?: string | null) => {
  if (!value) return "Jamais venue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const relativeVisit = (value?: string | null) => {
  if (!value) return "Aucune visite";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Aujourd’hui";
  if (days === 1) return "Hier";
  return `Il y a ${days} j`;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const statusLabels: Record<CustomerStatus, string> = {
  active: "Active",
  new: "Nouvelle",
  inactive: "Inactive",
  followup: "À relancer",
  vip: "VIP",
};

const statusStyles: Record<CustomerStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  new: "bg-pink-50 text-pink-700",
  inactive: "bg-slate-100 text-slate-600",
  followup: "bg-orange-50 text-orange-700",
  vip: "bg-amber-50 text-amber-700",
};

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "pink",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: ElementType;
  tone?: "pink" | "green" | "orange" | "gold";
}) {
  const tones = {
    pink: "bg-pink-50 text-[#B50D52]",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    gold: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-[#F2E3EB] bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className={`rounded-xl p-2 ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3 break-words text-2xl font-extrabold tracking-tight text-[#351526]">{value}</div>
      {subtitle ? <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status?: CustomerStatus | null }) {
  const key: CustomerStatus = status && status in statusLabels ? status : "active";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[key]}`}>
      {statusLabels[key]}
    </span>
  );
}

export default function CustomersDashboard({
  customers,
  monthlyRevenue,
  averageBasket,
  newCustomersCount,
  filterCounts,
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  selectedId: selectedIdProp,
  onSelectCustomer,
  page: pageProp,
  pageSize = DEFAULT_PAGE_SIZE,
  totalPages: totalPagesProp,
  totalResults,
  onPageChange,
  serverControlled = false,
  onCreateCustomer,
  onEditCustomer,
  onNewAppointment,
  onPayment,
  onWhatsApp,
  onRefresh,
  loading = false,
  canCreate = true,
}: Props) {
  const [searchLocal, setSearchLocal] = useState("");
  const [filterLocal, setFilterLocal] = useState<CustomerFilter>("all");
  const [selectedIdLocal, setSelectedIdLocal] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>("activity");
  const [pageLocal, setPageLocal] = useState(1);
  const [sort, setSort] = useState<"name" | "recent" | "spent">("name");
  const [showFilters, setShowFilters] = useState(false);

  const search = searchValue ?? searchLocal;
  const filter = filterValue ?? filterLocal;
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : selectedIdLocal;
  const page = pageProp ?? pageLocal;

  const setSearch = (value: string) => {
    onSearchChange?.(value);
    if (searchValue === undefined) setSearchLocal(value);
  };

  const setFilter = (value: CustomerFilter) => {
    onFilterChange?.(value);
    if (filterValue === undefined) setFilterLocal(value);
  };

  const setSelectedId = (value: string | null) => {
    if (selectedIdProp === undefined) setSelectedIdLocal(value);
    if (value == null) {
      onSelectCustomer?.(null);
      return;
    }
    const customer = customers.find((c) => c.id === value) ?? null;
    if (customer) onSelectCustomer?.(customer);
  };

  const setPage = (value: number | ((current: number) => number)) => {
    const next = typeof value === "function" ? value(page) : value;
    onPageChange?.(next);
    if (pageProp === undefined) setPageLocal(next);
  };

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  const counts = useMemo(
    () => ({
      all: filterCounts?.all ?? customers.length,
      active:
        filterCounts?.active ??
        customers.filter((c) => c.status === "active" || c.status === "vip").length,
      followup: filterCounts?.followup ?? customers.filter((c) => c.status === "followup").length,
      vip: filterCounts?.vip ?? customers.filter((c) => c.status === "vip").length,
      new: filterCounts?.new ?? customers.filter((c) => c.status === "new").length,
    }),
    [customers, filterCounts],
  );

  const filtered = useMemo(() => {
    if (serverControlled) return customers;

    const query = search.trim().toLocaleLowerCase();

    return customers
      .filter((c) => {
        const matchesSearch =
          !query ||
          [c.name, c.phone, c.email].some((value) => value?.toLocaleLowerCase().includes(query));

        const matchesFilter =
          filter === "all" ||
          (filter === "active" ? c.status === "active" || c.status === "vip" : c.status === filter);

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sort === "spent") return b.totalSpent - a.totalSpent;
        if (sort === "recent") {
          return (
            (b.lastVisit ? new Date(b.lastVisit).getTime() : 0) -
            (a.lastVisit ? new Date(a.lastVisit).getTime() : 0)
          );
        }
        return a.name.localeCompare(b.name, "fr");
      });
  }, [customers, search, filter, sort, serverControlled]);

  const totalPages = Math.max(
    1,
    totalPagesProp ?? Math.ceil(filtered.length / pageSize),
  );
  const resultCount = totalResults ?? filtered.length;
  const visible = serverControlled
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!serverControlled) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset page only when local filters change
  }, [search, filter, sort, serverControlled]);

  useEffect(() => {
    if (serverControlled) return;
    setPage((current) => Math.min(current, totalPages));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, serverControlled]);

  function selectCustomer(customer: Customer) {
    setSelectedId(customer.id);
    setTab("activity");
  }

  const filterOptions: { id: CustomerFilter; label: string }[] = [
    { id: "all", label: "Toutes" },
    { id: "active", label: "Actives" },
    { id: "followup", label: "À relancer" },
    { id: "vip", label: "VIP" },
    { id: "new", label: "Nouvelles" },
  ];

  const rangeFrom = resultCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, resultCount);

  return (
    <div className="space-y-5 text-[#351526]">
      <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#691035] via-[#A01852] to-[#D34183] p-6 text-white shadow-lg lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border-[35px] border-white/10" />
        <div className="pointer-events-none absolute bottom-0 right-32 h-28 w-28 rounded-full bg-pink-300/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-pink-100">
            <Sparkles size={15} />
            Gestion de la relation cliente
          </div>
          <h1 className="mt-3 text-3xl font-extrabold lg:text-4xl">Gestion des clientes</h1>
          <p className="mt-2 max-w-xl text-sm text-pink-100">
            Retrouvez, fidélisez et accompagnez vos clientes depuis un seul espace.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total clientes" value={counts.all} icon={Users} />
        <StatCard label="Nouvelles" value={newCustomersCount ?? counts.new} icon={Sparkles} />
        <StatCard label="Actives" value={counts.active} icon={Heart} tone="green" />
        <StatCard label="À relancer" value={counts.followup} icon={Clock3} tone="orange" />
        <StatCard
          label="CA du mois"
          value={monthlyRevenue === undefined ? "—" : mad(monthlyRevenue)}
          icon={TrendingUp}
          tone="gold"
        />
        <StatCard
          label="Panier moyen"
          value={averageBasket === undefined ? "—" : mad(averageBasket)}
          icon={Wallet}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-2xl border border-[#EEDDE5] bg-white px-4 shadow-sm">
          <Search size={19} className="text-[#B90E54]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, téléphone, e-mail..."
            aria-label="Rechercher une cliente"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} aria-label="Effacer la recherche">
              <X size={16} className="text-slate-400" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="flex h-12 items-center gap-2 rounded-xl border border-[#EEDDE5] bg-white px-4 text-sm font-semibold hover:bg-pink-50"
        >
          <SlidersHorizontal size={17} />
          Filtres
        </button>

        {canCreate ? (
          <button
            type="button"
            onClick={onCreateCustomer}
            disabled={!onCreateCustomer}
            className="flex h-12 items-center gap-2 rounded-xl bg-[#B60050] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#91003F] disabled:opacity-50"
          >
            <Plus size={18} />
            Nouvelle cliente
          </button>
        ) : null}
      </div>

      {showFilters ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">
          {!serverControlled ? (
            <>
              <label htmlFor="customer-sort" className="text-sm font-medium">
                Trier par
              </label>
              <select
                id="customer-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-lg border border-pink-100 px-3 py-2 text-sm"
              >
                <option value="name">Nom A–Z</option>
                <option value="recent">Dernière visite</option>
                <option value="spent">Dépenses cumulées</option>
              </select>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => void onRefresh?.()}
            disabled={!onRefresh || loading}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Actualiser
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={active}
              className={`rounded-full px-4 py-2.5 text-xs font-bold transition ${
                active
                  ? "bg-gradient-to-r from-[#9B0B43] to-[#D51B70] text-white shadow-md"
                  : "border border-[#F1DDE7] bg-white text-[#69344D] hover:bg-pink-50"
              }`}
            >
              {item.label} ({counts[item.id]})
            </button>
          );
        })}
      </div>

      <div
        className={`grid items-start gap-4 ${
          selected ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]" : "grid-cols-1"
        }`}
      >
        <section className="min-w-0 overflow-hidden rounded-[22px] border border-[#F0DFE8] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1E8ED] p-5">
            <div>
              <h2 className="text-lg font-extrabold">Liste des clientes</h2>
              <p className="mt-1 text-xs text-slate-400">{resultCount} résultat(s)</p>
            </div>
            <button
              type="button"
              onClick={() => void onRefresh?.()}
              disabled={!onRefresh || loading}
              aria-label="Actualiser les clientes"
              className="rounded-lg p-2 text-[#B60050] hover:bg-pink-50 disabled:opacity-40"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-[#FFF4F9] text-[11px] uppercase tracking-wide text-[#926A7E]">
                <tr>
                  <th className="px-5 py-4">Cliente</th>
                  <th className="px-3 py-4">Dernière visite</th>
                  <th className="px-3 py-4">Visites</th>
                  <th className="px-3 py-4">CA cumulé</th>
                  <th className="px-3 py-4">Statut</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((customer) => {
                  const active = selectedId === customer.id;
                  const visits = Number(customer.visits) || 0;
                  const spent = Number(customer.totalSpent) || 0;

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className={`cursor-pointer border-t border-[#F7EDF2] transition ${
                        active ? "bg-[#FCE5EF]" : "hover:bg-[#FFF7FA]"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCE0EC] text-xs font-extrabold text-[#B60050]">
                            {initials(customer.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{customer.name}</p>
                            <p className="text-xs text-slate-400">{customer.phone || "Sans téléphone"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <p className="text-sm font-medium text-slate-700">{dateText(customer.lastVisit)}</p>
                        <p className="text-[11px] text-slate-400">{relativeVisit(customer.lastVisit)}</p>
                      </td>
                      <td className="px-3 py-3 text-sm font-medium">{visits}</td>
                      <td className="px-3 py-3 text-sm font-bold">{mad(spent)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={customer.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <Users size={36} className="text-pink-300" />
              <p className="font-bold">Aucune cliente trouvée</p>
              <p className="text-sm text-slate-400">Essayez une autre recherche ou un autre filtre.</p>
            </div>
          ) : null}

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500" role="status">
              Chargement des clientes...
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F1E8ED] p-4">
            <p className="text-xs text-slate-400">
              {resultCount === 0
                ? "0 résultat"
                : `${rangeFrom}–${Math.min(rangeTo, resultCount)} sur ${resultCount}`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Page précédente"
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="rounded-lg bg-[#B60050] px-3 py-2 text-xs font-bold text-white">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Page suivante"
                className="rounded-lg border p-2 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {selected ? (
          <aside className="min-w-0 overflow-hidden rounded-[22px] border border-[#F0DFE8] bg-white shadow-sm xl:sticky xl:top-5">
            <div className="bg-gradient-to-br from-[#FFF0F7] to-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F9CDE1] text-xl font-extrabold text-[#A60949]">
                  {initials(selected.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-lg font-extrabold">{selected.name}</h2>
                  <div className="mt-2">
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <Phone size={12} />
                    {selected.phone || "Sans téléphone"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Fermer la fiche cliente"
                  className="rounded-lg p-2 hover:bg-pink-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!onNewAppointment}
                  onClick={() => onNewAppointment?.(selected)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#B60050] px-3 py-3 text-xs font-bold text-white disabled:opacity-40"
                >
                  <CalendarDays size={15} />
                  Nouveau RDV
                </button>
                <button
                  type="button"
                  disabled={!onWhatsApp || !selected.phone}
                  onClick={() => onWhatsApp?.(selected)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#079A62] px-3 py-3 text-xs font-bold text-white disabled:opacity-40"
                >
                  <MessageCircle size={15} />
                  WhatsApp
                </button>
                <button
                  type="button"
                  disabled={!onPayment}
                  onClick={() => onPayment?.(selected)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-pink-100 bg-white px-3 py-3 text-xs font-bold disabled:opacity-40"
                >
                  <Wallet size={15} />
                  Encaisser
                </button>
                <button
                  type="button"
                  disabled={!onEditCustomer}
                  onClick={() => onEditCustomer?.(selected)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-pink-100 bg-white px-3 py-3 text-xs font-bold disabled:opacity-40"
                >
                  <MoreHorizontal size={15} />
                  Modifier
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { label: "Visites", value: selected.visits, icon: CalendarDays },
                { label: "Dépenses", value: mad(selected.totalSpent), icon: Wallet },
                { label: "Points fidélité", value: selected.loyaltyPoints, icon: Gift },
                { label: "Dernière visite", value: dateText(selected.lastVisit), icon: Clock3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl bg-[#FFF1F7] p-3">
                    <div className="flex items-center gap-2 text-[11px] text-[#926A7E]">
                      <Icon size={13} />
                      {item.label}
                    </div>
                    <p className="mt-2 break-words text-sm font-extrabold">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-1 border-y border-[#F1E8ED] p-2">
              {(
                [
                  { id: "activity", label: "Activité", icon: CalendarDays },
                  { id: "loyalty", label: "Fidélité", icon: Gift },
                  { id: "notes", label: "Notes", icon: StickyNote },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={tab === item.id}
                    className={`flex items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs font-bold ${
                      tab === item.id ? "bg-[#FCE4EF] text-[#B60050]" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="min-h-[250px] p-5">
              {tab === "activity" ? (
                <div className="space-y-3">
                  <h3 className="font-bold">Historique des prestations</h3>

                  {selected.appointments?.length ? (
                    selected.appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[#F3E5EC] bg-[#FFFAFC] p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Receipt size={17} className="mt-0.5 text-[#B60050]" />
                          <div>
                            <p className="text-sm font-bold">{appointment.service}</p>
                            <p className="text-xs text-slate-400">{dateText(appointment.date)}</p>
                            <p className="mt-1 text-xs text-slate-500">{appointment.status}</p>
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-xs font-bold">{mad(appointment.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400">Aucun rendez-vous enregistré.</p>
                  )}
                </div>
              ) : null}

              {tab === "loyalty" ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-r from-[#831343] to-[#C72D72] p-5 text-white">
                    <div className="flex items-center gap-2 text-sm">
                      <Star size={18} />
                      Programme fidélité
                    </div>
                    <p className="mt-3 text-3xl font-extrabold">{selected.loyaltyPoints}</p>
                    <p className="text-xs text-pink-100">Points disponibles</p>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    Consultez le module Fidélité pour les passages, récompenses et conditions du programme.
                  </p>
                </div>
              ) : null}

              {tab === "notes" ? (
                <div className="space-y-3">
                  <h3 className="font-bold">Notes internes</h3>
                  {selected.notes?.length ? (
                    selected.notes.map((note, index) => (
                      <div
                        key={`${selected.id}-note-${index}`}
                        className="rounded-xl bg-[#FFF4F9] p-4 text-sm text-[#593348]"
                      >
                        {note}
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400">Aucune note enregistrée.</p>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
