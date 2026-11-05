"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Heart,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
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
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Star;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-[#F1E8EC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-[#30202C]">{value}</div>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

export function PublicReviewsModeration({
  internal,
  onAskReview,
}: {
  internal?: PublicReviewsInternalStats;
  onAskReview?: () => void;
}) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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
    return { total, pending, average };
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
    if (!query) return items;
    return items.filter((item) =>
      [item.customerName, item.serviceName, item.comment, item.phone ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [items, search]);

  const satisfactionDisplay =
    internal?.averageScore != null
      ? String(internal.averageScore).replace(".", ",")
      : stats.average != null
        ? stats.average.toFixed(1).replace(".", ",")
        : "—";

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#30202C] md:text-4xl">Avis & réputation</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Suivez la satisfaction de vos clientes et valorisez chaque retour.
          </p>
        </div>
        <button
          type="button"
          onClick={onAskReview}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#981C52] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#78133E]"
        >
          + Demander un avis
        </button>
      </section>

      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3A2033] via-[#4A2740] to-[#5C2D4C] px-6 py-7 text-white shadow-lg md:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[36px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pink-200/80">
              Votre réputation en un coup d&apos;œil
            </p>
            <p className="mt-3 max-w-xl text-2xl font-semibold leading-snug md:text-[28px]">
              Des clientes écoutées, une réputation qui grandit.
            </p>
          </div>
          <div className="min-w-[200px] rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-pink-100/80">Satisfaction interne</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold">{satisfactionDisplay}</span>
              <span className="mb-1 text-sm text-pink-100/80">/ 5</span>
            </div>
            <div className="mt-2">
              <RatingStars
                rating={
                  internal?.averageScore != null
                    ? Math.round(internal.averageScore)
                    : stats.average != null
                      ? Math.round(stats.average)
                      : 0
                }
                size={16}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title="Avis publics"
          value={stats.total}
          subtitle={`${stats.pending} en attente de modération`}
          icon={Star}
          tone="bg-pink-50 text-[#B62462]"
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
          icon={Sparkles}
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="À traiter"
          value={stats.pending}
          subtitle="Avis publics à modérer"
          icon={AlertCircle}
          tone="bg-orange-50 text-orange-600"
        />
      </section>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={17} />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <section className="overflow-hidden rounded-[26px] border border-[#F0E7EB] bg-white shadow-sm xl:col-span-8">
          <div className="border-b border-[#F4EDF0] p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-[#30202C]">Avis des clientes</h2>
              <div className="relative w-full sm:max-w-xs">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher…"
                  className="h-11 w-full rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] pl-10 pr-4 text-sm outline-none transition focus:border-[#C95483] focus:ring-2 focus:ring-pink-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-[#FFFCFD] p-4 md:p-5">
            {loading ? (
              <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 size={20} className="animate-spin" />
                Chargement des avis…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <MessageSquare size={28} className="mb-3 text-[#C88BA6]" />
                <p className="font-semibold text-[#382633]">Aucun avis trouvé</p>
              </div>
            ) : (
              filtered.map((item) => {
                return (
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
                          <h3 className="text-sm font-bold text-[#30202C]">{item.customerName}</h3>
                          <p className="mt-1 text-xs text-slate-400">Prestation : {item.serviceName}</p>
                          {item.phone ? (
                            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C2452]">
                              <Phone size={13} />
                              {item.phone}
                            </p>
                          ) : null}
                          <p className="mt-3 text-sm leading-relaxed text-[#594650]">
                            {item.comment || "Aucun commentaire."}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <RatingStars rating={item.rating} />
                        <span className="text-xs font-semibold text-slate-500">{item.rating}/5</span>
                      </div>
                    </div>
                  </article>
                );
              })
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
            <h3 className="text-base font-bold text-[#30202C]">Suivi & actions</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-[#FFF7FB] p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#981C52]" />
                  <p className="text-sm font-semibold text-[#30202C]">Demandes après rendez-vous</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {internal?.pendingRequests ?? 0} en attente · Envoi WhatsApp manuel
                </p>
              </div>
              <div className="rounded-2xl bg-[#FFF7FB] p-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#981C52]" />
                  <p className="text-sm font-semibold text-[#30202C]">Réputation par équipe</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">Notes nominatives par praticienne</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
