"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useId } from "react";
import { MetricCard } from "@/components/ui/metric-card";

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
  featured?: boolean;
  chart?: "line" | "bars";
  progress?: number | null;
};


function usableTrend(values: number[] | undefined): number[] | null {
  if (!values || values.length < 2) return null;
  if (!values.some((v) => v !== 0)) return null;
  return values;
}

function Sparkline({
  values,
  color,
  bars = false,
}: {
  values: number[];
  color: string;
  bars?: boolean;
}) {
  const gradientId = useId();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 34 - ((value - min) / range) * 28;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 100 40" className="h-9 w-20 shrink-0 overflow-visible" aria-hidden="true">
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity="0.3" /><stop offset="1" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
      {bars ? values.slice(-8).map((value, index, series) => <rect key={index} x={index * 13} y={38 - Math.max(2, value / (Math.max(...series) || 1) * 34)} width="9" height={Math.max(2, value / (Math.max(...series) || 1) * 34)} rx="2.5" fill={color} opacity={0.25 + index / series.length * 0.75} />) : <>
      <polygon points={`0,40 ${points.join(" ")} 100,40`} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy={34 - ((values[values.length - 1] - min) / range) * 28} r="2.8" fill={color} />
      </>}
    </svg>
  );
}

export function PremiumKpiCard({
  title,
  value,
  icon: Icon,

  change,
  subtitle,
  trend,
  loading = false,
  featured = false,
  chart = "line",
  progress,
}: Props) {
  const spark = usableTrend(trend);
  const delta = change == null ? null : <>
    {change > 0 ? <ArrowUp size={14} aria-hidden /> : change < 0 ? <ArrowDown size={14} aria-hidden /> : <Minus size={14} aria-hidden />}
    {change === 0 ? "Stable" : `${change > 0 ? "+" : ""}${change.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
  </>;
  return (
    <MetricCard title={title} value={value} icon={<Icon />} hint={subtitle} delta={delta} deltaNegative={change != null && change < 0} featured={featured} loading={loading}>
      {progress != null ? (
        <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0" aria-hidden>
          <circle cx="50" cy="50" r="38" fill="none" stroke="#FAD1E3" strokeWidth="15" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#D90B63" strokeWidth="15" strokeDasharray={`${Math.max(0, Math.min(100, progress)) * 2.3876} 238.76`} transform="rotate(-90 50 50)" />
          <text x="50" y="56" textAnchor="middle" fill="#741032" fontSize="21" fontWeight="800">{Math.round(progress)}%</text>
        </svg>
      ) : spark ? <Sparkline values={spark} color={featured ? "#FFB5D2" : "#E52C80"} bars={chart === "bars"} /> : null}
    </MetricCard>
  );
}
