"use client";

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";

type Props = {
  title: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  unit?: ReactNode;
  delta?: ReactNode;
  negative?: boolean;
  deltaNegative?: boolean;
  alert?: boolean;
  onClick?: () => void;
  progress?: number;
  loading?: boolean;
  featured?: boolean;
  children?: ReactNode;
};

/** Common presentation for summary metrics; values and permissions stay with each page. */
export function MetricCard({ title, value, icon, hint, unit, delta, negative, deltaNegative, alert, onClick, progress, loading, featured, children }: Props) {
  const content = <>
    <div className="rb-metric-heading">
      <span className="rb-metric-icon" aria-hidden>{icon ?? <BarChart3 />}</span>
      <span className="rb-metric-title">{title}</span>
    </div>
    <div className="rb-metric-value" data-negative={negative || undefined}>{loading ? <span className="inline-block h-7 w-24 animate-pulse rounded-lg bg-pink-100/50" aria-hidden /> : <>{value}{unit ? <span className="rb-metric-unit">{unit}</span> : null}</>}</div>
    <div className="rb-metric-bottom">
      <div className="min-w-0">
        {!loading && delta != null && delta !== "" && delta !== "—" ? <span className="rb-metric-delta" data-negative={(deltaNegative ?? negative) || undefined}>{delta}</span> : null}
        {hint ? <div className="rb-metric-hint">{hint}</div> : null}
      </div>
      {!loading ? children : null}
    </div>
    {progress != null ? <div className="rb-metric-progress"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div> : null}
  </>;
  return onClick ? <button type="button" className="rb-metric-card" data-alert={alert || undefined} data-featured={featured || undefined} aria-busy={loading || undefined} onClick={onClick}>{content}</button> : <div className="rb-metric-card" data-alert={alert || undefined} data-featured={featured || undefined} aria-busy={loading || undefined}>{content}</div>;
}
