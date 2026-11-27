import { Globe, Mail, Phone, Target, type LucideIcon } from "lucide-react";
import {
  PROSPECT_STATUSES,
  STATUS_LABEL,
  type ProspectHas,
  type ProspectStats,
  type ProspectStatus,
} from "@/lib/admin/prospects-client";
import { cn } from "@/lib/utils";
import { STATUS_TONE } from "./prospect-contact";

const nf = new Intl.NumberFormat("fr-FR");

function percent(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)} % du total` : "—";
}

/**
 * Compteurs `stats` renvoyés par l'API. Les tuiles « avec … » et les statuts filtrent la liste ;
 * aria-pressed indique le filtre actif.
 */
export function ProspectsStats({
  stats,
  activeHas,
  activeStatus,
  onHas,
  onStatus,
}: {
  stats: ProspectStats;
  activeHas: ProspectHas | "";
  activeStatus: ProspectStatus | "";
  onHas: (has: ProspectHas | "") => void;
  onStatus: (status: ProspectStatus | "") => void;
}) {
  const tiles: { key: "total" | ProspectHas; label: string; value: number; hint: string; icon: LucideIcon; tone: string }[] = [
    { key: "total", label: "Prospects", value: stats.total, hint: "Fiches enregistrées", icon: Target, tone: "bg-[#3B63D6]/10 text-[#2F52B8]" },
    { key: "phone", label: "Avec téléphone", value: stats.withPhone, hint: percent(stats.withPhone, stats.total), icon: Phone, tone: "bg-emerald-100 text-emerald-700" },
    { key: "email", label: "Avec e-mail", value: stats.withEmail, hint: percent(stats.withEmail, stats.total), icon: Mail, tone: "bg-violet-100 text-violet-700" },
    { key: "website", label: "Avec site", value: stats.withWebsite, hint: percent(stats.withWebsite, stats.total), icon: Globe, tone: "bg-amber-100 text-amber-700" },
  ];

  return (
    <section aria-label="Compteurs des prospects" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const body = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{t.label}</span>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", t.tone)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </span>
              <span className="mt-3 block text-2xl font-bold tabular-nums tracking-tight text-[#0F172A]">{nf.format(t.value)}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{t.hint}</span>
            </>
          );
          const cls = "rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition";
          if (t.key === "total") {
            return (
              <div key={t.key} className={cls}>
                {body}
              </div>
            );
          }
          const has = t.key;
          const pressed = activeHas === has;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={pressed}
              onClick={() => onHas(pressed ? "" : has)}
              title={pressed ? "Retirer ce filtre" : `Afficher seulement les prospects ${t.label.toLowerCase()}`}
              className={cn(
                cls,
                "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B63D6] motion-reduce:hover:translate-y-0",
                pressed && "ring-2 ring-[#3B63D6]",
              )}
            >
              {body}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Répartition par statut (filtre)">
        {PROSPECT_STATUSES.map((s) => {
          const pressed = activeStatus === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={pressed}
              onClick={() => onStatus(pressed ? "" : s)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]",
                STATUS_TONE[s],
                pressed ? "ring-2 ring-[#3B63D6]" : "hover:brightness-95",
              )}
            >
              {STATUS_LABEL[s]}
              <span className="tabular-nums opacity-80">{nf.format(stats.byStatus?.[s] ?? 0)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
