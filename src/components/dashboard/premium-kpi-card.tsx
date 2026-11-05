"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type Tone = "pink" | "purple" | "green" | "orange";

type Props = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Pourcentage de variation réel uniquement — `null` / `undefined` = ne rien afficher */
  change?: number | null;
  subtitle?: string;
  /** Série réelle uniquement — ignorer si vide ou uniquement des zéros */
  trend?: number[];
  loading?: boolean;
};

const tones = {
  pink: {
    icon: "bg-[#FCE2EE] text-[#B60050]",
    line: "#B60050",
  },
  purple: {
    icon: "bg-[#F3E8FF] text-[#7C3AED]",
    line: "#8B5CF6",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    line: "#10B981",
  },
  orange: {
    icon: "bg-orange-50 text-orange-600",
    line: "#F97316",
  },
};

function usableTrend(values: number[] | undefined): number[] | null {
  if (!values || values.length < 2) return null;
  if (!values.some((v) => v !== 0)) return null;
  return values;
}

function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 34 - ((value - min) / range) * 28;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 100 40" className="h-10 w-24" aria-hidden="true">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PremiumKpiCard({
  title,
  value,
  icon: Icon,
  tone = "pink",
  change,
  subtitle,
  trend,
  loading = false,
}: Props) {
  const style = tones[tone];
  const spark = usableTrend(trend);

  return (
    <article
      className="group min-w-0 rounded-[20px] border border-[#F0E5EC] bg-white p-5 shadow-[0_8px_30px_rgba(75,24,47,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(75,24,47,0.10)]"
      aria-busy={loading || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#655362]">{title}</p>

          {loading ? (
            <div
              className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-[#FCE7F1]"
              aria-hidden
            />
          ) : (
            <p className="mt-2 break-words text-[28px] font-extrabold tracking-tight text-[#271323]">
              {value}
            </p>
          )}
        </div>

        <div className={`rounded-2xl p-3 ${style.icon}`} aria-hidden>
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>

      <div className="mt-4 flex min-h-10 items-end justify-between gap-2">
        <div className="min-w-0">
          {!loading && change != null ? (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold ${
                change > 0
                  ? "text-emerald-600"
                  : change < 0
                    ? "text-rose-600"
                    : "text-[#7A6A76]"
              }`}
            >
              {change > 0 ? (
                <ArrowUpRight size={15} aria-hidden />
              ) : change < 0 ? (
                <ArrowDownRight size={15} aria-hidden />
              ) : (
                <Minus size={15} aria-hidden />
              )}
              {change === 0
                ? "Stable vs période préc."
                : `${change > 0 ? "+" : ""}${change.toFixed(1)} %`}
            </span>
          ) : null}

          {subtitle ? <p className="mt-1 text-xs text-[#988895]">{subtitle}</p> : null}
        </div>

        {!loading && spark ? <Sparkline values={spark} color={style.line} /> : null}
      </div>
    </article>
  );
}
