"use client";

import { useMemo, useState, type ElementType } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImagePlus,
  Layers3,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Scissors,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { ServiceResponsiveImage } from "@/components/services/service-responsive-image";
import type { ServiceListItem } from "@/types/service";

type Service = ServiceListItem;
type StatusFilter = "all" | "active" | "inactive";

type Props = {
  services: Service[];
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

const PAGE_SIZE = 12;

const mad = (amount: number) =>
  `${new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: 2,
  }).format(amount)} MAD`;

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: ElementType;
  tone: "rose" | "violet" | "green" | "gold";
}) {
  const colors = {
    rose: "bg-[#FCE3EA] text-[#A50D48]",
    violet: "bg-[#EEE3FA] text-[#793EB0]",
    green: "bg-[#E1F5E9] text-[#148452]",
    gold: "bg-[#FFF0DA] text-[#C48822]",
  };

  return (
    <div className="min-w-0 rounded-[20px] border border-[#F1DBE3] bg-white/85 p-4 shadow-[0_6px_18px_rgba(72,20,43,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors[tone]}`}>
          <Icon size={22} strokeWidth={1.9} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#745364]">{label}</p>
          <p className="mt-1 break-words text-xl font-extrabold text-[#381327]">{value}</p>
        </div>
      </div>
      {detail ? <p className="mt-3 text-xs text-[#907989]">{detail}</p> : null}
    </div>
  );
}

function ServicePhoto({
  service,
  className = "",
}: {
  service: Service;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#FDE3ED] via-[#F8CEDF] to-[#F0B8D0] ${className}`}
    >
      {service.imageUrl && !failed ? (
        <ServiceResponsiveImage
          imageUrl={service.imageUrl}
          alt={`Photo de la prestation ${service.name}`}
          variant="thumb"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain object-center"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#A63869]">
          <Scissors size={30} strokeWidth={1.4} />
          <span className="text-center text-xs font-semibold">
            {service.category || "Votre prestation"}
          </span>
        </div>
      )}
    </div>
  );
}

