"use client";
import { MetricCard } from "@/components/ui/metric-card";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCheck,
  Info,
  RefreshCw,
  Search,
  Zap,
} from "lucide-react";
import {
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
  const recentActivity = (vm.items.length ? vm.items : vm.filtered).slice(0, 8);

  return (
    <div className="hidden space-y-5 lg:block">
      <header
        className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Centre de notifications
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Supervisez les urgences cabines, paiements, rendez-vous et opportunités métier en temps
            réel.
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={vm.onReadAll}
            disabled={vm.counters.unread === 0}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#A40E49] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#801035] disabled:opacity-50"
          >
            <CheckCheck size={17} aria-hidden />
            Tout marquer comme lu
          </button>
          <button
            type="button"
            onClick={vm.onRefresh}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E7B9CD] bg-white px-5 text-sm font-semibold text-[#831D4A] transition hover:bg-[#FFF7FA]"
          >
            <RefreshCw size={17} aria-hidden />
            Actualiser
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 rb-metric-row">
        <CounterCard
          value={vm.counters.urgent}
          label="Urgentes"
          hint="Action requise"
          tone="urgent"
          icon={<AlertTriangle className="h-[22px] w-[22px]" />}
        />
        <CounterCard
          value={vm.counters.important}
          label="Importantes"
          hint="Attention du jour"
          tone="warn"
          icon={<AlertTriangle className="h-[22px] w-[22px]" />}
        />
        <CounterCard
          value={vm.counters.info}
          label="Informations"
          hint="Activité générale"
          tone="info"
          icon={<Info className="h-[22px] w-[22px]" />}
        />
        <CounterCard
          value={vm.counters.resolvedToday}
          label="Résolues"
          hint="Traitées aujourd'hui"
          tone="done"
          icon={<BadgeCheck className="h-[22px] w-[22px]" />}
        />
      </section>

      <section className="space-y-4 rounded-[24px] border border-[#F1E8EC] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A58B99]"
              aria-hidden
            />
            <input
              value={vm.search}
              onChange={(e) => vm.onSearch(e.target.value)}
              placeholder="Rechercher une alerte (stock, paiement, avis, cliente…)"
              className="h-12 w-full rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] py-3 pl-11 pr-4 text-[13px] text-[#30202C] outline-none transition focus:border-[#C95483] focus:ring-2 focus:ring-pink-100"
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
                    "rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all",
                    active
                      ? "bg-[#981C52] text-white shadow-sm"
                      : f.value === "urgent"
                        ? "bg-[#FFF1F7] text-[#981C52] hover:bg-[#FCE9F4]"
                        : "bg-[#FCF8FA] text-[#765E6B] hover:bg-[#FAF0F5]",
                  )}
                >
                  {f.label}
                  {count != null ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section id="urgences" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#981C52]" aria-hidden />
                <h2 className="text-lg font-extrabold tracking-tight text-[#30202C]">
                  Alertes Prioritaires &amp; Urgences Métier
                </h2>
              </div>
              <span className="rounded-full bg-[#FCE9F4] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#981C52]">
                {vm.urgentItems.length} action{vm.urgentItems.length !== 1 ? "s" : ""} requise
                {vm.urgentItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            {vm.loading ? (
              <p className="text-sm text-[#765E6B]">Chargement des urgences…</p>
            ) : vm.urgentItems.length === 0 ? (
              <div className="rounded-[22px] border border-[#F0E7EB] bg-white p-6 text-sm text-[#765E6B] shadow-sm">
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

          <section id="liste" className="flex flex-col gap-6">
            {vm.loading ? (
              <p className="text-sm text-[#765E6B]">Chargement du flux…</p>
            ) : vm.groups.length === 0 ? (
              <div className="rounded-[22px] border border-[#F0E7EB] bg-white p-8 text-center text-sm text-[#765E6B] shadow-sm">
                Aucune notification pour ce filtre.
              </div>
            ) : (
              vm.groups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold capitalize text-[#30202C]">{group.label}</span>
                    <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-bold text-[#981C52]">
                      {group.items.length}
                    </span>
                  </div>
                  {group.items.map((item) => (
                    <TimelineCard
                      key={item.id}
                      item={item}
                      onOpen={vm.onOpen}
                      onMarkRead={vm.onMarkRead}
                    />
                  ))}
                </div>
              ))
            )}
          </section>
        </div>

        <aside className="space-y-4 xl:col-span-4">
          <section className="rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#30202C]">Activité récente</h3>
            {recentActivity.length === 0 ? (
              <p className="mt-4 text-sm text-[#765E6B]">Aucune activité récente.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {recentActivity.map((item) => {
                  const Icon = typeIcon(item.type);
                  return (
                    <li key={item.id} className="flex gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          iconTone(item.severity),
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                      <button
                        type="button"
                        onClick={() => vm.onOpen(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-[#30202C]">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#765E6B]">{item.message}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatClock(item.createdAt)} · {formatRelativeTime(item.createdAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
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
  return <MetricCard title={label} value={value} icon={icon} hint={hint} alert={tone === "urgent" && value > 0}></MetricCard>;
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
    <article className="flex flex-col items-start justify-between gap-5 rounded-[22px] border border-[#F0E7EB] bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5 lg:flex-row lg:items-center">
      <div className="flex max-w-3xl items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm",
            iconTone(item.severity),
          )}
        >
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide",
                badge.className,
              )}
            >
              {NOTIFICATION_TYPE_LABEL[item.type]}
            </span>
            <span className="text-[11px] font-medium text-[#765E6B]">
              · {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-[#30202C]">{item.title}</p>
          <p className="text-[13px] text-[#765E6B]">{item.message}</p>
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:w-auto lg:justify-end">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="flex items-center gap-1.5 rounded-xl bg-[#981C52] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#7d1643]"
        >
          <Zap className="h-[18px] w-[18px]" aria-hidden />
          {primaryActionLabel(item)}
        </button>
        {!item.readAt ? (
          <button
            type="button"
            onClick={() => onMarkRead(item)}
            className="rounded-xl p-2.5 text-[#765E6B] transition hover:bg-[#FAF0F5]"
            title="Marquer comme lu"
          >
            <Check className="h-5 w-5" aria-hidden />
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
        "flex flex-col items-start justify-between gap-4 rounded-[18px] border border-[#F0E7EB] bg-white p-4 shadow-sm transition-all hover:border-[#E7B9CD] sm:flex-row sm:items-center",
        !item.readAt && "ring-1 ring-[#981C52]/15",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconTone(item.severity),
          )}
        >
          <Icon className="h-[22px] w-[22px]" aria-hidden />
        </div>
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#30202C]">{item.title}</span>
            <span className="text-[11px] text-[#765E6B]">{formatClock(item.createdAt)}</span>
            {!item.readAt ? <span className="h-1.5 w-1.5 rounded-full bg-[#981C52]" /> : null}
          </div>
          <p className="mt-0.5 text-[13px] text-[#765E6B]">{item.message}</p>
        </div>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        {!item.readAt ? (
          <button
            type="button"
            onClick={() => onMarkRead(item)}
            className="rounded-xl bg-[#FCF8FA] px-3 py-1.5 text-[11px] font-bold text-[#765E6B] hover:bg-[#FAF0F5]"
          >
            Marquer lu
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="rounded-xl bg-[#981C52] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#7d1643]"
        >
          {primaryActionLabel(item)}
        </button>
      </div>
    </div>
  );
}
