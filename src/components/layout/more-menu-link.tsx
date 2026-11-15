"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";

/**
 * Entrée de la page « Menu ». Comme dans la barre latérale, un module absent
 * du forfait reste navigable (la page affiche l'invitation à changer de
 * forfait) mais est signalé par un cadenas.
 */
export function MoreMenuLink({
  href,
  label,
  planKey,
}: {
  href: string;
  label: string;
  planKey?: string;
}) {
  const { isNavEnabled, loading } = usePlanFeatures();
  const locked = Boolean(planKey) && !loading && !isNavEnabled(planKey as string);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#FBF4F6] sm:px-5",
        locked && "text-ink/45",
      )}
    >
      <span>{label}</span>
      {locked ? (
        <Lock size={14} className="shrink-0 text-ink/30" aria-label="Forfait supérieur requis" />
      ) : null}
    </Link>
  );
}
