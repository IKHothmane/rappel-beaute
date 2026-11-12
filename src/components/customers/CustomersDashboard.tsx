"use client";
import { MetricCard } from "@/components/ui/metric-card";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export type CustomerStatus =
  | "active"
  | "new"
  | "inactive"
  | "followup"
  | "vip";

type CustomerAppointment = {
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
  createdAt?: string | null;
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

type DetailTab = "activity" | "profile";

const money = (value: number) =>
  `${new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: 2,
  }).format(value)} MAD`;

const dateLabel = (value?: string | null) => {
  if (!value) return "Jamais venue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const statusText: Record<CustomerStatus, string> = {
  active: "Active",
  new: "Nouvelle",
  inactive: "Inactive",
  followup: "À relancer",
  vip: "VIP",
};

const statusClass: Record<CustomerStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  new: "bg-pink-100 text-pink-700",
  inactive: "bg-slate-100 text-slate-600",
  followup: "bg-orange-100 text-orange-700",
  vip: "bg-amber-100 text-amber-800",
};

const cardClass =
  "rounded-[22px] border border-[#f0dce5] bg-white shadow-[0_6px_24px_rgba(80,17,47,0.045)]";

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color = "pink",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: "pink" | "green" | "orange" | "purple";
}) {
  return <MetricCard title={label} value={value} icon={icon} hint={subtitle}></MetricCard>;
}

