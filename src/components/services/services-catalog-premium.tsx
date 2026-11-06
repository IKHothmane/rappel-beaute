"use client";

import { useMemo, useState, type ElementType } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Scissors,
  CalendarDays,
  Wallet,
  Clock3,
  Pencil,
  MoreHorizontal,
  CheckCircle2,
  Layers3,
  TrendingUp,
  ShoppingBasket,
  Trophy,
  ImagePlus,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ServiceResponsiveImage } from "@/components/services/service-responsive-image";
import type { ServiceListItem } from "@/types/service";

export type ServiceWithImage = ServiceListItem & {
  imageUrl?: string | null;
};

type Filter = "all" | "active" | "inactive";

type Props = {
  services: ServiceWithImage[];
  loading?: boolean;
  canWrite?: boolean;
  monthlyAppointments?: number;
  monthlyRevenue?: number;
  averageBasket?: number;
  bestSellerName?: string | null;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void | Promise<void>;
};

const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: 2,
  }).format(value) + " MAD";

function durationText(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  detail?: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-[#F3E0EA] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[#74566A]">{title}</p>
        <div className="rounded-xl bg-[#FCE7F1] p-2.5 text-[#BA165B]">
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-3 break-words text-xl font-extrabold tracking-tight text-[#351326]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[#977A8C]">{detail}</p> : null}
    </div>
  );
}

function ServicePhoto({
  service,
  className = "",
}: {
  service: ServiceWithImage;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#FDE7F0] to-[#F7C5DA] ${className}`}>
      {service.imageUrl && !failed ? (
        <ServiceResponsiveImage
          imageUrl={service.imageUrl}
          alt={`Photo de ${service.name}`}
          variant="thumb"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#B83E72]">
          <Scissors size={34} strokeWidth={1.5} />
          <span className="px-3 text-center text-xs font-semibold">{service.category || "Prestation"}</span>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  canWrite,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: ServiceWithImage;
  canWrite: boolean;
  onEdit: (id: string) => void;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-[#F0DDE7] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(109,22,61,0.12)]">
      <ServicePhoto
        key={`${service.id}-${service.imageUrl ?? ""}`}
        service={service}
        className="aspect-[4/3] w-full"
      />

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                service.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              <CheckCircle2 size={12} />
              {service.active ? "Actif" : "Inactif"}
            </span>

            <h3 className="mt-3 text-lg font-extrabold text-[#351326]">{service.name}</h3>

            <p className="mt-1 text-xs font-semibold text-[#B83E72]">{service.category || "Sans catégorie"}</p>
          </div>

          {canWrite ? (
            <div className="relative">
              <button
                type="button"
                aria-label={`Options de ${service.name}`}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-2 text-[#81576C] hover:bg-[#FFF0F7]"
              >
                <MoreHorizontal size={19} />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#EFD9E5] bg-white p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(service.id);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-pink-50"
                  >
                    Modifier le service
                  </button>

                  {onToggle ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onToggle(service.id);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-pink-50"
                    >
                      {service.active ? "Désactiver" : "Réactiver"}
                    </button>
                  ) : null}

                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(service.id);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-2 min-h-[40px] text-sm leading-5 text-[#816579]">
          {service.description || "Aucune description pour cette prestation."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF1F7] px-3 py-2 text-xs font-semibold text-[#62344A]">
            <Clock3 size={14} />
            {durationText(service.durationMin)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FCE1ED] px-3 py-2 text-xs font-extrabold text-[#B60050]">
            <Wallet size={14} />
            {money(service.price)}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-[#F6EAF0] pt-4">
          <div className="flex -space-x-2">
            {service.staffNames.slice(0, 4).map((name, index) => (
              <span
                key={`${name}-${index}`}
                title={name}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#B60050] text-[10px] font-bold text-white"
              >
                {initials(name)}
              </span>
            ))}
          </div>

          <p className="min-w-0 flex-1 truncate text-xs text-[#806579]">
            {service.staffNames.length ? service.staffNames.join(", ") : "Aucune employée associée"}
          </p>
        </div>

        {canWrite ? (
          <button
            type="button"
            onClick={() => onEdit(service.id)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FCE7F1] px-4 py-3 text-sm font-bold text-[#9D164B] transition hover:bg-[#F7D1E2]"
          >
            <Pencil size={15} />
            Modifier le service
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function ServicesCatalogPremium({
  services,
  loading = false,
  canWrite = false,
  monthlyAppointments,
  monthlyRevenue,
  averageBasket,
  bestSellerName,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
  onRefresh,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () =>
      [
        ...new Set(services.map((s) => s.category).filter((value): value is string => Boolean(value))),
      ].sort((a, b) => a.localeCompare(b, "fr")),
    [services],
  );

  const activeCount = services.filter((s) => s.active).length;

  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("fr");

    const result = services.filter((service) => {
      const matchesText =
        !text ||
        [service.name, service.category, service.description].some((value) =>
          value?.toLocaleLowerCase("fr").includes(text),
        );

      const matchesStatus =
        filter === "all" || (filter === "active" ? service.active : !service.active);

      const matchesCategory = category === "all" || service.category === category;

      return matchesText && matchesStatus && matchesCategory;
    });

    return result.sort((a, b) => {
      if (sort === "priceAsc") return a.price - b.price;
      if (sort === "priceDesc") return b.price - a.price;
      if (sort === "duration") return a.durationMin - b.durationMin;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [services, query, filter, category, sort]);

  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#681133] via-[#A01852] to-[#C73577] px-6 py-8 text-white shadow-[0_15px_40px_rgba(111,19,59,0.16)] lg:px-9">
        <div className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full border-[42px] border-white/10" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pink-200">
              <Scissors size={15} />
              Catalogue de prestations
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight lg:text-4xl">Services & Prestations</h1>
            <p className="mt-2 max-w-xl text-sm text-pink-100">
              Gérez vos soins, vos tarifs et les photos de vos prestations depuis un seul espace.
            </p>
          </div>

          {canWrite ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#A01852] shadow-lg transition hover:-translate-y-0.5 hover:bg-pink-50"
            >
              <Plus size={18} />
              Nouveau service
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-2xl border border-[#EFDFE7] bg-white px-4 shadow-sm">
          <Search size={19} className="text-[#B60050]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Rechercher un service, une catégorie..."
            aria-label="Rechercher un service"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                resetPage();
              }}
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#EFDFE7] bg-white px-4 text-sm font-bold text-[#63344A] hover:bg-pink-50"
        >
          <SlidersHorizontal size={17} />
          Filtres
        </button>
      </div>

      {showFilters ? (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-[#EFDFE7] bg-white p-4">
          <select
            aria-label="Catégorie"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              resetPage();
            }}
            className="rounded-xl border border-[#EAD5E0] px-3 py-2 text-sm"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Trier les services"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              resetPage();
            }}
            className="rounded-xl border border-[#EAD5E0] px-3 py-2 text-sm"
          >
            <option value="name">Nom A–Z</option>
            <option value="priceAsc">Prix croissant</option>
            <option value="priceDesc">Prix décroissant</option>
            <option value="duration">Durée croissante</option>
          </select>

          <button
            type="button"
            disabled={!onRefresh || loading}
            onClick={() => void onRefresh?.()}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
          >
            <RefreshCw size={15} />
            Actualiser
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Catalogue"
          value={services.length}
          detail={`${activeCount} actifs · ${services.length - activeCount} inactifs`}
          icon={Layers3}
        />
        <StatCard title="Prestations actives" value={activeCount} detail="Services disponibles" icon={CheckCircle2} />
        <StatCard title="Réservations du mois" value={monthlyAppointments ?? "—"} icon={CalendarDays} />
        <StatCard
          title="Chiffre d'affaires"
          value={monthlyRevenue == null ? "—" : money(monthlyRevenue)}
          icon={TrendingUp}
        />
        <StatCard
          title="Panier moyen"
          value={averageBasket == null ? "—" : money(averageBasket)}
          icon={ShoppingBasket}
        />
        <StatCard title="Service N°1" value={bestSellerName || "—"} icon={Trophy} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Tous", services.length],
              ["active", "Actifs", activeCount],
              ["inactive", "Inactifs", services.length - activeCount],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setFilter(id);
                resetPage();
              }}
              aria-pressed={filter === id}
              className={`rounded-full px-4 py-2.5 text-xs font-bold transition ${
                filter === id
                  ? "bg-[#B60050] text-white shadow-md"
                  : "border border-[#F0DFE7] bg-white text-[#75475D] hover:bg-pink-50"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

      </div>

      {loading ? (
        <div role="status" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-96 animate-pulse rounded-[22px] bg-[#F3E5ED]" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              canWrite={canWrite}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-[#F0DFE7] bg-white px-6 py-16 text-center">
          <ImagePlus size={38} className="text-[#CB7A9D]" />
          <h3 className="text-lg font-bold">Aucun service trouvé</h3>
          <p className="text-sm text-slate-500">Modifiez votre recherche ou vos filtres.</p>
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between rounded-xl bg-white p-4">
          <span className="text-xs text-slate-500">
            {filtered.length} services · Page {safePage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Page précédente"
              className="rounded-lg border p-2 disabled:opacity-30"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Page suivante"
              className="rounded-lg border p-2 disabled:opacity-30"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