function StaffAvatars({ names }: { names: string[] }) {
  if (!names.length) {
    return <span className="text-xs text-[#927A89]">Aucune employée assignée</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex shrink-0 -space-x-2">
        {names.slice(0, 3).map((name, index) => (
          <span
            key={`${name}-${index}`}
            title={name}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#CF256F] to-[#781438] text-[10px] font-bold text-white"
          >
            {initials(name)}
          </span>
        ))}
        {names.length > 3 ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#F6DFE8] text-[10px] font-bold text-[#84264D]">
            +{names.length - 3}
          </span>
        ) : null}
      </div>
      <span className="min-w-0 truncate text-xs text-[#7D6575]">{names.join(", ")}</span>
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
  service: Service;
  canWrite: boolean;
  onEdit: (id: string) => void;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="group min-w-0 overflow-visible rounded-[20px] border border-[#EFDAE3] bg-white shadow-[0_8px_24px_rgba(76,20,45,0.07)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(76,20,45,0.13)]">
      <div className="relative overflow-hidden rounded-t-[19px]">
        <ServicePhoto
          key={`${service.id}:${service.imageUrl ?? ""}`}
          service={service}
          className="aspect-[4/3] w-full"
        />

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
            service.active ? "bg-[#C8F3CF] text-[#15753D]" : "bg-white text-[#776775]"
          }`}
        >
          <Check size={13} />
          {service.active ? "Actif" : "Inactif"}
        </span>

        {canWrite ? (
          <div className="absolute right-3 top-3">
            <button
              type="button"
              aria-label={`Options de ${service.name}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/95 text-[#49192E] shadow-sm hover:bg-white"
            >
              <MoreHorizontal size={19} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-[#EED7E1] bg-white p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(service.id);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[#FFF1F7]"
                >
                  Modifier
                </button>
                {onToggle ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggle(service.id);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[#FFF1F7]"
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

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCE6EF] text-[#B31B57]">
            <Sparkles size={21} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-extrabold text-[#351425]">{service.name}</h3>
            <p className="mt-1 truncate text-xs font-semibold text-[#B01653]">
              {service.category || "Autres prestations"}
            </p>
          </div>
        </div>

        <p className="mt-2 line-clamp-2 min-h-10 text-[13px] leading-5 text-[#796575]">
          {service.description || "Découvrez cette prestation proposée par notre institut."}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F6] px-3 py-1.5 text-xs font-semibold text-[#51253B]">
            <Clock3 size={14} />
            {duration(service.durationMin)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCE4ED] px-3 py-1.5 text-xs font-bold text-[#A70E49]">
            <Wallet size={14} />
            {mad(service.price)}
          </span>
        </div>

        <div className="mt-auto pt-4">
          <StaffAvatars names={service.staffNames} />
          <div className="mt-3">
            {canWrite ? (
              <button
                type="button"
                onClick={() => onEdit(service.id)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#951341] to-[#B91656] text-xs font-bold text-white transition hover:brightness-110"
              >
                <Pencil size={15} />
                Modifier
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="h-10 w-full rounded-xl bg-[#F6EEF2] text-xs text-[#9F8794]"
              >
                Lecture seule
              </button>
            )}
          </div>
        </div>
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
  bestSellerName: _bestSellerName,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
  onRefresh,
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    return Array.from(
      new Set(services.map((s) => s.category?.trim()).filter((s): s is string => Boolean(s))),
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [services]);

  const activeCount = services.filter((s) => s.active).length;

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fr");

    const rows = services.filter((s) => {
      const matchText =
        !term ||
        [s.name, s.category, s.description, ...s.staffNames].some((value) =>
          value?.toLocaleLowerCase("fr").includes(term),
        );

      const matchCategory = category === "all" || s.category === category;
      const matchStatus = status === "all" || (status === "active" ? s.active : !s.active);

      return matchText && matchCategory && matchStatus;
    });

    return rows.sort((a, b) => {
      if (sort === "priceAsc") return a.price - b.price;
      if (sort === "priceDesc") return b.price - a.price;
      if (sort === "duration") return a.durationMin - b.durationMin;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [services, query, category, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeFilter(next: StatusFilter) {
    setStatus(next);
    setPage(1);
  }

  const chips = [
    { id: "all", label: "Tous", count: services.length },
    ...categories.map((cat) => ({
      id: cat,
      label: cat,
      count: services.filter((s) => s.category === cat).length,
    })),
  ];

  return (
    <div className="space-y-5 pb-8 text-[#351425]">
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
            Services & Prestations
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Gérez vos soins, vos tarifs, leur durée et les membres de votre équipe depuis un seul espace.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={onCreate}
            className="relative z-10 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#A40E49] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#801035]"
          >
            <Plus size={18} />
            Nouveau service
          </button>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Catalogue"
          value={services.length}
          detail="Prestations au total"
          icon={Layers3}
          tone="rose"
        />
        <StatCard
          label="Services actifs"
          value={activeCount}
          detail={
            services.length
              ? `${Math.round((activeCount / services.length) * 100)} % du catalogue`
              : "Aucun service"
          }
          icon={BadgeCheck}
          tone="violet"
        />
        <StatCard
          label="Réservations du mois"
          value={monthlyAppointments ?? "—"}
          icon={CalendarDays}
          tone="green"
        />
        <StatCard
          label="Chiffre d'affaires"
          value={monthlyRevenue == null ? "—" : mad(monthlyRevenue)}
          icon={TrendingUp}
          tone="rose"
        />
        <StatCard
          label="Panier moyen"
          value={averageBasket == null ? "—" : mad(averageBasket)}
          icon={ShoppingBag}
          tone="gold"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-2xl border border-[#EAD9E1] bg-white px-4 shadow-sm">
          <Search size={19} className="text-[#A01C50]" />
          <input
            aria-label="Rechercher un service"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un service, une catégorie..."
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#AA96A1]"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#EAD9E1] bg-white px-4 text-sm font-semibold hover:bg-[#FFF0F6]"
        >
          <SlidersHorizontal size={17} />
          Filtres
        </button>
      </div>

      {showFilters ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#EAD9E1] bg-white p-4">
          <label className="text-xs font-semibold text-[#79566A]">
            Statut
            <select
              value={status}
              onChange={(e) => changeFilter(e.target.value as StatusFilter)}
              className="mt-1 block h-10 rounded-xl border border-[#EAD9E1] bg-white px-3 text-sm text-[#351425]"
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-[#79566A]">
            Trier par
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="mt-1 block h-10 rounded-xl border border-[#EAD9E1] bg-white px-3 text-sm text-[#351425]"
            >
              <option value="name">Nom (A → Z)</option>
              <option value="priceAsc">Prix croissant</option>
              <option value="priceDesc">Prix décroissant</option>
              <option value="duration">Durée</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => void onRefresh?.()}
            disabled={!onRefresh || loading}
            className="self-end rounded-xl border border-[#EAD9E1] px-4 py-3 text-xs font-bold hover:bg-[#FFF0F6] disabled:opacity-40"
          >
            Actualiser
          </button>
        </div>
      ) : null}

      <nav aria-label="Catégories de services" className="flex gap-2 overflow-x-auto pb-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={category === chip.id}
            onClick={() => {
              setCategory(chip.id);
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition ${
              category === chip.id
                ? "bg-gradient-to-r from-[#8F123F] to-[#B71956] text-white shadow-md"
                : "border border-[#EBD7E0] bg-white text-[#694052] hover:bg-[#FFF0F6]"
            }`}
          >
            {chip.label} ({chip.count})
          </button>
        ))}
      </nav>

      <p className="text-sm font-semibold text-[#765567]">
        {filtered.length} prestation{filtered.length > 1 ? "s" : ""}
      </p>

      {loading ? (
        <div role="status" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-[20px] bg-[#F4E0E8]" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-[#EAD9E1] bg-white px-6 py-16 text-center">
          <ImagePlus size={38} className="text-[#BA7896]" />
          <h3 className="font-bold">Aucun service trouvé</h3>
          <p className="text-sm text-[#8A7180]">Modifiez vos filtres ou votre recherche.</p>
          {canWrite ? (
            <button
              type="button"
              onClick={onCreate}
              className="mt-2 rounded-xl bg-[#9C1246] px-5 py-3 text-sm font-bold text-white"
            >
              Ajouter une prestation
            </button>
          ) : null}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
          <p className="text-xs text-[#856B7C]">
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Page précédente"
              className="rounded-lg border p-2 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Page suivante"
              className="rounded-lg border p-2 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