function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffe5ef] to-[#f9c3d9] font-bold text-[#a80049] ${
        large ? "h-16 w-16 text-2xl" : "h-10 w-10 text-xs"
      }`}
    >
      {initials(name)}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "light",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "light" | "primary" | "green";
}) {
  const styles = {
    light: "border border-[#ecd9e2] bg-white text-[#54112f] hover:bg-[#fff1f7]",
    primary: "bg-[#ae004b] text-white hover:bg-[#880039]",
    green: "bg-[#07975b] text-white hover:bg-[#087848]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]}`}
    >
      {children}
    </button>
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
  selectedId,
  onSelectCustomer,
  page,
  pageSize = 10,
  totalPages,
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
  canCreate = false,
}: Props) {
  const [localSearch, setLocalSearch] = useState("");
  const [localFilter, setLocalFilter] = useState<CustomerFilter>("all");
  const [localPage, setLocalPage] = useState(1);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("activity");

  const search = searchValue ?? localSearch;
  const filter = filterValue ?? localFilter;
  const currentPage = page ?? localPage;

  const setSearch = (value: string) => {
    if (onSearchChange) onSearchChange(value);
    else setLocalSearch(value);
    if (!serverControlled) setLocalPage(1);
  };

  const setFilter = (value: CustomerFilter) => {
    if (onFilterChange) onFilterChange(value);
    else setLocalFilter(value);
    if (!serverControlled) setLocalPage(1);
  };

  const setPage = (value: number) => {
    if (onPageChange) onPageChange(value);
    else setLocalPage(value);
  };

  const selectCustomer = (customer: Customer | null) => {
    if (onSelectCustomer) onSelectCustomer(customer);
    else setLocalSelectedId(customer?.id ?? null);
    setDetailTab("activity");
  };

  const selectedKey = selectedId !== undefined ? selectedId : localSelectedId;

  const filtered = useMemo(() => {
    if (serverControlled) return customers;

    const q = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !q ||
        [customer.name, customer.phone, customer.email].some((value) =>
          (value ?? "").toLowerCase().includes(q),
        );

      const matchesFilter =
        filter === "all" ||
        (filter === "followup" ? customer.status === "followup" : customer.status === filter);

      return matchesSearch && matchesFilter;
    });
  }, [customers, search, filter, serverControlled]);

  const sorted = useMemo(() => {
    const rows = [...filtered];

      rows.sort((a, b) =>
        (b.createdAt ?? b.lastVisit ?? "").localeCompare(a.createdAt ?? a.lastVisit ?? ""),
      );

    return rows;
  }, [filtered]);

  const count = totalResults ?? filtered.length;

  const pages = serverControlled
    ? Math.max(1, totalPages ?? 1)
    : Math.max(1, Math.ceil(sorted.length / pageSize));

  const visible = serverControlled
    ? sorted
    : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selected =
    customers.find((c) => c.id === selectedKey) ??
    (selectedKey === null ? null : customers[0] ?? null);

  useEffect(() => {
    if (!serverControlled && !selectedKey && customers.length) {
      setLocalSelectedId(customers[0]!.id);
    }
  }, [customers, selectedKey, serverControlled]);

  const getCount = (key: CustomerFilter) => {
    if (filterCounts?.[key] !== undefined) {
      return filterCounts[key]!;
    }
    if (key === "all") return customers.length;
    return customers.filter((c) => c.status === key).length;
  };

  const totalCustomers = getCount("all");
  const newCustomers = newCustomersCount ?? getCount("new");

  const tabs: {
    id: CustomerFilter;
    label: string;
  }[] = [
    { id: "all", label: "Toutes" },
    { id: "active", label: "Actives" },
    { id: "followup", label: "À relancer" },
    { id: "vip", label: "VIP" },
    { id: "new", label: "Nouvelles" },
  ];

  return (
    <div className="w-full min-w-0 space-y-5 text-[#390c22]">
      <header
        className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Gestion des clientes
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Retrouvez, fidélisez et accompagnez vos clientes depuis un seul espace.
          </p>
        </div>

        {canCreate && onCreateCustomer ? (
          <button
            type="button"
            onClick={onCreateCustomer}
            className="relative z-10 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#A40E49] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#801035]"
          >
            <Plus size={18} aria-hidden />
            Nouvelle cliente
          </button>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 rb-metric-row">
        <StatCard
          icon={<Users size={20} aria-hidden />}
          label="Total clientes"
          value={totalCustomers}
          subtitle="Dans votre répertoire"
        />
        <StatCard
          icon={<Sparkles size={20} aria-hidden />}
          label="Nouvelles"
          value={newCustomers}
          color="purple"
          subtitle="Nouvelles clientes"
        />
        <StatCard
          icon={<Heart size={20} aria-hidden />}
          label="Actives"
          value={getCount("active")}
          color="green"
          subtitle="Clientes régulières"
        />
        <StatCard
          icon={<RefreshCw size={20} aria-hidden />}
          label="À relancer"
          value={getCount("followup")}
          color="orange"
          subtitle="Suivi recommandé"
        />
        {monthlyRevenue !== undefined ? (
          <StatCard
            icon={<TrendingUp size={20} aria-hidden />}
            label="CA du mois"
            value={money(monthlyRevenue)}
          />
        ) : null}
        {averageBasket !== undefined ? (
          <StatCard
            icon={<Wallet size={20} aria-hidden />}
            label="Panier moyen"
            value={money(averageBasket)}
            color="orange"
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-[220px] xl:w-80 xl:shrink-0">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b50050]"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher nom, téléphone, e-mail..."
              className="h-12 w-full rounded-2xl border border-[#efdce5] bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b39aa5] focus:border-[#c72b70] focus:ring-2 focus:ring-pink-100"
            />
          </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                filter === tab.id
                  ? "border-[#ae004b] bg-[#ae004b] text-white shadow-md"
                  : "border-[#efdce5] bg-white text-[#54112f] hover:bg-pink-50"
              }`}
            >
              {tab.label} ({getCount(tab.id)})
            </button>
          ))}
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <div className={`${cardClass} min-w-0 overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 border-b border-[#f4e5ec] px-5 py-5">
            <div>
              <h2 className="text-base font-extrabold">Liste des clientes</h2>
              <p className="mt-1 text-xs text-[#a18793]">{count} résultat(s)</p>
            </div>
            <button
              type="button"
              onClick={() => void onRefresh?.()}
              disabled={!onRefresh || loading}
              title="Actualiser"
              className="rounded-xl p-2 text-[#ae004b] transition hover:bg-pink-50 disabled:opacity-40"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden />
            </button>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[690px] border-collapse text-left">
              <thead className="bg-[#fff1f7] text-[10px] font-bold uppercase tracking-wide text-[#94677a]">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-3 py-3">Dernière visite</th>
                  <th className="px-3 py-3 text-center">Visites</th>
                  {monthlyRevenue !== undefined ? <th className="px-3 py-3">CA cumulé</th> : null}
                  <th className="px-3 py-3">Statut</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((customer) => {
                  const isSelected = selected?.id === customer.id;

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className={`cursor-pointer border-b border-[#f8edf1] transition hover:bg-[#fff3f8] ${
                        isSelected ? "bg-[#fce4ee]" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={customer.name} />
                          <div className="min-w-0">
                            <div className="max-w-[180px] truncate text-xs font-bold">
                              {customer.name}
                            </div>
                            <div className="mt-1 text-[11px] text-[#997f8b]">
                              {customer.phone || "Sans téléphone"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-medium">{dateLabel(customer.lastVisit)}</p>
                        <p className="mt-1 text-[10px] text-[#a58b97]">
                          {customer.lastVisit ? "Dernière prestation" : "Aucune visite"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center text-xs font-semibold">
                        {customer.visits}
                      </td>
                      {monthlyRevenue !== undefined ? (
                        <td className="px-3 py-3 text-xs font-bold">{money(customer.totalSpent)}</td>
                      ) : null}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold ${statusClass[customer.status]}`}
                        >
                          {statusText[customer.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && visible.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                <Users size={30} className="text-[#d79bb4]" aria-hidden />
                <p className="mt-3 text-sm font-semibold">Aucune cliente trouvée</p>
                <p className="mt-1 text-xs text-[#a18793]">
                  Modifiez votre recherche ou vos filtres.
                </p>
              </div>
            ) : null}

            {loading && visible.length === 0 ? (
              <div className="py-20 text-center text-sm text-[#a18793]">
                Chargement des clientes...
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <span className="text-xs text-[#a18793]">
              {count === 0
                ? "0 résultat"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, count)} sur ${count}`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="rounded-lg border border-[#efdce5] p-2 disabled:opacity-30"
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span className="rounded-lg bg-[#ae004b] px-3 py-2 text-xs font-bold text-white">
                {currentPage} / {pages}
              </span>
              <button
                type="button"
                disabled={currentPage >= pages}
                onClick={() => setPage(currentPage + 1)}
                className="rounded-lg border border-[#efdce5] p-2 disabled:opacity-30"
                aria-label="Page suivante"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <aside className={`${cardClass} min-w-0 overflow-hidden lg:sticky lg:top-5`}>
          {selected ? (
            <>
              <div className="bg-gradient-to-b from-[#fff5f9] to-white p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={selected.name} large />

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-serif text-2xl font-bold">{selected.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusClass[selected.status]}`}
                      >
                        {statusText[selected.status]}
                      </span>
                      {selected.phone ? (
                        <span className="flex items-center gap-1 text-xs text-[#805768]">
                          <Phone size={12} aria-hidden />
                          {selected.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!onEditCustomer}
                    onClick={() => onEditCustomer?.(selected)}
                    className="rounded-lg p-2 text-[#ae004b] hover:bg-pink-100 disabled:opacity-40"
                    title="Modifier"
                  >
                    <Pencil size={17} aria-hidden />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ActionButton
                    variant="primary"
                    onClick={() => onNewAppointment?.(selected)}
                  >
                    <CalendarDays size={15} aria-hidden />
                    Nouveau RDV
                  </ActionButton>

                  <ActionButton
                    variant="green"
                    disabled={!selected.phone}
                    onClick={selected.phone ? () => onWhatsApp?.(selected) : undefined}
                  >
                    <MessageCircle size={15} aria-hidden />
                    WhatsApp
                  </ActionButton>

                  <ActionButton onClick={() => onPayment?.(selected)}>
                    <CreditCard size={15} aria-hidden />
                    Encaisser
                  </ActionButton>
                </div>
              </div>

              <div className="grid grid-cols-2 border-y border-[#f4e4eb] bg-[#fffafd]">
                {(
                  [
                    ["activity", "Activité"],
                    ["profile", "Profil"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDetailTab(key)}
                    className={`border-b-2 px-1 py-4 text-xs font-semibold transition ${
                      detailTab === key
                        ? "border-[#ae004b] text-[#ae004b]"
                        : "border-transparent text-[#826575] hover:text-[#ae004b]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="min-h-64 p-5">
                {detailTab === "activity" ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <MiniMetric
                        icon={<CalendarDays size={17} aria-hidden />}
                        label="Visites"
                        value={String(selected.visits)}
                      />
                      {monthlyRevenue !== undefined ? (
                        <MiniMetric
                          icon={<Wallet size={17} aria-hidden />}
                          label="Dépenses"
                          value={money(selected.totalSpent)}
                        />
                      ) : null}
                      <MiniMetric
                        icon={<Clock3 size={17} aria-hidden />}
                        label="Dernière visite"
                        value={dateLabel(selected.lastVisit)}
                      />
                    </div>

                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
                        <Clock3 size={17} className="text-[#ae004b]" aria-hidden />
                        Historique des prestations
                      </h3>

                      {selected.appointments?.length ? (
                        <div className="space-y-2">
                          {selected.appointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-[#f2dfe8] bg-[#fff8fb] p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold">{appointment.service}</p>
                                <p className="mt-1 text-[11px] text-[#9a7b8a]">
                                  {dateLabel(appointment.date)}
                                </p>
                                <p className="mt-1 text-[10px] text-[#ae004b]">{appointment.status}</p>
                              </div>
                              {monthlyRevenue !== undefined ? (
                                <strong className="shrink-0 text-xs">{money(appointment.amount)}</strong>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyMessage text="Aucune prestation dans l’historique chargé." />
                      )}
                    </div>
                  </div>
                ) : null}

                {detailTab === "profile" ? (
                  <div className="space-y-3">
                    <ProfileField
                      icon={<Users size={16} aria-hidden />}
                      label="Nom complet"
                      value={selected.name}
                    />
                    <ProfileField
                      icon={<Phone size={16} aria-hidden />}
                      label="Téléphone"
                      value={selected.phone || "Non renseigné"}
                    />
                    <ProfileField
                      icon={<Mail size={16} aria-hidden />}
                      label="E-mail"
                      value={selected.email || "Non renseigné"}
                    />
                    <ProfileField
                      icon={<Star size={16} aria-hidden />}
                      label="Statut"
                      value={statusText[selected.status]}
                    />
                    <ActionButton onClick={() => onEditCustomer?.(selected)}>
                      <Pencil size={15} aria-hidden />
                      Modifier la fiche
                    </ActionButton>
                  </div>
                ) : null}

              </div>
            </>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <Users size={32} className="text-[#d99bb5]" aria-hidden />
              <h3 className="mt-3 font-bold">Fiche cliente</h3>
              <p className="mt-2 text-xs text-[#a18793]">
                Sélectionnez une cliente pour consulter son profil.
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-[#fff0f6] p-3">
      <div className="flex items-center gap-2 text-[#ae004b]">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-extrabold">{value}</p>
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#fff6fa] p-3">
      <span className="text-[#ae004b]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-[#9a7b8a]">{label}</p>
        <p className="break-words text-xs font-semibold">{value}</p>
      </div>
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#edcfdd] bg-[#fff9fb] p-6 text-center text-xs text-[#9a7b8a]">
      {text}
    </div>
  );
}
