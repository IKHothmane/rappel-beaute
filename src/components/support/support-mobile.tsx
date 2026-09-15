"use client";

import Link from "next/link";
import {
  Bug,
  CheckCircle2,
  Headphones,
  Lightbulb,
  MapPin,
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
  formatClock,
  priorityTone,
  relativeTime,
  statusTone,
  ticketRef,
  type SupportViewModel,
} from "@/components/support/support-helpers";
import { cn } from "@/lib/utils";

export function SupportMobile({ vm }: { vm: SupportViewModel }) {
  const focus =
    vm.selected ??
    vm.filtered.find((t) => t.priority === "URGENT" && t.status !== "CLOSED") ??
    vm.filtered[0] ??
    null;

  return (
    <div className="flex flex-col gap-4 pb-4 lg:hidden">
      <section className="flex flex-col gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container-highest px-2.5 py-1 text-[11px] font-bold tracking-wider text-on-surface shadow-sm">
            {vm.roleLabel}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 text-[11px] font-bold text-on-secondary-fixed shadow-sm">
            Assistance
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
            <Shield className="h-3 w-3 text-secondary" />
            CNDP 09-08
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
            <MapPin className="h-3 w-3 text-primary" />
            {vm.orgName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary shadow-sm">
            <Headphones className="h-5 w-5" />
          </div>
          <h2 className="text-[22px] font-bold text-on-surface">Conciergerie Métier</h2>
        </div>
        <p className="text-[13px] leading-relaxed text-on-surface-variant">
          Assistance dédiée pour la gérance de votre institut. Suivez vos tickets en temps réel.
        </p>

        {vm.canWrite ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => vm.onOpenModal("ticket")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-sm font-bold text-on-primary shadow-md active:scale-[0.99]"
            >
              + Nouveau Ticket Métier
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => vm.onOpenModal("bug")}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-surface-container text-[11px] font-semibold text-on-surface"
              >
                <Bug className="h-4 w-4 text-error" />
                Signaler Bug
              </button>
              <button
                type="button"
                onClick={() => vm.onOpenModal("feature")}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-surface-container text-[11px] font-semibold text-on-surface"
              >
                <Lightbulb className="h-4 w-4 text-secondary" />
                Suggérer
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* SLA + KPIs */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest px-3.5 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold text-on-surface">
              1ère réponse :{" "}
              {vm.avgResponseMin != null ? `${vm.avgResponseMin} min` : "—"}
            </span>
          </div>
          <span className="rounded-full bg-primary-fixed/40 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {vm.avgResponseMin != null ? "Mesuré" : "En attente"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniKpi label="Total" value={vm.counters.total} hint={`${vm.counters.thisMonth} ce mois`} />
          <MiniKpi
            label="Ouverts"
            value={vm.counters.open}
            hint={
              vm.counters.urgentOpen > 0
                ? `${vm.counters.urgentOpen} urgent`
                : "RAS"
            }
            accent
          />
          <MiniKpi label="En attente" value={vm.counters.waiting} hint="Support" />
          <MiniKpi label="Résolus" value={vm.counters.resolved} hint="Clôturés" />
        </div>
      </section>

      {/* Search + filters */}
      <section className="flex flex-col gap-2">
        <input
          value={vm.search}
          onChange={(e) => vm.onSearch(e.target.value)}
          placeholder="Rechercher (#RB-…, mot-clé)…"
          className="h-11 w-full rounded-lg bg-surface-container-lowest px-4 text-[13px] text-on-surface shadow-sm placeholder:text-outline focus:outline-none"
        />
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {TICKET_FILTERS.map((f) => {
            const active = vm.filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => vm.onFilter(f.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-lowest font-semibold text-on-surface-variant",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Focus ticket */}
      {focus ? (
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Focus ticket
            </span>
            <button
              type="button"
              onClick={() => vm.onSelect(focus.id)}
              className="text-[11px] text-on-surface-variant"
            >
              {ticketRef(focus)}
            </button>
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-md">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      priorityTone(focus.priority),
                    )}
                  >
                    {SUPPORT_PRIORITY_LABEL[focus.priority] ?? focus.priority}
                  </span>
                  <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-semibold text-on-primary-fixed">
                    {ticketRef(focus)}
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  {relativeTime(focus.lastMessageAt ?? focus.updatedAt)}
                </span>
              </div>
              <h3 className="text-lg font-bold leading-snug text-on-surface">{focus.subject}</h3>
              {focus.lastMessagePreview ? (
                <p className="text-[13px] text-on-surface-variant">{focus.lastMessagePreview}</p>
              ) : null}
            </div>

            {vm.selectedId === focus.id ? (
              <div className="space-y-2 pt-1">
                {vm.messagesLoading ? (
                  <p className="text-[13px] text-on-surface-variant">Chargement…</p>
                ) : (
                  vm.messages.slice(-4).map((m) => {
                    const mine = m.senderType === "INSTITUT";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex flex-col gap-1 rounded-lg p-3",
                          mine ? "bg-surface-container-low" : "ml-3 bg-surface-container",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-on-surface">
                            {m.senderName ?? (mine ? "Vous" : "Support")}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {formatClock(m.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13px] text-on-surface">{m.message}</p>
                      </div>
                    );
                  })
                )}
                {vm.canWrite && focus.status !== "CLOSED" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={vm.reply}
                      onChange={(e) => vm.onReplyChange(e.target.value)}
                      placeholder="Répondre…"
                      className="h-11 flex-1 rounded-lg bg-surface-container-low px-3 text-[13px] outline-none"
                    />
                    <button
                      type="button"
                      disabled={vm.sending || !vm.reply.trim()}
                      onClick={vm.onSendReply}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-sm disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => vm.onSelect(focus.id)}
                className="h-10 rounded-lg bg-surface-container text-sm font-bold text-on-surface"
              >
                Ouvrir la conversation
              </button>
            )}

            <div className="flex items-center justify-between pt-1">
              <Link
                href={`/support/${focus.id}/`}
                className="flex items-center gap-1 text-[11px] font-bold text-primary"
              >
                Voir le dossier
              </Link>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  statusTone(focus.status),
                )}
              >
                {SUPPORT_STATUS_LABEL[focus.status]}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Other tickets */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface">
            Autres dossiers
          </span>
          <span className="text-[11px] font-semibold text-primary">
            {vm.filtered.length} ticket{vm.filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : vm.filtered.length === 0 ? (
          <div className="rounded-xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant">
            Aucun ticket.
          </div>
        ) : (
          vm.filtered
            .filter((t) => t.id !== focus?.id)
            .slice(0, 8)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => vm.onSelect(t.id)}
                className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-3.5 text-left shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        priorityTone(t.priority),
                      )}
                    >
                      {SUPPORT_PRIORITY_LABEL[t.priority] ?? t.priority}
                    </span>
                    <span className="text-[11px] font-bold text-on-surface">{ticketRef(t)}</span>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-semibold",
                      t.status === "RESOLVED" || t.status === "CLOSED"
                        ? "text-secondary"
                        : "text-on-surface-variant",
                    )}
                  >
                    {SUPPORT_STATUS_LABEL[t.status]}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface">{t.subject}</h4>
                {t.lastMessagePreview ? (
                  <p className="line-clamp-1 text-[13px] text-on-surface-variant">
                    {t.lastMessagePreview}
                  </p>
                ) : null}
                <div className="flex items-center justify-between pt-1 text-[11px] text-on-surface-variant">
                  <span>{SUPPORT_CATEGORY_LABEL[t.category]}</span>
                  <span>{relativeTime(t.lastMessageAt ?? t.updatedAt)}</span>
                </div>
              </button>
            ))
        )}
      </section>

      {/* AI + guides */}
      <section className="flex flex-col gap-3 rounded-xl bg-inverse-surface p-4 text-inverse-on-surface shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/20 text-secondary-fixed">
              <Sparkles className="h-[18px] w-[18px]" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wide text-secondary-fixed">
              Liens express
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {DIAGNOSTIC_ACTIONS.slice(0, 3).map((a) => (
            <Link
              key={a.id}
              href={a.href}
              className="flex items-center justify-between rounded-lg bg-white/5 p-2.5"
            >
              <span className="flex items-center gap-2 text-[11px] font-medium text-surface-bright">
                <Zap className="h-[18px] w-[18px] text-secondary-fixed" />
                {a.label}
              </span>
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {KNOWLEDGE_GUIDES.slice(0, 2).map((g) => {
            const Icon = g.icon;
            return (
              <Link key={g.id} href={g.href} className="flex flex-col gap-1 rounded-lg bg-white/5 p-2.5">
                <Icon className="h-4 w-4 text-secondary-fixed" />
                <span className="line-clamp-1 text-[11px] font-bold text-surface-bright">
                  {g.title}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-surface-container-high p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
              Assistance institut
            </span>
            <p className="text-lg font-extrabold tracking-tight text-on-surface">Via ticket dédié</p>
          </div>
        </div>
        <p className="text-[13px] text-on-surface-variant">
          Pour une urgence caisse, agenda ou TPE, créez un ticket prioritaire depuis ce centre.
        </p>
        {vm.canWrite ? (
          <button
            type="button"
            onClick={() => vm.onOpenModal("ticket")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-surface-container-lowest text-sm font-bold text-primary shadow-sm"
          >
            Ouvrir un ticket
          </button>
        ) : null}
      </section>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-3.5 shadow-sm">
      <span
        className={cn(
          "text-[11px] font-bold uppercase tracking-wider",
          accent ? "text-primary" : "text-on-surface-variant",
        )}
      >
        {label}
      </span>
      <div className="mt-2">
        <div className={cn("text-[22px] font-extrabold", accent && "text-primary")}>{value}</div>
        <p className="mt-0.5 text-[11px] text-on-surface-variant">{hint}</p>
      </div>
    </div>
  );
}
