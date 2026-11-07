"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock3,
  Filter,
  Heart,
  Loader2,
  MessageSquare,
  MoreVertical,
  Phone,
  Search,
  Star,
  ThumbsUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffReviewScore } from "@/types/review";

type Review = {
  id: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  customerName: string;
  phone?: string;
  serviceName: string;
  reportReason: string | null;
};

export type PublicReviewsInternalStats = {
  internalCount: number;
  positiveCount: number;
  averageScore: number | null;
  pendingRequests: number;
};

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type StatusFilter = "all" | "PENDING" | "PUBLISHED" | "REJECTED";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Casablanca",
  });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} étoiles sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? "text-amber-400" : "text-slate-200"}
          fill={i < rating ? "currentColor" : "none"}
          aria-hidden
        />
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Star;
  tone: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-[#F1E8EC] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E7B9CD] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
          <Icon size={18} aria-hidden />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-[#30202C]">{value}</div>
      <p className={cn("mt-1 text-xs", accent ? "font-semibold text-emerald-600" : "text-slate-400")}>
        {subtitle}
      </p>
    </div>
  );
}

export function PublicReviewsModeration({
  internal,
  staffScores = [],
}: {
  internal?: PublicReviewsInternalStats;
  staffScores?: StaffReviewScore[];
  onAskReview?: () => void;
}) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/reviews/moderation/", { cache: "no-store" });
      if (!response.ok) throw new Error("Chargement impossible");
      const data = (await response.json()) as { reviews?: Review[] };
      setItems(data.reviews ?? []);
    } catch {
      setError("Impossible de charger les avis publics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((x) => x.status === "PENDING").length;
    const average = total ? items.reduce((sum, x) => sum + x.rating, 0) / total : null;

    const now = new Date();
    const thisKey = monthKey(now);
    const prev = new Date(now);
    prev.setMonth(prev.getMonth() - 1);
    const prevKey = monthKey(prev);
    const thisMonth = items.filter((x) => monthKey(new Date(x.createdAt)) === thisKey).length;
    const prevMonth = items.filter((x) => monthKey(new Date(x.createdAt)) === prevKey).length;
    const growthPct =
      prevMonth > 0
        ? Math.round(((thisMonth - prevMonth) / prevMonth) * 100)
        : thisMonth > 0
          ? 100
          : null;

    return { total, pending, average, thisMonth, growthPct };
  }, [items]);

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const item of items) {
      if (item.rating >= 1 && item.rating <= 5) counts[item.rating - 1]! += 1;
    }
    const max = Math.max(1, ...counts);
    return counts.map((count, index) => ({
      stars: index + 1,
      count,
      width: `${Math.round((count / max) * 100)}%`,
    }));
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (ratingFilter !== "all" && String(item.rating) !== ratingFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!query) return true;
      return [item.customerName, item.serviceName, item.comment, item.phone ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [items, search, ratingFilter, statusFilter]);

  async function moderate(reviewId: string, action: "publish" | "reject" | "report") {
    setBusyId(reviewId);
    setMenuId(null);
    try {
      const res = await fetch("/api/reviews/moderation/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, action }),
      });
      if (!res.ok) throw new Error("Action impossible");
      await load();
    } catch {
      setError("Impossible de modérer cet avis.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5 pb-6">
      <header
        className="relative flex min-h-[96px] items-center overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Avis &amp; réputation
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Suivez la satisfaction de vos clientes et valorisez chaque retour.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title="Avis publics"
          value={stats.total}
          subtitle={
            stats.growthPct != null
              ? `${stats.growthPct > 0 ? "+" : ""}${stats.growthPct} % vs mois dernier`
              : `${stats.thisMonth} ce mois`
          }
          icon={Star}
          tone="bg-pink-50 text-[#B62462]"
          accent={stats.growthPct != null && stats.growthPct > 0}
        />
        <StatCard
          title="Avis internes"
          value={internal?.internalCount ?? 0}
          subtitle="Demandes après rendez-vous"
          icon={Heart}
          tone="bg-[#FFF1F7] text-[#C23A74]"
        />
        <StatCard
          title="Avis positifs"
          value={internal?.positiveCount ?? 0}
          subtitle="Satisfaction enregistrée"
          icon={ThumbsUp}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="À traiter"
          value={stats.pending}
          subtitle="Avis publics à modérer"
          icon={Clock3}
          tone="bg-orange-50 text-orange-600"
        />
      </section>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={17} aria-hidden />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <section className="overflow-hidden rounded-[26px] border border-[#F0E7EB] bg-white shadow-sm xl:col-span-8">
          <div className="border-b border-[#F4EDF0] p-5 md:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-xl font-bold text-[#30202C]">Avis des clientes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher…"
                    className="h-11 w-full rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] pl-10 pr-4 text-sm outline-none transition focus:border-[#C95483] focus:ring-2 focus:ring-pink-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
                    filtersOpen
                      ? "border-[#981C52] bg-[#FFF1F7] text-[#981C52]"
                      : "border-[#F0E4EA] bg-white text-[#765E6B] hover:bg-[#FAF0F5]",
                  )}
                >
                  <Filter size={16} aria-hidden />
                  Filtres
                </button>
              </div>
            </div>

            {filtersOpen ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
                  className="h-10 rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] px-3 text-sm outline-none focus:border-[#C95483]"
                >
                  <option value="all">Toutes notes</option>
                  <option value="5">5 étoiles</option>
                  <option value="4">4 étoiles</option>
                  <option value="3">3 étoiles</option>
                  <option value="2">2 étoiles</option>
                  <option value="1">1 étoile</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-10 rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] px-3 text-sm outline-none focus:border-[#C95483]"
                >
                  <option value="all">Tous statuts</option>
                  <option value="PENDING">À modérer</option>
                  <option value="PUBLISHED">Publiés</option>
                  <option value="REJECTED">Rejetés</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 bg-[#FFFCFD] p-4 md:p-5">
            {loading ? (
              <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 size={20} className="animate-spin" aria-hidden />
                Chargement des avis…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAD5E0] bg-[#FFF9FB] px-4 py-10 text-center">
                <MessageSquare size={28} className="mb-3 text-[#C88BA6]" aria-hidden />
                <p className="font-semibold text-[#382633]">
                  {items.length === 0 ? "Aucun avis pour le moment" : "Aucun avis trouvé"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-[#8A7482]">
                  {items.length === 0
                    ? "Les notes clientes s’afficheront dès le premier retour enregistré."
                    : "Essayez un autre filtre ou une autre recherche."}
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#F0E7EB] bg-white p-4 transition hover:border-[#E7B9CD] hover:shadow-sm md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F7D9E6] to-[#EBC1D4] text-sm font-bold text-[#8D2452]">
                        {initials(item.customerName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[#30202C]">{item.customerName}</h3>
                          <span className="text-xs text-slate-400">{formatReviewDate(item.createdAt)}</span>
                          {item.status === "PENDING" ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              À modérer
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">Prestation : {item.serviceName}</p>
                        {item.phone ? (
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C2452]">
                            <Phone size={13} aria-hidden />
                            {item.phone}
                          </p>
                        ) : null}
                        <p className="mt-3 text-sm leading-relaxed text-[#594650]">
                          {item.comment || "Aucun commentaire."}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          title="Actions"
                          onClick={() => setMenuId(menuId === item.id ? null : item.id)}
                          className="rounded-lg p-1.5 text-[#765E6B] transition hover:bg-[#FAF0F5]"
                        >
                          {busyId === item.id ? (
                            <Loader2 size={16} className="animate-spin" aria-hidden />
                          ) : (
                            <MoreVertical size={16} aria-hidden />
                          )}
                        </button>
                        {menuId === item.id ? (
                          <div className="absolute right-0 top-8 z-20 min-w-[150px] rounded-xl border border-[#F0E7EB] bg-white p-1 text-left shadow-lg">
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#FAF0F5]"
                              onClick={() => void moderate(item.id, "publish")}
                            >
                              Publier
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#FAF0F5]"
                              onClick={() => void moderate(item.id, "reject")}
                            >
                              Rejeter
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-50"
                              onClick={() => void moderate(item.id, "report")}
                            >
                              Signaler
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <RatingStars rating={item.rating} />
                      <span className="text-xs font-semibold text-slate-500">{item.rating}/5</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-4 xl:col-span-4">
          <section className="rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#30202C]">Répartition des avis</h3>
            <div className="mt-5 space-y-3">
              {[...distribution].reverse().map((row) => (
                <div key={row.stars} className="flex items-center gap-3">
                  <span className="w-8 text-xs font-semibold text-slate-500">{row.stars}★</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F6EAF0]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C95483] to-[#981C52]"
                      style={{ width: row.width }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-400">{row.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#30202C]">Suivi &amp; actions</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[#FFF7FB] p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#981C52]" aria-hidden />
                  <p className="text-sm font-semibold text-[#30202C]">Demandes après rendez-vous</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {internal?.pendingRequests ?? 0} en attente · Envoi WhatsApp manuel
                </p>
              </div>

              <div className="rounded-2xl bg-[#FFF7FB] p-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#981C52]" aria-hidden />
                  <p className="text-sm font-semibold text-[#30202C]">Réputation par équipe</p>
                </div>
                {staffScores.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">Notes nominatives par praticienne</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {staffScores.slice(0, 4).map((s) => (
                      <li key={s.staffId} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#30202C]">{s.staffName}</span>
                        <span className="text-[#765E6B]">
                          {s.averageScore != null
                            ? `${String(s.averageScore).replace(".", ",")} / 5`
                            : "—"}{" "}
                          · {s.reviewCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/staff/"
                  className="mt-3 inline-flex text-xs font-bold text-[#981C52] hover:underline"
                >
                  Voir l&apos;équipe
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
