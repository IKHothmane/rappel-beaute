"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Cake,
  Lock,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import {
  APPOINTMENT_STATUS_UI,
  averageVisitGapDays,
  customerInitials,
  favoriteService,
  formatRelativeVisit,
  segmentBadge,
  shortCustomerRef,
  whatsappHref,
} from "@/components/customers/customers-helpers";
import { formatMad } from "@/modules/analytics/service";
import {
  formatLastVisit,
  getCustomer,
  getCustomerStats,
  listCustomerNotes,
} from "@/modules/customers/service";
import { getCustomerLoyalty, LOYALTY_LEVEL_LABEL } from "@/modules/loyalty/service";
import { cn } from "@/lib/utils";
import type { CustomerAppointmentHistory, CustomerDetail, CustomerListItem } from "@/types/customer";
import type { Customer360Stats, CustomerNoteItem } from "@/types/customer-360";
import type { CustomerLoyaltyView } from "@/types/loyalty";

type PreviewTab = "rdv" | "fidelity" | "notes";

type CustomerPreviewPaneProps = {
  customerId: string;
  fallback: CustomerListItem;
  canWrite: boolean;
  onEdit: () => void;
};

export function CustomerPreviewPane({ customerId, fallback, canWrite, onEdit }: CustomerPreviewPaneProps) {
  const [tab, setTab] = useState<PreviewTab>("rdv");
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [history, setHistory] = useState<CustomerAppointmentHistory[]>([]);
  const [stats, setStats] = useState<Customer360Stats | null>(null);
  const [notes, setNotes] = useState<CustomerNoteItem[]>([]);
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTab("rdv");
    (async () => {
      const [detail, s, n, loy] = await Promise.allSettled([
        getCustomer(customerId, true),
        getCustomerStats(customerId),
        listCustomerNotes(customerId),
        getCustomerLoyalty(customerId),
      ]);
      if (cancelled) return;
      if (detail.status === "fulfilled") {
        setCustomer(detail.value.customer);
        setHistory(detail.value.history ?? []);
      } else {
        setCustomer(null);
        setHistory([]);
      }
      setStats(s.status === "fulfilled" ? s.value : null);
      setNotes(n.status === "fulfilled" ? n.value : []);
      setLoyalty(loy.status === "fulfilled" ? loy.value : null);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const person = customer ?? fallback;
  const badge = segmentBadge(person.segment);
  const visits = stats?.visits ?? person.visits;
  const spent = person.revenue;
  const ticket = person.averageTicket;
  const lastVisit = stats?.lastVisitAt ?? person.lastVisitAt;
  const noShows = stats?.noShowCount ?? person.noShowCount;
  const points = stats?.loyaltyPoints ?? loyalty?.account?.balance ?? 0;
  const fav = useMemo(() => favoriteService(history), [history]);
  const cycle = useMemo(() => averageVisitGapDays(history), [history]);
  const latestNote = notes[0] ?? null;
  const honorRate = visits + noShows > 0 ? Math.round((visits / (visits + noShows)) * 100) : null;
  const riskLow = (noShows ?? 0) <= 1;
  const birth = customer?.birthDate
    ? new Date(customer.birthDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;
  const age = customer?.birthDate
    ? (() => {
        const b = new Date(customer.birthDate);
        const now = new Date();
        let years = now.getFullYear() - b.getFullYear();
        if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) {
          years -= 1;
        }
        return Math.max(0, years);
      })()
    : null;

  return (
    <aside className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-lg font-bold text-primary shadow-sm">
              {customerInitials(person.firstName, person.lastName)}
            </div>
            {person.segment === "VIP" ? (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#7B5900] text-[10px] text-white shadow-sm">
                ★
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-[22px] font-bold leading-7 text-ink">
                {person.firstName} {person.lastName}
              </h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", badge.className)}>
                {badge.label}
                {loyalty?.account ? ` ${LOYALTY_LEVEL_LABEL[loyalty.account.level]}` : ""}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {person.segment === "AT_RISK"
                ? "Sans visite récente"
                : person.segment === "NEW"
                  ? "Nouvelle cliente"
                  : "Fiche 360°"}
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink/40">{shortCustomerRef(person.id)}</p>
          </div>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-[#FCE9F4] p-2 text-ink/50 hover:bg-[#F6E3EF]"
            title="Modifier le profil"
          >
            <Pencil size={18} />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#FFEFF8] p-2 text-[12px] text-ink">
        <p className="flex items-center gap-2 font-mono">
          <Phone size={14} className="text-ink/40" />
          {person.phone}
        </p>
        <p className="flex min-w-0 items-center gap-2 truncate">
          <Mail size={14} className="shrink-0 text-ink/40" />
          <span className="truncate">{person.email || "Pas d’e-mail"}</span>
        </p>
        <p className="flex items-center gap-2">
          <Cake size={14} className="text-ink/40" />
          {birth ? `${birth}${age ? ` (${age} ans)` : ""}` : "Anniversaire —"}
        </p>
        <p className="flex items-center gap-2">
          <Star size={14} className="text-ink/40" />
          {visits} {visits > 1 ? "visites" : "visite"}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Link
          href={`/agenda/?customerId=${person.id}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white shadow-sm"
        >
          <CalendarDays size={14} />
          Nouveau RDV
        </Link>
        <a
          href={whatsappHref(person.phone, person.firstName)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white shadow-sm"
        >
          <MessageCircle size={14} />
          WhatsApp
        </a>
        <Link
          href={`/payments/?customerId=${person.id}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#FCE9F4] px-3 text-[12px] font-semibold text-ink"
        >
          <Wallet size={14} />
          Encaisser
        </Link>
        <Link
          href={`/loyalty/?customerId=${person.id}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#FCE9F4] px-3 text-[12px] font-semibold text-[#7B5900]"
        >
          <Star size={14} />
          Fidélité
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniKpi label="Visites" value={String(visits)} hint={honorRate != null ? `${honorRate} % honorés` : "—"} />
        <MiniKpi label="Dépensé" value={formatMad(spent)} hint={`Moy. ${formatMad(ticket)}`} />
        <MiniKpi label="Points" value={String(points)} hint={loyalty?.nextReward ? loyalty.nextReward.name : "Fidélité"} gold />
        <MiniKpi label="Dernier" value={formatRelativeVisit(lastVisit)} hint={formatLastVisit(lastVisit)} />
      </div>

      {cycle != null || fav ? (
        <div className="flex flex-col gap-2 rounded-xl bg-[#F6E3EF] p-3">
          <div className="flex items-center gap-1.5 text-primary">
            <Sparkles size={16} />
            <span className="text-[11px] font-bold uppercase tracking-wider">À partir de l’historique</span>
            {cycle != null ? (
              <span className="ml-auto rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                Cycle {cycle} j
              </span>
            ) : null}
          </div>
          <p className="text-[13px] leading-5 text-ink/70">
            {cycle != null ? `Espacement moyen entre visites honorées : ${cycle} jours. ` : ""}
            {fav ? `Soin le plus fréquent : ${fav}.` : "Pas encore assez de visites pour un soin favori."}
          </p>
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto pb-1 text-[12px]">
        {(
          [
            ["rdv", `Rendez-vous (${history.length})`],
            ["fidelity", "Fidélité"],
            ["notes", `Notes (${notes.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold",
              tab === id ? "bg-[#FCE9F4] text-primary" : "text-ink/50 hover:bg-[#FFEFF8]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-6 text-center text-xs text-ink/40">Chargement de la fiche…</p>
      ) : tab === "rdv" ? (
        <div className="flex flex-col gap-2">
          {loyalty?.nextReward && points >= loyalty.nextReward.pointsCost ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FCCA66]/20 p-2">
              <p className="text-[12px] font-bold text-[#7B5900]">{loyalty.nextReward.name}</p>
              <Link href={`/loyalty/?customerId=${person.id}`} className="shrink-0 text-[11px] font-semibold text-primary">
                Voir fidélité
              </Link>
            </div>
          ) : null}
          {history.length === 0 ? (
            <p className="text-xs text-ink/45">Aucun rendez-vous enregistré.</p>
          ) : (
            history.slice(0, 6).map((item) => {
              const st = APPOINTMENT_STATUS_UI[item.status] ?? APPOINTMENT_STATUS_UI.PENDING;
              return (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#FFEFF8] p-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{item.serviceName}</p>
                    <p className="text-[11px] text-ink/45">
                      {new Date(item.startAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.staffFirstName ? ` · ${item.staffFirstName}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] font-bold">{formatMad(item.price)}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", st.className)}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div
            className={cn(
              "flex items-center justify-between rounded-xl p-2.5 text-[12px] font-bold",
              riskLow ? "bg-emerald-500/5 text-emerald-800" : "bg-rose-50 text-rose-800",
            )}
          >
            <span>
              No-shows : {noShows} {riskLow ? "· risque faible" : "· à surveiller"}
            </span>
          </div>
        </div>
      ) : tab === "fidelity" ? (
        <div className="space-y-2 text-[13px] text-ink/70">
          <p>
            Solde : <strong className="text-ink">{points} pts</strong>
            {loyalty?.account ? ` · ${LOYALTY_LEVEL_LABEL[loyalty.account.level]}` : ""}
          </p>
          {loyalty?.nextReward ? (
            <p>
              Prochaine récompense : {loyalty.nextReward.name}
              {loyalty.pointsToNextReward != null ? ` · encore ${loyalty.pointsToNextReward} pts` : ""}
            </p>
          ) : (
            <p>Aucune récompense configurée pour le moment.</p>
          )}
          <Link href={`/loyalty/?customerId=${person.id}`} className="inline-block font-semibold text-primary">
            Ouvrir la fidélité
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-[#FCE9F4] p-3">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-ink">
            <Lock size={12} />
            Notes internes
          </p>
          {latestNote ? (
            <>
              <p className="text-[12px] italic leading-5 text-ink/60">« {latestNote.content} »</p>
              <p className="mt-1 text-[10px] text-ink/40">
                {latestNote.authorName ?? "Équipe"} · {formatLastVisit(latestNote.createdAt)}
              </p>
            </>
          ) : customer?.notes ? (
            <p className="text-[12px] italic leading-5 text-ink/60">« {customer.notes} »</p>
          ) : (
            <p className="text-xs text-ink/45">Aucune note interne.</p>
          )}
        </div>
      )}

      <Link
        href={`/customers/${person.id}/`}
        className="mt-1 flex h-10 items-center justify-center rounded-lg bg-[#F6E3EF] text-[13px] font-bold text-primary"
      >
        Ouvrir la fiche complète
      </Link>
    </aside>
  );
}

function MiniKpi({
  label,
  value,
  hint,
  gold,
}: {
  label: string;
  value: string;
  hint: string;
  gold?: boolean;
}) {
  return (
    <div className={cn("rounded-xl p-2.5 text-center", gold ? "bg-[#FCCA66]/20" : "bg-[#FCE9F4]")}>
      <p className={cn("text-[10px] font-semibold uppercase", gold ? "text-[#7B5900]" : "text-ink/45")}>{label}</p>
      <p className={cn("mt-0.5 truncate text-[18px] font-bold", gold ? "text-[#7B5900]" : "text-ink")}>{value}</p>
      <p className={cn("truncate text-[10px]", gold ? "text-[#7B5900]" : "text-ink/45")}>{hint}</p>
    </div>
  );
}
