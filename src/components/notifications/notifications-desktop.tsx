"use client";

import type { ReactNode } from "react";
import {
  Check,
  CheckCheck,
  Search,
  Zap,
  AlertTriangle,
  Info,
  BadgeCheck,
  RefreshCw,
} from "lucide-react";
import {
  CATEGORY_CHIPS,
  STATUS_FILTERS,
  formatClock,
  iconTone,
  primaryActionLabel,
  severityBadge,
  typeIcon,
  type NotificationsViewModel,
} from "@/components/notifications/notifications-helpers";
import { formatRelativeTime } from "@/modules/notifications/service";
import { NOTIFICATION_TYPE_LABEL } from "@/types/notifications";
import { cn } from "@/lib/utils";

export function NotificationsDesktop({ vm }: { vm: NotificationsViewModel }) {
  return (
    <div className="hidden space-y-8 lg:block">
      {/* Header */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-[40px] font-extrabold tracking-tight text-on-surface">
              Centre de Notifications &amp; Alertes Métier
            </h1>
            <p className="max-w-3xl text-[15px] text-on-surface-variant">
              Supervisez les urgences cabines, paiements, rendez-vous et opportunités métier en temps réel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={vm.onReadAll}
              disabled={vm.counters.unread === 0}
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container disabled:opacity-50"
            >
              <CheckCheck className="h-[18px] w-[18px] text-primary" />
              Tout marquer comme lu
            </button>
            <button
              type="button"
              onClick={vm.onRefresh}
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container"
            >
              <RefreshCw className="h-[18px] w-[18px] text-on-surface-variant" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Counters */}
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CounterCard
            value={vm.counters.urgent}
            label="Urgentes"
            hint="Action requise"
            tone="urgent"
            icon={<AlertTriangle className="h-[26px] w-[26px]" />}
          />
          <CounterCard
            value={vm.counters.important}
            label="Importantes"
            hint="Attention du jour"
            tone="warn"
            icon={<AlertTriangle className="h-[26px] w-[26px]" />}
          />
          <CounterCard
            value={vm.counters.info}
            label="Informations"
            hint="Activité générale"
            tone="info"
            icon={<Info className="h-[26px] w-[26px]" />}
          />
          <CounterCard
            value={vm.counters.resolvedToday}
            label="Résolues"
            hint="Traitées aujourd'hui"
            tone="done"
            icon={<BadgeCheck className="h-[26px] w-[26px]" />}
          />
        </div>
      </section>

      {/* Toolbar */}
      <section className="space-y-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={vm.search}
              onChange={(e) => vm.onSearch(e.target.value)}
              placeholder="Rechercher une alerte (stock, paiement, avis, cliente…)"
              className="w-full rounded-lg bg-surface-container-low py-3 pl-11 pr-4 text-[13px] text-on-surface shadow-inner placeholder:text-on-surface-variant/50 focus:bg-surface focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? vm.counters.total
                  : f.value === "unread"
                    ? vm.counters.unread
                    : f.value === "urgent"
                      ? vm.counters.urgent
                      : vm.statusCounts[f.value];
              const active = vm.status === f.value && !vm.category;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    vm.onCategory(null);
                    vm.onStatus(f.value);
                  }}
                  className={cn(
                    "rounded-lg px-4 py-2 text-[11px] font-bold transition-all",
                    active
                      ? "bg-primary text-on-primary shadow-sm"
                      : f.value === "urgent"
                        ? "bg-surface-container text-primary hover:bg-primary-fixed"
                        : "bg-surface-container text-on-surface hover:bg-surface-container-high",
                  )}
                >
                  {f.label}
                  {count != null ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {CATEGORY_CHIPS.map((chip) => {
            const count = vm.categoryCounts[chip.value] ?? 0;
            const active = vm.category === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => vm.onCategory(active ? null : chip.value)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-transform active:scale-95",
                  active
                    ? chip.value === "marketing"
                      ? "bg-inverse-surface text-secondary-fixed shadow-sm"
                      : "bg-primary-fixed text-on-primary-fixed"
                    : "bg-surface-container font-semibold text-on-surface hover:bg-surface-container-high",
                )}
              >
                {chip.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* Urgences */}
      <section id="urgences" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-ping rounded-full bg-primary" />
            <h2 className="text-[22px] font-extrabold tracking-tight text-on-surface">
              Alertes Prioritaires &amp; Urgences Métier
            </h2>
          </div>
          <span className="rounded-full bg-primary-fixed px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            {vm.urgentItems.length} action{vm.urgentItems.length !== 1 ? "s" : ""} requise
            {vm.urgentItems.length !== 1 ? "s" : ""}
          </span>
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement des urgences…</p>
        ) : vm.urgentItems.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest p-6 text-sm text-on-surface-variant shadow-sm">
            Aucune urgence critique ouverte.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {vm.urgentItems.map((item) => (
              <UrgentCard key={item.id} item={item} onOpen={vm.onOpen} onMarkRead={vm.onMarkRead} />
            ))}
          </div>
        )}
      </section>

      <section id="liste" className="flex flex-col gap-8">
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement du flux…</p>
        ) : vm.groups.length === 0 ? (
          <div className="rounded-xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant shadow-sm">
            Aucune notification pour ce filtre.
          </div>
        ) : (
          vm.groups.map((group) => (
            <div key={group.key} className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[22px] font-bold capitalize text-on-surface">{group.label}</span>
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-bold text-on-surface-variant">
                    {group.items.length} notification{group.items.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {group.items.map((item) => (
                <TimelineCard key={item.id} item={item} onOpen={vm.onOpen} onMarkRead={vm.onMarkRead} />
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function CounterCard({
  value,
  label,
  hint,
  tone,
  icon,
}: {
  value: number;
  label: string;
  hint: string;
  tone: "urgent" | "warn" | "info" | "done";
  icon: ReactNode;
}) {
  return (
    <div className="group relative flex items-center justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-xl",
            tone === "urgent" && "bg-primary/10 text-primary",
            tone === "warn" && "bg-secondary-fixed text-on-secondary-fixed",
            tone === "info" && "bg-surface-container-high text-on-surface-variant",
            tone === "done" && "bg-surface-container text-on-surface",
          )}
        >
          {icon}
          {tone === "urgent" && value > 0 ? (
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-primary" />
          ) : null}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[28px] font-extrabold leading-none",
                tone === "urgent" && "text-primary",
                tone === "warn" && "text-secondary",
                (tone === "info" || tone === "done") && "text-on-surface",
              )}
            >
              {value}
            </span>
            <span className="text-sm font-bold text-on-surface">{label}</span>
          </div>
          <span
            className={cn(
              "mt-1 text-[11px] font-bold uppercase tracking-wider",
              tone === "urgent" && "text-primary",
              tone === "warn" && "text-secondary",
              (tone === "info" || tone === "done") && "font-medium text-on-surface-variant",
            )}
          >
            {hint}
          </span>
        </div>
      </div>
    </div>
  );
}

function UrgentCard({
  item,
  onOpen,
  onMarkRead,
}: {
  item: import("@/types/notifications").NotificationItem;
  onOpen: NotificationsViewModel["onOpen"];
  onMarkRead: NotificationsViewModel["onMarkRead"];
}) {
  const Icon = typeIcon(item.type);
  const badge = severityBadge(item.severity);
  return (
    <article className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-surface-container-lowest p-6 shadow-md transition-transform hover:-translate-y-0.5 lg:flex-row lg:items-center">
      <div className="flex max-w-3xl items-start gap-4">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm", iconTone(item.severity))}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide", badge.className)}>
              {NOTIFICATION_TYPE_LABEL[item.type]}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant">
              · {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-on-surface">{item.title}</p>
          <p className="text-[13px] text-on-surface-variant">{item.message}</p>
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:w-auto lg:justify-end">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm transition-all hover:bg-primary-container"
        >
          <Zap className="h-[18px] w-[18px]" />
          {primaryActionLabel(item)}
        </button>
        {!item.readAt ? (
          <button
            type="button"
            onClick={() => onMarkRead(item)}
            className="rounded-lg p-2.5 text-on-surface-variant transition-all hover:bg-surface-container"
            title="Marquer comme lu"
          >
            <Check className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function TimelineCard({
  item,
  onOpen,
  onMarkRead,
}: {
  item: import("@/types/notifications").NotificationItem;
  onOpen: NotificationsViewModel["onOpen"];
  onMarkRead: NotificationsViewModel["onMarkRead"];
}) {
  const Icon = typeIcon(item.type);
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-all hover:bg-surface-bright sm:flex-row sm:items-center",
        !item.readAt && "ring-1 ring-primary/15",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconTone(item.severity))}>
          <Icon className="h-[22px] w-[22px]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface">{item.title}</span>
            <span className="text-[11px] text-on-surface-variant">{formatClock(item.createdAt)}</span>
            {!item.readAt ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
          </div>
          <p className="mt-0.5 text-[13px] text-on-surface-variant">{item.message}</p>
        </div>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        {!item.readAt ? (
          <button
            type="button"
            onClick={() => onMarkRead(item)}
            className="rounded-lg bg-surface-container px-3 py-1.5 text-[11px] font-bold text-on-surface hover:bg-surface-container-high"
          >
            Marquer lu
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-on-primary hover:bg-primary-container"
        >
          {primaryActionLabel(item)}
        </button>
      </div>
    </div>
  );
}
