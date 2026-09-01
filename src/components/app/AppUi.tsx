"use client";

import type { ReactNode } from "react";

export function AppPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink/60">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:[&>*]:w-auto [&>*]:w-full">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface p-4 md:p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums md:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink/45">{hint}</p> : null}
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`shrink-0 rounded-t-lg px-3 py-2 text-sm transition ${
            value === t
              ? "bg-white font-semibold text-primary"
              : "text-ink/50 hover:text-ink"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="surface p-6 text-sm text-ink/60">{children}</div>
  );
}

/** Ligne de liste responsive : empile sur mobile, aligne sur sm+ */
export function ListRow({
  left,
  right,
}: {
  left: ReactNode;
  right?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
      <div className="min-w-0">{left}</div>
      {right ? (
        <div className="shrink-0 text-sm text-ink/55 sm:text-right">{right}</div>
      ) : null}
    </li>
  );
}
