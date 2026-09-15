import type { ReactNode } from "react";
import type { OrganizationStatus, SubscriptionPlan, SubscriptionStatus } from "@/types/platform";
import { PLAN_LABEL } from "@/types/platform";

const STATUS_LABEL: Record<OrganizationStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ARCHIVED: "Archivé",
};

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-ink/60">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="ac-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink/45">{hint}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrganizationStatus }) {
  const map: Record<OrganizationStatus, string> = {
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
    SUSPENDED: "border-red-200 bg-red-50 text-red-800",
    ARCHIVED: "border-line bg-[#FBF4F6] text-ink/50",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${map[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  return (
    <span className="inline-flex rounded-md border border-line bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink/70">
      {PLAN_LABEL[plan]}
    </span>
  );
}

const SUB_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIAL: "Essai",
  ACTIVE: "Actif",
  PAST_DUE: "Impayé",
  PAUSED: "En pause",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
};

export function SubBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span className="inline-flex rounded-md border border-line bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink/70">
      {SUB_STATUS_LABEL[status]}
    </span>
  );
}

export function MiniBars({
  data,
  labels,
}: {
  data: number[];
  labels?: string[];
}) {
  const max = Math.max(...data, 1);
  const chartH = 112; // px — évite height % sur parent flex sans hauteur définie
  return (
    <div className="w-full min-w-[280px]">
      <div className="flex items-end gap-1.5" style={{ height: chartH }}>
        {data.map((v, i) => {
          const h = Math.max(Math.round((v / max) * chartH), v > 0 ? 6 : 2);
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: chartH }}
              title={labels?.[i] ? `${labels[i]} : ${v.toLocaleString("fr-MA")}` : String(v)}
            >
              <div
                className="w-full rounded-t bg-primary/80 transition-all"
                style={{ height: h }}
              />
            </div>
          );
        })}
      </div>
      {labels?.length ? (
        <div className="mt-1.5 flex gap-1.5">
          {labels.map((label, i) => (
            <span
              key={i}
              className="flex-1 truncate text-center font-mono text-[9px] text-ink/40"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
