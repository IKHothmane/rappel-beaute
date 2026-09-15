"use client";

import Link from "next/link";
import {
  Bug,
  CheckCircle2,
  Headphones,
  Lightbulb,
  MapPin,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import {
  DIAGNOSTIC_ACTIONS,
  KNOWLEDGE_GUIDES,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUS_LABEL,
  TICKET_FILTERS,
  categoryIcon,
  formatClock,
  priorityTone,
  relativeTime,
  statusTone,
  ticketRef,
  type SupportViewModel,
} from "@/components/support/support-helpers";
import { cn } from "@/lib/utils";

export function SupportDesktop({ vm }: { vm: SupportViewModel }) {
  return (
    <div className="hidden space-y-8 lg:block">
      {/* Header */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Support Prestige Métier
              </span>
              <span className="flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-on-secondary-fixed">
                <Shield className="h-3.5 w-3.5" />
                {vm.roleLabel}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-bold tracking-wider text-on-primary-fixed">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                Assistance prioritaire
              </span>
              <span className="flex items-center gap-1 rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-bold text-on-surface shadow-sm">
                <Shield className="h-3.5 w-3.5 text-secondary" />
                CNDP Loi 09-08
              </span>
              <span className="flex items-center gap-1 text-[13px] text-on-surface-variant">
                <MapPin className="h-4 w-4" />
                {vm.orgName}
              </span>
            </div>
            <h1 className="mt-1 flex items-center gap-2 text-[28px] font-bold text-on-surface">
              <Headphones className="h-8 w-8 text-primary" />
              Support &amp; Conciergerie Technique Métier
            </h1>
            <p className="max-w-3xl text-[15px] text-on-surface-variant">
              Créez une demande et suivez la conversation avec l&apos;équipe Rappel Beauté — données
              réelles de votre institut.
            </p>
          </div>
          {vm.canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => vm.onOpenModal("ticket")}
                className="flex h-12 items-center gap-2 rounded-lg bg-primary-container px-4 text-sm font-bold text-on-primary-container shadow-sm transition-all hover:bg-primary hover:shadow-md"
              >
                Nouveau Ticket
              </button>
              <button
                type="button"
                onClick={() => vm.onOpenModal("bug")}
                className="flex h-12 items-center gap-2 rounded-lg bg-surface-container-lowest px-4 text-sm font-bold text-on-surface shadow-sm transition-all hover:bg-surface-container"
              >
                <Bug className="h-5 w-5 text-error" />
                Signaler un Bug
              </button>
              <button
                type="button"
                onClick={() => vm.onOpenModal("feature")}
                className="flex h-12 items-center gap-2 rounded-lg bg-inverse-surface px-4 text-sm font-bold text-secondary-fixed shadow-sm transition-all hover:opacity-95"
              >
                <Lightbulb className="h-5 w-5" />
                Proposer une idée
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-8">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={vm.search}
              onChange={(e) => vm.onSearch(e.target.value)}
              placeholder="Rechercher un ticket (#RB-…), une problématique…"
              className="h-12 w-full rounded-xl bg-surface-container-lowest py-2 pl-12 pr-4 text-[15px] text-on-surface shadow-sm placeholder:text-on-surface-variant/50 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3 shadow-sm lg:col-span-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary">
                <Timer className="h-[18px] w-[18px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">
                  1ère réponse moyenne
                </span>
                <span className="text-lg font-extrabold text-on-surface">
                  {vm.avgResponseMin != null ? `${vm.avgResponseMin} min` : "—"}
                  <span className="ml-1 text-[11px] font-bold text-secondary">
                    {vm.avgResponseMin != null ? "mesuré" : "pas encore de données"}
                  </span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={vm.onRefresh}
              className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
              title="Actualiser"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tickets Totaux"
          value={vm.counters.total}
          hint={`${vm.counters.thisMonth} ce mois-ci`}
          bar={vm.counters.total ? Math.min(100, (vm.counters.thisMonth / vm.counters.total) * 100) : 0}
        />
        <KpiCard
          label="Ouverts"
          value={vm.counters.open}
          hint={
            vm.counters.urgentOpen > 0
              ? `${vm.counters.urgentOpen} urgent${vm.counters.urgentOpen > 1 ? "s" : ""}`
              : "Aucune urgence"
          }
          accent="primary"
        />
        <KpiCard
          label="En Attente Support"
          value={vm.counters.waiting}
          hint="Réponse institut ou plateforme"
          accent="secondary"
        />
        <KpiCard
          label="Résolus & Clôturés"
          value={vm.counters.resolved}
          hint="Historique scellé"
          accent="done"
        />
      </section>

      {/* Filters + split */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-2 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {TICKET_FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? vm.counters.total
                  : f.value === "active"
                    ? vm.counters.active
                    : f.value === "urgent"
                      ? vm.items.filter((t) => t.priority === "URGENT").length
                      : f.value === "open"
                        ? vm.counters.open
                        : f.value === "waiting"
                          ? vm.counters.waiting
                          : vm.counters.resolved;
              const active = vm.filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => vm.onFilter(f.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary font-bold text-on-primary shadow-sm"
                      : "font-medium text-on-surface-variant hover:bg-surface-container",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-bold",
                      active ? "bg-white/20 text-white" : "bg-surface-container-high text-on-surface-variant",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
            <span className="text-[11px] font-semibold uppercase">Trier :</span>
            <select
              value={vm.sort}
              onChange={(e) => vm.onSort(e.target.value as "recent" | "priority" | "number")}
              className="cursor-pointer rounded-lg bg-surface-container-high px-2.5 py-1 text-[11px] font-bold text-on-surface focus:outline-none"
            >
              <option value="recent">Dernière activité</option>
              <option value="priority">Priorité</option>
              <option value="number">N° ticket</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* List */}
          <div className="flex flex-col gap-3 lg:col-span-7">
            {vm.loading ? (
              <p className="text-sm text-on-surface-variant">Chargement…</p>
            ) : vm.filtered.length === 0 ? (
              <div className="rounded-xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant shadow-sm">
                Aucun ticket pour ce filtre.
              </div>
            ) : (
              vm.filtered.map((t) => {
                const Icon = categoryIcon(t.category);
                const selected = vm.selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => vm.onSelect(t.id)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl bg-surface-container-lowest p-4 text-left shadow-sm transition-all hover:shadow-md",
                      selected && "ring-2 ring-primary",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-extrabold",
                            selected ? "text-primary" : "text-on-surface",
                          )}
                        >
                          {ticketRef(t)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold",
                            priorityTone(t.priority),
                          )}
                        >
                          {SUPPORT_PRIORITY_LABEL[t.priority] ?? t.priority}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold",
                            statusTone(t.status),
                          )}
                        >
                          {SUPPORT_STATUS_LABEL[t.status]}
                        </span>
                      </div>
                      <span className="text-[13px] text-on-surface-variant">
                        {relativeTime(t.lastMessageAt ?? t.updatedAt)}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-on-surface">{t.subject}</h2>
                    {t.lastMessagePreview ? (
                      <p className="line-clamp-2 text-[13px] text-on-surface-variant">
                        {t.lastMessagePreview}
                      </p>
                    ) : null}
                    <div className="mt-1 flex items-center justify-between border-t border-surface-container pt-2 text-[13px] text-on-surface-variant">
                      <span className="flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 text-[11px] font-semibold">
                        <Icon className="h-3.5 w-3.5" />
                        {SUPPORT_CATEGORY_LABEL[t.category]}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail pane */}
          <div className="sticky top-24 flex min-h-[640px] flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-5">
            {!vm.selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-on-surface-variant">
                <Headphones className="h-10 w-10 text-primary/40" />
                <p>Sélectionnez un ticket pour afficher la conversation.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 border-b border-surface-container pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[22px] font-black text-primary">
                        {ticketRef(vm.selected)}
                      </span>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[11px] font-extrabold",
                          priorityTone(vm.selected.priority),
                        )}
                      >
                        {SUPPORT_PRIORITY_LABEL[vm.selected.priority] ?? vm.selected.priority}
                      </span>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[11px] font-bold",
                          statusTone(vm.selected.status),
                        )}
                      >
                        {SUPPORT_STATUS_LABEL[vm.selected.status]}
                      </span>
                    </div>
                    <Link
                      href={`/support/${vm.selected.id}/`}
                      className="rounded-lg bg-surface-container px-2 py-1 text-[11px] font-bold text-on-surface hover:bg-surface-container-high"
                    >
                      Plein écran
                    </Link>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">{vm.selected.subject}</h3>
                  <p className="text-[13px] text-on-surface-variant">
                    Ouvert le{" "}
                    {new Date(vm.selected.createdAt).toLocaleString("fr-MA", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    · {SUPPORT_CATEGORY_LABEL[vm.selected.category]}
                  </p>
                </div>

                <div className="max-h-[380px] flex-1 space-y-4 overflow-y-auto py-4 pr-1">
                  {vm.messagesLoading ? (
                    <p className="text-sm text-on-surface-variant">Chargement des messages…</p>
                  ) : vm.messages.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">Aucun message.</p>
                  ) : (
                    vm.messages.map((m) => {
                      const mine = m.senderType === "INSTITUT";
                      return (
                        <div
                          key={m.id}
                          className={cn("flex gap-3", !mine && "flex-row-reverse")}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold shadow-sm",
                              mine
                                ? "bg-primary-container text-on-primary-container"
                                : "bg-secondary-fixed text-on-secondary-fixed",
                            )}
                          >
                            {(m.senderName ?? (mine ? vm.userName : "Support"))
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((p) => p[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div
                            className={cn(
                              "flex max-w-[85%] flex-col gap-1",
                              !mine && "items-end",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-on-surface">
                                {m.senderName ?? (mine ? "Vous" : "Support")}
                              </span>
                              {!mine ? (
                                <span className="rounded bg-secondary-fixed px-1.5 py-0.5 text-[10px] font-bold text-on-secondary-fixed">
                                  SUPPORT
                                </span>
                              ) : null}
                              <span className="text-[11px] text-on-surface-variant">
                                {formatClock(m.createdAt)}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-2xl p-3 text-[13px] text-on-surface shadow-sm",
                                mine
                                  ? "rounded-tl-none bg-surface-container-low"
                                  : "rounded-tr-none bg-surface-container-high",
                              )}
                            >
                              {m.message}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {vm.canWrite && vm.selected.status !== "CLOSED" ? (
                  <div className="flex flex-col gap-2 border-t border-surface-container pt-3">
                    <textarea
                      value={vm.reply}
                      onChange={(e) => vm.onReplyChange(e.target.value)}
                      rows={3}
                      placeholder="Écrire votre réponse…"
                      className="w-full rounded-xl bg-surface-container-low p-3 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Paperclip className="h-5 w-5 text-on-surface-variant/40" />
                      <button
                        type="button"
                        disabled={vm.sending || !vm.reply.trim()}
                        onClick={vm.onSendReply}
                        className="flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container shadow-sm transition-all hover:bg-primary disabled:opacity-50"
                      >
                        Envoyer
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>

      {/* IA + knowledge */}
      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-inverse-surface p-6 text-inverse-on-surface shadow-xl lg:col-span-5">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-secondary-container/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/30 text-secondary-fixed shadow-inner">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-secondary-fixed">
                    Aide rapide
                  </span>
                  <h4 className="text-[22px] font-extrabold text-surface-bright">
                    Liens métiers express
                  </h4>
                </div>
              </div>
            </div>
            <p className="mt-1 text-[13px] text-surface-variant/80">
              Accès direct aux modules concernés — pas de diagnostic inventé.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {DIAGNOSTIC_ACTIONS.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="flex items-center justify-between rounded-lg bg-surface-container-highest/10 p-2.5 text-left text-sm text-surface-bright transition-all hover:bg-surface-container-highest/20"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-[18px] w-[18px] text-secondary-fixed" />
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Raccourcis
              </span>
              <h4 className="text-[22px] font-bold text-on-surface">Modules &amp; procédures</h4>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {KNOWLEDGE_GUIDES.map((g) => {
              const Icon = g.icon;
              return (
                <Link
                  key={g.id}
                  href={g.href}
                  className="group flex flex-col justify-between rounded-xl bg-surface-container-low p-4 transition-colors hover:bg-surface-container"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-lowest text-primary shadow-sm">
                      <Icon className="h-[22px] w-[22px]" />
                    </div>
                    <div>
                      <span
                        className={cn(
                          "text-[11px] font-bold uppercase",
                          g.tone === "secondary" ? "text-secondary" : "text-primary",
                        )}
                      >
                        {g.eyebrow}
                      </span>
                      <h5 className="mt-0.5 text-lg font-bold text-on-surface group-hover:text-primary">
                        {g.title}
                      </h5>
                      <p className="mt-1 text-[13px] text-on-surface-variant">{g.body}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest p-6 shadow-sm md:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface">Centre d&apos;assistance institut</p>
            <p className="text-[13px] text-on-surface-variant">
              Créez un ticket pour toute urgence caisse, agenda ou TPE.
            </p>
          </div>
        </div>
        <div className="flex flex-col text-[13px] text-on-surface-variant md:items-end">
          <span className="flex items-center gap-2 font-bold text-on-surface">
            <Shield className="h-4 w-4 text-secondary" />
            Conformité CNDP Loi 09-08
          </span>
          <span className="text-[11px] text-on-surface-variant/80">
            Tickets et messages stockés pour votre organisation
          </span>
        </div>
      </footer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  accent,
  bar,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "primary" | "secondary" | "done";
  bar?: number;
}) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <div
          className={cn(
            "text-[40px] font-extrabold leading-none tracking-tight",
            accent === "primary" && "text-primary",
            accent === "secondary" && "text-secondary",
            !accent && "text-on-surface",
          )}
        >
          {value}
        </div>
        <span className="rounded bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
          {hint}
        </span>
      </div>
      {bar != null ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-primary" style={{ width: `${bar}%` }} />
        </div>
      ) : null}
    </div>
  );
}
