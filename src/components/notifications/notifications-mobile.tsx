"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCheck,
  Info,
} from "lucide-react";
import {
  CATEGORY_CHIPS,
  STATUS_FILTERS,
  formatClock,
  iconTone,
  primaryActionLabel,
  typeIcon,
  type NotificationsViewModel,
} from "@/components/notifications/notifications-helpers";
import { formatRelativeTime } from "@/modules/notifications/service";
import { NOTIFICATION_TYPE_LABEL } from "@/types/notifications";
import { cn } from "@/lib/utils";

export function NotificationsMobile({ vm }: { vm: NotificationsViewModel }) {
  return (
    <div className="flex flex-col gap-6 pb-4 lg:hidden">
      <section className="flex flex-col gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">
          Centre de Notifications
        </h1>
        <p className="text-[13px] text-on-surface-variant">
          Gérez les urgences cabines, paiements et opportunités métier en direct.
        </p>
        <button
          type="button"
          onClick={vm.onReadAll}
          disabled={vm.counters.unread === 0}
          className="flex items-center gap-1.5 text-[11px] font-bold text-primary transition-transform active:scale-95 disabled:opacity-50"
        >
          <CheckCheck className="h-[18px] w-[18px]" />
          Tout marquer comme lu
        </button>
      </section>

      {/* Metrics 2x2 */}
      <section className="grid grid-cols-2 gap-3">
        <MetricTile
          value={vm.counters.urgent}
          label="Urgentes"
          hint="SLA requise"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="urgent"
        />
        <MetricTile
          value={vm.counters.important}
          label="Du jour"
          hint="Attention active"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warn"
        />
        <MetricTile
          value={vm.counters.info}
          label="Infos"
          hint="Activité"
          icon={<Info className="h-5 w-5" />}
          tone="info"
        />
        <MetricTile
          value={vm.counters.resolvedToday}
          label="Traitées"
          hint="Clôturées 24h"
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="done"
        />
      </section>

      {/* Filters */}
      <section className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5">
        {STATUS_FILTERS.filter((f) => f.value !== "week").map((f) => {
          const active = vm.status === f.value && !vm.category;
          const count =
            f.value === "all"
              ? vm.counters.total
              : f.value === "unread"
                ? vm.counters.unread
                : f.value === "urgent"
                  ? vm.counters.urgent
                  : undefined;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                vm.onCategory(null);
                vm.onStatus(f.value);
              }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold shadow-sm",
                active
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-lowest font-semibold text-on-surface",
              )}
            >
              {f.label}
              {count != null ? ` (${count})` : ""}
            </button>
          );
        })}
        {CATEGORY_CHIPS.map((chip) => {
          const active = vm.category === chip.value;
          const count = vm.categoryCounts[chip.value] ?? 0;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => vm.onCategory(active ? null : chip.value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold shadow-sm",
                active
                  ? "bg-primary-container font-bold text-on-primary"
                  : "bg-surface-container-lowest text-on-surface",
              )}
            >
              {chip.short} ({count})
            </button>
          );
        })}
      </section>

      {/* Urgences */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[22px] font-bold text-on-surface">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Urgences
          </h3>
          <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-bold text-primary">
            {vm.urgentItems.length} à traiter
          </span>
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : vm.urgentItems.length === 0 ? (
          <div className="rounded-xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-sm">
            Aucune urgence critique.
          </div>
        ) : (
          vm.urgentItems.map((item) => {
            const Icon = typeIcon(item.type);
            return (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                      {NOTIFICATION_TYPE_LABEL[item.type]}
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-on-surface-variant">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
                <h4 className="flex items-center gap-2 text-lg font-bold text-on-surface">
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  {item.title}
                </h4>
                <p className="text-[13px] text-on-surface-variant">{item.message}</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => vm.onOpen(item)}
                    className="flex h-11 items-center justify-center gap-1 rounded-lg bg-primary-container text-sm font-bold text-on-primary shadow-sm active:scale-95"
                  >
                    {primaryActionLabel(item)}
                  </button>
                  {!item.readAt ? (
                    <button
                      type="button"
                      onClick={() => vm.onMarkRead(item)}
                      className="flex h-11 items-center justify-center gap-1 rounded-lg bg-surface-container text-sm font-semibold text-on-surface active:scale-95"
                    >
                      Marquer lu
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => vm.onOpen(item)}
                      className="flex h-11 items-center justify-center gap-1 rounded-lg bg-surface-container text-sm font-semibold text-on-surface active:scale-95"
                    >
                      Détail
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Timeline */}
      <section className="flex flex-col gap-3">
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement du flux…</p>
        ) : vm.groups.length === 0 ? (
          <div className="rounded-xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
            Aucune notification.
          </div>
        ) : (
          vm.groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-[22px] font-bold capitalize text-on-surface">{group.label}</h3>
                <span className="text-[11px] font-semibold text-on-surface-variant">
                  {group.items.length} alerte{group.items.length > 1 ? "s" : ""}
                </span>
              </div>
              {group.items.map((item) => {
                const Icon = typeIcon(item.type);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => vm.onOpen(item)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl bg-surface-container-lowest p-3 text-left shadow-sm active:scale-[0.99]",
                      group.key !== "today" && "opacity-90",
                      !item.readAt && "ring-1 ring-primary/10",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        iconTone(item.severity),
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-lg font-bold text-on-surface">{item.title}</span>
                        <span className="shrink-0 text-[11px] font-medium text-on-surface-variant">
                          {formatClock(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[13px] text-on-surface-variant line-clamp-2">{item.message}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function MetricTile({
  value,
  label,
  hint,
  icon,
  tone,
}: {
  value: number;
  label: string;
  hint: string;
  icon: ReactNode;
  tone: "urgent" | "warn" | "info" | "done";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          tone === "urgent" && "bg-surface-container-low text-primary",
          tone === "warn" && "bg-secondary-fixed text-on-secondary-fixed",
          tone === "info" && "bg-surface-container text-on-surface-variant",
          tone === "done" && "bg-surface-container-high text-on-surface",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex flex-col">
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "text-[22px] font-bold",
              tone === "urgent" && "text-primary",
              tone === "warn" && "text-secondary",
              (tone === "info" || tone === "done") && "text-on-surface",
            )}
          >
            {value}
          </span>
          <span className="text-[11px] font-semibold text-on-surface-variant">{label}</span>
        </div>
        <span className="truncate text-[11px] text-on-surface-variant">{hint}</span>
      </div>
    </div>
  );
}
