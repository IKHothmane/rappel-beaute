"use client";

import Link from "next/link";
import { Hourglass, Sparkles } from "lucide-react";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";
import { trialBanner } from "@/lib/subscriptions/trial-banner";
import { cn } from "@/lib/utils";

/**
 * Période d'essai dans la barre du haut : jours restants pendant l'essai (ex. « Essai gratuit de 15 jours · 9 jours
 * restants »), puis « Essai de 15 jours terminé » quand il est fini. Ne s'affiche pas pour un abonnement payé.
 */
export function TrialBadge() {
  const { subscription, loading } = usePlanFeatures();
  if (loading) return null;
  const banner = trialBanner(subscription);
  if (!banner) return null;

  const { kind, totalDays, daysLeft } = banner;
  const plural = daysLeft > 1 ? "s" : "";
  const label =
    kind === "ended"
      ? `Essai de ${totalDays} jours terminé`
      : `Essai gratuit de ${totalDays} jours · ${daysLeft} jour${plural} restant${plural}`;
  const short = kind === "ended" ? "Essai terminé" : `Essai · ${daysLeft} j`;
  const Icon = kind === "ended" ? Hourglass : Sparkles;

  return (
    <Link
      href="/settings/"
      title={kind === "ended" ? "Contactez-nous pour activer votre abonnement" : "Voir mon abonnement"}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
        kind === "ended" && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        kind === "ending" && "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
        kind === "running" && "border-[#F0C9DC] bg-[#FFF3F8] text-[#8F1648] hover:bg-[#FCE7F1]",
      )}
    >
      <Icon size={14} aria-hidden="true" />
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{label}</span>
      {kind === "ended" ? <span className="hidden font-bold underline underline-offset-2 lg:inline">Activer</span> : null}
    </Link>
  );
}
