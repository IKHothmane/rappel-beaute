"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Star } from "lucide-react";
import type { ReviewAnalytics } from "@/types/analytics";
import type { ReviewKpis } from "@/types/review";

export function CustomerReviews({ kpis, analytics, loading }: {
  kpis: ReviewKpis | null;
  analytics: ReviewAnalytics | null;
  loading: boolean;
}) {
  const publicCount = kpis?.publicCount ?? 0;
  const internalCount = kpis?.recordedCount ?? analytics?.recordedSatisfaction ?? 0;
  const count = publicCount > 0 ? publicCount : internalCount;
  const score = publicCount > 0 ? kpis?.publicAverageScore : kpis?.averageScore ?? analytics?.averageInternalScore;
  const categories = [
    { label: "Très satisfaites", count: kpis?.verySatisfiedCount ?? analytics?.bySatisfaction.find((row) => row.satisfaction === "VERY_SATISFIED")?.count ?? 0, color: "bg-emerald-500" },
    { label: "Satisfaites", count: kpis?.satisfiedCount ?? analytics?.bySatisfaction.find((row) => row.satisfaction === "SATISFIED")?.count ?? 0, color: "bg-[#D7A144]" },
    { label: "Insatisfaites", count: kpis?.dissatisfiedCount ?? analytics?.bySatisfaction.find((row) => row.satisfaction === "DISSATISFIED")?.count ?? 0, color: "bg-rose-500" },
  ];
  const total = categories.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="rb-card flex min-w-0 flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm" aria-label="Avis clientes">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#301625]">Avis clientes</h3>
          <p className="mt-1 text-xs text-[#8D7382]">La voix de vos clientes</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF1F6] text-[#B60050]"><MessageCircle size={19} aria-hidden /></span>
      </div>
      {loading ? (
        <div role="status" aria-label="Chargement des avis" className="h-56 animate-pulse rounded-2xl bg-[#FBF0F5]" />
      ) : (
        <>
          <div className="rounded-2xl border border-[#F1DFE7] bg-gradient-to-br from-[#FFF7FA] to-white p-4">
            {count > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-4xl font-extrabold tracking-tight text-[#54112F]">
                    {score != null ? score.toLocaleString("fr-MA", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
                    <span className="ml-1 text-sm font-medium text-[#8D7382]">/ 5</span>
                  </p>
                  {score != null ? (
                    <div className="flex gap-1" role="img" aria-label={`${score.toLocaleString("fr-MA")} sur 5 étoiles`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="relative block h-4 w-4">
                          <Star size={16} className="absolute text-[#E9D4DF]" aria-hidden />
                          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, score - star + 1)) * 100}%` }}><Star size={16} className="fill-[#D7A144] text-[#D7A144]" aria-hidden /></span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-[#8D7382]">{count.toLocaleString("fr-MA")} {publicCount > 0 ? (count > 1 ? "avis publics" : "avis public") : (count > 1 ? "retours internes" : "retour interne")}</p>
              </>
            ) : (
              <div className="py-2">
                <p className="text-sm font-bold text-[#54112F]">Votre prochain avis commence ici</p>
                <p className="mt-2 text-xs leading-5 text-[#8D7382]">Invitez vos clientes à partager leur expérience après leur rendez-vous.</p>
              </div>
            )}
          </div>
          {total > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#655362]">Satisfaction interne</p>
                {kpis?.satisfiedPercent != null ? <span className="text-xs font-bold text-emerald-700">{kpis.satisfiedPercent.toLocaleString("fr-MA")} % satisfaites</span> : null}
              </div>
              {categories.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-[#8D7382]">{row.label}</span><span className="font-semibold tabular-nums text-[#43303D]">{row.count.toLocaleString("fr-MA")}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#F5EAF0]"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.count / total * 100}%` }} /></div>
                </div>
              ))}
            </div>
          ) : null}
          {kpis ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#FBF4F7] p-3"><p className="text-xl font-bold tabular-nums text-[#54112F]">{kpis.pendingToSend.toLocaleString("fr-MA")}</p><p className="mt-1 text-[11px] text-[#8D7382]">Demandes à envoyer</p></div>
              <div className="rounded-xl bg-[#FBF4F7] p-3"><p className="text-xl font-bold tabular-nums text-[#54112F]">{kpis.awaitingRecord.toLocaleString("fr-MA")}</p><p className="mt-1 text-[11px] text-[#8D7382]">Réponses attendues</p></div>
            </div>
          ) : null}
          {(kpis?.publicPendingCount ?? 0) > 0 ? <Link href="/reviews/" className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800"><span>{kpis!.publicPendingCount} avis à modérer</span><ArrowRight size={14} aria-hidden /></Link> : null}
        </>
      )}
      <Link href="/reviews/" className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-[#B60050] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#8D0C40] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B60050]">Gérer les avis<ArrowRight size={15} aria-hidden /></Link>
    </section>
  );
}
