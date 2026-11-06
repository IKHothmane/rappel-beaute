"use client";

import Link from "next/link";
import {
  Bug,
  Headphones,
  Lightbulb,
  Paperclip,
  Plus,
  Search,
  Send,
} from "lucide-react";
import {
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
            Support
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Créez une demande et suivez la conversation avec l&apos;équipe Rappel Beauté.
          </p>
        </div>
        {vm.canWrite ? (
          <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => vm.onOpenModal("ticket")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#A40E49] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#801035]"
            >
              <Plus size={17} aria-hidden />
              Nouveau ticket
            </button>
            <button
              type="button"
              onClick={() => vm.onOpenModal("bug")}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E7B9CD] bg-white px-5 text-sm font-semibold text-[#831D4A] transition hover:bg-[#FFF7FA]"
            >
              <Bug size={17} aria-hidden />
              Signaler un bug
            </button>
            <button
              type="button"
              onClick={() => vm.onOpenModal("feature")}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E7B9CD] bg-white px-5 text-sm font-semibold text-[#831D4A] transition hover:bg-[#FFF7FA]"
            >
              <Lightbulb size={17} aria-hidden />
              Proposer une idée
            </button>
          </div>
        ) : null}
      </header>

      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A58B99]"
          aria-hidden
        />
        <input
          value={vm.search}
          onChange={(e) => vm.onSearch(e.target.value)}
          placeholder="Rechercher un ticket…"
          className="h-12 w-full rounded-xl border border-[#F0E4EA] bg-white py-2 pl-12 pr-4 text-[15px] text-[#30202C] shadow-sm outline-none transition placeholder:text-[#B69CA9] focus:border-[#C95483] focus:ring-2 focus:ring-pink-100"
        />
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tickets totaux"
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
          label="En attente support"
          value={vm.counters.waiting}
          hint="Réponse institut ou plateforme"
          accent="secondary"
        />
        <KpiCard
          label="Résolus & clôturés"
          value={vm.counters.resolved}
          hint="Historique scellé"
          accent="done"
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#F1E8EC] bg-white p-2 shadow-sm">
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
                    "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-[#981C52] font-bold text-white shadow-sm"
                      : "font-medium text-[#765E6B] hover:bg-[#FAF0F5]",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded-lg px-1.5 py-0.5 text-[11px] font-bold",
                      active ? "bg-white/20 text-white" : "bg-[#FCF8FA] text-[#765E6B]",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#765E6B]">
            <span className="text-[11px] font-semibold uppercase">Trier</span>
            <select
              value={vm.sort}
              onChange={(e) => vm.onSort(e.target.value as "recent" | "priority" | "number")}
              className="cursor-pointer rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] px-2.5 py-1.5 text-[11px] font-bold text-[#30202C] focus:outline-none"
            >
              <option value="recent">Dernière activité</option>
              <option value="priority">Priorité</option>
              <option value="number">N° ticket</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
            {vm.loading ? (
              <p className="text-sm text-[#765E6B]">Chargement…</p>
            ) : vm.filtered.length === 0 ? (
              <div className="rounded-[22px] border border-[#F0E7EB] bg-white p-8 text-center text-sm text-[#765E6B] shadow-sm">
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
                      "flex flex-col gap-1.5 rounded-[22px] border border-[#F0E7EB] bg-white p-4 text-left shadow-sm transition-all hover:border-[#E7B9CD] hover:shadow-md",
                      selected && "border-[#981C52] ring-2 ring-[#981C52]/20",
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

          <div className="sticky top-24 flex min-h-[640px] flex-col justify-between rounded-[26px] border border-[#F0E7EB] bg-white p-5 shadow-sm lg:col-span-5 lg:p-6">
            {!vm.selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-[#765E6B]">
                <Headphones className="h-10 w-10 text-[#C88BA6]" aria-hidden />
                <p>Sélectionnez un ticket pour afficher la conversation.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 border-b border-[#F4EDF0] pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[22px] font-black text-[#981C52]">
                        {ticketRef(vm.selected)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                          priorityTone(vm.selected.priority),
                        )}
                      >
                        {SUPPORT_PRIORITY_LABEL[vm.selected.priority] ?? vm.selected.priority}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          statusTone(vm.selected.status),
                        )}
                      >
                        {SUPPORT_STATUS_LABEL[vm.selected.status]}
                      </span>
                    </div>
                    <Link
                      href={`/support/${vm.selected.id}/`}
                      className="rounded-xl bg-[#FCF8FA] px-2.5 py-1 text-[11px] font-bold text-[#765E6B] hover:bg-[#FAF0F5]"
                    >
                      Plein écran
                    </Link>
                  </div>
                  <h3 className="text-lg font-bold text-[#30202C]">{vm.selected.subject}</h3>
                  <p className="text-[13px] text-[#765E6B]">
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
                    <p className="text-sm text-[#765E6B]">Chargement des messages…</p>
                  ) : vm.messages.length === 0 ? (
                    <p className="text-sm text-[#765E6B]">Aucun message.</p>
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
                                ? "bg-[#FCE9F4] text-[#981C52]"
                                : "bg-[#FFF1F7] text-[#831D4A]",
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
                              <span className="text-sm font-bold text-[#30202C]">
                                {m.senderName ?? (mine ? "Vous" : "Support")}
                              </span>
                              {!mine ? (
                                <span className="rounded bg-[#FCE9F4] px-1.5 py-0.5 text-[10px] font-bold text-[#981C52]">
                                  SUPPORT
                                </span>
                              ) : null}
                              <span className="text-[11px] text-[#765E6B]">
                                {formatClock(m.createdAt)}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-2xl p-3 text-[13px] text-[#30202C] shadow-sm",
                                mine
                                  ? "rounded-tl-none bg-[#FFF7FB]"
                                  : "rounded-tr-none bg-[#FCF8FA]",
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
                  <div className="flex flex-col gap-2 border-t border-[#F4EDF0] pt-3">
                    <textarea
                      value={vm.reply}
                      onChange={(e) => vm.onReplyChange(e.target.value)}
                      rows={3}
                      placeholder="Écrire une réponse…"
                      className="w-full rounded-xl border border-[#F0E4EA] bg-[#FCF8FA] p-3 text-[13px] text-[#30202C] outline-none placeholder:text-[#B69CA9] focus:border-[#C95483] focus:ring-2 focus:ring-pink-100"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Paperclip className="h-5 w-5 text-[#C88BA6]" aria-hidden />
                      <button
                        type="button"
                        disabled={vm.sending || !vm.reply.trim()}
                        onClick={vm.onSendReply}
                        className="flex items-center gap-1.5 rounded-xl bg-[#981C52] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#7d1643] disabled:opacity-50"
                      >
                        Envoyer
                        <Send className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
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
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-[#F1E8EC] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E7B9CD] hover:shadow-md">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#765E6B]">{label}</span>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div
          className={cn(
            "text-[36px] font-extrabold leading-none tracking-tight xl:text-[40px]",
            accent === "primary" && "text-[#981C52]",
            accent === "secondary" && "text-amber-700",
            accent === "done" && "text-emerald-700",
            !accent && "text-[#30202C]",
          )}
        >
          {value}
        </div>
        <span className="rounded-lg bg-[#FCF8FA] px-2 py-0.5 text-[11px] font-semibold text-[#765E6B]">
          {hint}
        </span>
      </div>
      {bar != null ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#F6EAF0]">
          <div className="h-full rounded-full bg-[#981C52]" style={{ width: `${bar}%` }} />
        </div>
      ) : null}
    </div>
  );
}
