"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, MessageCircle, Search, Send, Settings, Shield, Star } from "lucide-react";
import {
  type ReviewSort,
  type ReviewTab,
  followUpText,
  formatReviewWhen,
  initials,
  starsFor,
  waHref,
} from "@/components/reviews/reviews-helpers";
import { cn } from "@/lib/utils";
import type {
  ReviewAlertItem,
  ReviewKpis,
  ReviewRequestItem,
  ReviewSatisfaction,
  StaffReviewScore,
} from "@/types/review";
import { REVIEW_SATISFACTION_LABEL } from "@/types/review";

type Insight = {
  headline: string;
  detail: string;
  excellence: { name: string; count: number }[];
  friction: { name: string; count: number }[];
  remaining: number | null;
};

const TABS: { id: ReviewTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "pending", label: "À envoyer" },
  { id: "awaiting", label: "À noter" },
  { id: "positive", label: "Positifs" },
  { id: "sensitive", label: "Sensibles" },
  { id: "recorded", label: "Saisis" },
];

export type ReviewsMobileProps = {
  orgName: string;
  roleLabel: string;
  directorName: string;
  kpis: ReviewKpis | null;
  insight: Insight;
  alerts: ReviewAlertItem[];
  search: string;
  onSearch: (v: string) => void;
  tab: ReviewTab;
  onTab: (t: ReviewTab) => void;
  counts: Record<ReviewTab, number>;
  sort: ReviewSort;
  onSort: (s: ReviewSort) => void;
  loading: boolean;
  rows: ReviewRequestItem[];
  selected: ReviewRequestItem | null;
  onSelect: (id: string) => void;
  canSend: boolean;
  canSettings: boolean;
  onSettings: () => void;
  onSolicit: () => void;
  submitting: boolean;
  onMarkSent: (item: ReviewRequestItem) => void;
  onSkip: (id: string) => void;
  onSatisfaction: (id: string, s: ReviewSatisfaction) => void;
  staffScores: StaffReviewScore[];
  googleUrl: string | null;
  settingsEnabled: boolean;
  delayHours: number;
  onCopy: (text: string, label: string) => void;
};

