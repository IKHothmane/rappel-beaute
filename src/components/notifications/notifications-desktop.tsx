"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Check,
  CheckCheck,
  Search,
  Shield,
  Sparkles,
  Settings2,
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
  type ChannelKey,
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
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-ping rounded-full bg-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Flux télémétrique · {vm.orgName}
              </span>
            </div>
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
            <a
              href="#preferences"
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container"
            >
              <Settings2 className="h-[18px] w-[18px] text-secondary" />
              Préférences &amp; Canaux
            </a>
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

      {/* Copilote */}
      <section className="relative mb-2 overflow-hidden rounded-2xl bg-inverse-surface p-6 text-inverse-on-surface shadow-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary-fixed shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-secondary-fixed">
                    Copilote IA Prestige
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  <span className="text-[11px] font-semibold text-inverse-on-surface/70">
                    Synthèse des alertes critiques
                  </span>
                </div>
                <h2 className="text-[22px] font-bold text-inverse-on-surface">
                  {vm.insights.length} recommandation{vm.insights.length > 1 ? "s" : ""} proactive
                  {vm.insights.length > 1 ? "s" : ""}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-inverse-surface/80 px-3 py-1.5">
              <span className="h-2 w-2 animate-ping rounded-full bg-secondary-container" />
              <span className="text-[11px] font-bold text-secondary-fixed">
                Moteur prédictif · {vm.orgName}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {vm.insights.map((ins) => (
              <div
                key={ins.id}
                className="flex flex-col justify-between gap-4 rounded-xl bg-inverse-on-surface/5 p-4 backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      ins.tone === "gold"
                        ? "bg-secondary/20 text-secondary-fixed"
                        : "bg-primary/20 text-primary-fixed",
                    )}
                  >
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          ins.tone === "gold" ? "text-secondary-fixed" : "text-primary-fixed",
                        )}
                      >
                        {ins.title}
                      </span>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[11px] font-bold",
                          ins.tone === "gold"
                            ? "bg-secondary/20 text-secondary-fixed"
                            : "bg-primary/20 text-primary-fixed",
                        )}
                      >
                        {ins.badge}
                      </span>
                    </div>
                    <p className="text-[13px] text-inverse-on-surface/80">{ins.body}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link
                    href={ins.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold shadow-md transition-all",
                      ins.tone === "gold"
                        ? "bg-secondary text-on-secondary hover:opacity-95"
                        : "bg-primary text-on-primary hover:bg-primary-container",
                    )}
                  >
                    <Zap className="h-[18px] w-[18px]" />
                    {ins.cta}
                  </Link>
                  {ins.secondaryCta && ins.secondaryHref ? (
                    <Link
                      href={ins.secondaryHref}
                      className="rounded-lg bg-inverse-on-surface/10 px-4 py-2.5 text-sm font-semibold text-inverse-on-surface transition-all hover:bg-inverse-on-surface/20"
                    >
                      {ins.secondaryCta}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
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

      {/* Timeline + preferences */}
      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-12">
        <section id="liste" className="flex flex-col gap-8 xl:col-span-8">
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

        <aside id="preferences" className="flex flex-col gap-6 xl:col-span-4">
          <div className="sticky top-24 flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                  <Settings2 className="h-5 w-5" />
                </div>
                <h3 className="text-[22px] font-bold text-on-surface">Canaux d&apos;Alerte</h3>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Local</span>
            </div>
            <p className="text-[13px] text-on-surface-variant">
              Préférences enregistrées sur cet appareil. Le routage serveur multi-canaux arrive prochainement.
            </p>
            <div className="space-y-3 pt-1">
              {vm.channelRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-on-surface">{rule.label}</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        rule.priorityTone === "primary" && "text-primary",
                        rule.priorityTone === "secondary" && "text-secondary",
                        rule.priorityTone === "muted" && "text-on-surface-variant",
                      )}
                    >
                      {rule.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-on-surface-variant">
                    {(["app", "email", "whatsapp"] as ChannelKey[]).map((key) => (
                      <label key={key} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={rule.channels[key]}
                          onChange={() => vm.onToggleChannel(rule.id, key)}
                          className="h-4 w-4 rounded accent-primary"
                        />
                        <span className="capitalize">{key === "app" ? "App" : key === "email" ? "Email" : "WhatsApp"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => vm.onSaveChannels(vm.channelRules)}
              className="mt-1 w-full rounded-lg bg-on-surface py-2.5 text-sm font-bold text-surface shadow-sm transition-all hover:bg-inverse-surface"
            >
              Enregistrer les règles de routage
            </button>
            <div className="flex items-start gap-2 rounded-xl bg-surface-container p-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-on-surface">Conformité CNDP Loi 09-08</span>
                <p className="text-[11px] leading-relaxed text-on-surface-variant">
                  Notifications chiffrées · Hébergement cloud souverain Maroc.
                </p>
              </div>
            </div>
          </div>
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