export function ReviewsMobile(props: ReviewsMobileProps) {
  const [view, setView] = useState<"list" | "focus">("list");
  const selected = props.selected;

  if (view === "focus" && selected) {
    return <FocusMobile {...props} selected={selected} onBack={() => setView("list")} />;
  }

  const { kpis, insight, alerts } = props;
  const monthDelta =
    kpis && kpis.recordedPrevMonth > 0
      ? Math.round(((kpis.recordedThisMonth - kpis.recordedPrevMonth) / kpis.recordedPrevMonth) * 100)
      : null;

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <section className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#261900]">
            <Shield size={13} />
            {props.roleLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[11px] font-bold uppercase text-ink/60">
            <Star size={13} className="text-[#7B5900]" />
            Collecte interne
          </span>
        </div>
        <h1 className="text-[28px] font-bold leading-9">Avis & réputation</h1>
        <p className="text-[13px] text-ink/55">
          Demandes après RDV, notes internes, suivi WhatsApp manuel — pas de publication Google automatique.
        </p>
        <div className="space-y-2">
          {props.canSend ? (
            <button
              type="button"
              onClick={props.onSolicit}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-bold text-white shadow-sm"
            >
              <Send size={18} />
              Solliciter ({props.counts.pending})
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {props.canSettings ? (
              <button
                type="button"
                onClick={props.onSettings}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FFEFF8] text-[12px] font-semibold"
              >
                <Settings size={16} />
                Paramètres
              </button>
            ) : (
              <span />
            )}
            <Link
              href="/whatsapp/"
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FFEFF8] text-[12px] font-semibold"
            >
              <MessageCircle size={16} />
              WhatsApp
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-[#382D36] p-4 text-[#FEECF7] shadow-sm">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
            alerts.length ? "bg-[#FFDAD6] text-[#93000A]" : "bg-white/10 text-[#FFDEA4]",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", alerts.length ? "animate-ping bg-[#BA1A1A]" : "bg-emerald-400")} />
          {alerts.length ? "Alerte insatisfaction" : "Veille interne"}
        </span>
        <p className="mt-3 text-[14px] font-semibold leading-snug text-white">{insight.headline}</p>
        <p className="mt-1 text-[12px] text-[#F0DDE9]">{insight.detail}</p>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {insight.excellence[0] ? (
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px]">
              {insight.excellence[0].name} ({insight.excellence[0].count})
            </span>
          ) : null}
          {insight.friction[0] ? (
            <span className="shrink-0 rounded-full bg-[#BA1A1A]/40 px-2.5 py-1 text-[11px] text-[#FFB2BD]">
              {insight.friction[0].name}
            </span>
          ) : null}
          {insight.remaining ? (
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px]">
              {insight.remaining} avis 5★ pour viser 4,8
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <KpiMini
          label="Note moyenne"
          value={kpis?.averageScore != null ? String(kpis.averageScore).replace(".", ",") : "—"}
          hint={kpis ? `${kpis.recordedCount} avis saisis` : ""}
        />
        <KpiMini label="Total saisis" value={kpis ? String(kpis.recordedCount) : "—"} hint="Interne, 3 niveaux" />
        <KpiMini
          label="Ce mois"
          value={kpis ? String(kpis.recordedThisMonth) : "—"}
          hint={monthDelta != null ? `${monthDelta > 0 ? "+" : ""}${monthDelta} % vs m-1` : "Saisies du mois"}
        />
        <KpiMini
          label="Positifs"
          value={kpis ? String(kpis.positiveCount) : "—"}
          hint={kpis?.satisfiedPercent != null ? `${String(kpis.satisfiedPercent).replace(".", ",")} %` : "4★ et 5★ internes"}
        />
        <KpiMini
          label="Sensibles"
          value={kpis ? String(kpis.sensitiveCount) : "—"}
          hint={alerts.length ? `${alerts.length} alerte${alerts.length > 1 ? "s" : ""}` : "Insatisfaites"}
          danger
        />
        <KpiMini
          label="À traiter"
          value={kpis ? String(kpis.pendingToSend + kpis.awaitingRecord) : "—"}
          hint={`${kpis?.pendingToSend ?? 0} envoi · ${kpis?.awaitingRecord ?? 0} note`}
        />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="text-[18px] font-bold">Répartition interne</h3>
        <StarBar label="5★" count={kpis?.verySatisfiedCount ?? 0} total={kpis?.recordedCount ?? 0} color="bg-primary" />
        <StarBar label="4★" count={kpis?.satisfiedCount ?? 0} total={kpis?.recordedCount ?? 0} color="bg-[#FCCA66]" />
        <StarBar label="1★" count={kpis?.dissatisfiedCount ?? 0} total={kpis?.recordedCount ?? 0} color="bg-[#BA1A1A]" />
        <p className="text-[12px] text-ink/45">Pas de 2★ / 3★ : le produit ne saisit que trois niveaux.</p>
        <div className="flex gap-2 rounded-xl bg-[#F6E3EF] p-3 text-[12px] text-ink/70">
          <Shield size={16} className="mt-0.5 shrink-0 text-[#7B5900]" />
          {props.settingsEnabled
            ? `Déclenchement ${props.delayHours} h après RDV terminé. WhatsApp manuel. ${props.googleUrl ? "Lien Google proposé si la cliente est satisfaite." : "Aucun lien Google configuré."}`
            : "Collecte désactivée dans les paramètres."}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => props.onTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold",
                props.tab === t.id ? "bg-primary text-white" : "bg-[#FFEFF8] text-ink",
              )}
            >
              {t.label} ({props.counts[t.id]})
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="Cliente, soin, praticienne…"
            className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-[13px] shadow-sm outline-none"
          />
        </div>
      </section>

      <section className="space-y-3">
        {props.loading ? (
          <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/45">Chargement…</p>
        ) : props.rows.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-[13px] text-ink/45">Aucun élément sur ce filtre.</p>
        ) : (
          props.rows.map((item) => {
            const stars = starsFor(item);
            const alert = item.satisfaction === "DISSATISFIED";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  props.onSelect(item.id);
                  setView("focus");
                }}
                className="w-full space-y-2 rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold",
                        alert ? "bg-[#FFDAD6] text-[#93000A]" : "bg-[#F6E3EF]",
                      )}
                    >
                      {initials(item.customerName)}
                    </span>
                    <div>
                      <p className="text-[15px] font-bold">{item.customerName}</p>
                      <p className="text-[12px] text-ink/50">
                        {item.serviceName}
                        {item.staffName ? ` · ${item.staffName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Stars n={stars} />
                    <p className="text-[11px] text-ink/40">
                      {formatReviewWhen(item.satisfactionRecordedAt ?? item.sentAt ?? item.completedAt)}
                    </p>
                  </div>
                </div>
                {item.status === "PENDING" ? (
                  <p className="text-[12px] font-semibold text-primary">Demande à envoyer</p>
                ) : item.status === "SENT" ? (
                  <p className="text-[12px] font-semibold text-[#7B5900]">Satisfaction à saisir</p>
                ) : item.satisfaction ? (
                  <p className="text-[13px] text-ink/70">{REVIEW_SATISFACTION_LABEL[item.satisfaction]}</p>
                ) : null}
              </button>
            );
          })
        )}
      </section>

      {props.staffScores.length > 0 ? (
        <section className="space-y-2 rounded-2xl bg-[#FFEFF8] p-4 shadow-sm">
          <h3 className="text-[18px] font-bold">Note par praticienne</h3>
          {props.staffScores.map((s, i) => (
            <div key={s.staffId} className="flex items-center justify-between rounded-xl bg-white p-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCE9F4] text-[13px] font-bold">
                  {s.initials}
                </span>
                <div>
                  <p className="text-[14px] font-bold">{s.staffName}</p>
                  <p className="text-[11px] text-ink/45">
                    {s.reviewCount} avis · #{i + 1}
                  </p>
                </div>
              </div>
              <p className="text-[15px] font-bold">
                {s.averageScore != null ? String(s.averageScore).replace(".", ",") : "—"}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <footer className="rounded-2xl bg-[#FCE9F4] p-4 text-center text-[11px] text-ink/50">
        <p className="flex items-center justify-center gap-1 font-bold text-ink">
          <Lock size={14} className="text-[#7B5900]" />
          CNDP 09-08 · opt-in WhatsApp
        </p>
        <p className="mt-1">Notes internes isolées par institut. Aucune publication Google automatique.</p>
      </footer>
    </div>
  );
}

function FocusMobile({
  selected,
  onBack,
  ...props
}: ReviewsMobileProps & { selected: ReviewRequestItem; onBack: () => void }) {
  const [tone, setTone] = useState<"warm" | "formal">("warm");
  const follow = followUpText(selected, props.orgName, props.directorName, tone);
  const requestHref = selected.phoneSnapshot ? waHref(selected.phoneSnapshot, selected.messageSnapshot) : null;
  const followHref = selected.phoneSnapshot ? waHref(selected.phoneSnapshot, follow) : null;
  const stars = starsFor(selected);

  return (
    <div className="w-full space-y-4 pb-8 lg:hidden">
      <button type="button" className="text-[13px] font-semibold text-primary" onClick={onBack}>
        ← Avis
      </button>
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[18px] font-bold">{selected.customerName}</p>
          <Stars n={stars} />
        </div>
        <p className="text-[13px] text-ink/55">
          {selected.serviceName}
          {selected.staffName ? ` · ${selected.staffName}` : ""}
        </p>
        <p className="text-[12px] text-ink/40">{formatReviewWhen(selected.completedAt)} · RDV terminé</p>

        {selected.status === "PENDING" ? (
          <>
            <pre className="whitespace-pre-wrap rounded-xl bg-[#FFEFF8] p-3 text-[13px] leading-relaxed">
              {selected.messageSnapshot}
            </pre>
            {props.canSend ? (
              <div className="grid gap-2">
                {requestHref ? (
                  <a
                    href={requestHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-bold text-white"
                  >
                    Ouvrir WhatsApp
                  </a>
                ) : null}
                <button
                  type="button"
                  disabled={props.submitting || !selected.whatsappTaskId}
                  onClick={() => props.onMarkSent(selected)}
                  className="h-11 rounded-xl bg-primary text-[13px] font-bold text-white disabled:opacity-40"
                >
                  Marquer envoyé
                </button>
                <button
                  type="button"
                  disabled={props.submitting}
                  onClick={() => props.onSkip(selected.id)}
                  className="h-11 rounded-xl bg-[#F6E3EF] text-[13px] font-semibold"
                >
                  Ignorer
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {selected.status === "SENT" && props.canSend ? (
          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink/40">Saisir la satisfaction</p>
            {(["VERY_SATISFIED", "SATISFIED", "DISSATISFIED"] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={props.submitting}
                onClick={() => props.onSatisfaction(selected.id, s)}
                className="h-11 w-full rounded-xl bg-[#FFEFF8] text-[13px] font-semibold"
              >
                {REVIEW_SATISFACTION_LABEL[s]}
              </button>
            ))}
          </div>
        ) : null}

        {selected.satisfaction === "DISSATISFIED" ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTone("warm")}
                className={cn("h-9 flex-1 rounded-lg text-[12px] font-semibold", tone === "warm" ? "bg-primary text-white" : "bg-[#FFEFF8]")}
              >
                Conciliant
              </button>
              <button
                type="button"
                onClick={() => setTone("formal")}
                className={cn("h-9 flex-1 rounded-lg text-[12px] font-semibold", tone === "formal" ? "bg-primary text-white" : "bg-[#FFEFF8]")}
              >
                Plus formel
              </button>
            </div>
            <p className="rounded-xl bg-[#FFEFF8] p-3 text-[12px] italic leading-relaxed">{follow}</p>
            <div className="grid grid-cols-2 gap-2">
              {followHref ? (
                <a
                  href={followHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center rounded-lg bg-emerald-600 text-[12px] font-bold text-white"
                >
                  WhatsApp
                </a>
              ) : (
                <span className="flex h-10 items-center justify-center rounded-lg bg-[#F6E3EF] text-[12px] text-ink/40">
                  Sans tél.
                </span>
              )}
              <button
                type="button"
                onClick={() => props.onCopy(follow, "Texte copié")}
                className="h-10 rounded-lg bg-[#FCE9F4] text-[12px] font-semibold"
              >
                Copier
              </button>
            </div>
          </div>
        ) : null}

        {selected.satisfaction === "VERY_SATISFIED" || selected.satisfaction === "SATISFIED" ? (
          selected.googleReviewUrl ? (
            <a
              href={selected.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7B5900] text-[13px] font-bold text-white"
            >
              Ouvrir le lien Google
            </a>
          ) : (
            <p className="text-[12px] text-ink/45">Aucun lien Google configuré.</p>
          )
        ) : null}

        <Link
          href={`/customers/${selected.customerId}/`}
          className="flex h-10 items-center justify-center rounded-lg bg-[#FFEFF8] text-[13px] font-semibold"
        >
          Fiche cliente
        </Link>
      </section>
    </div>
  );
}

function KpiMini({ label, value, hint, danger }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-ink/45">{label}</p>
      <p className={cn("mt-1 text-[22px] font-bold", danger && "text-[#BA1A1A]")}>{value}</p>
      <p className="text-[11px] text-ink/45">{hint}</p>
    </div>
  );
}

function StarBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="w-8 font-semibold">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F0DDE9]">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right text-[12px]">
        {count} ({pct} %)
      </span>
    </div>
  );
}

function Stars({ n }: { n: number | null }) {
  if (n == null) return <span className="text-[11px] text-ink/35">—</span>;
  return (
    <span className="flex text-[#7B5900]">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} fill={i < n ? "currentColor" : "none"} className={i < n ? "" : "text-[#E4BDC2]"} />
      ))}
    </span>
  );
}
