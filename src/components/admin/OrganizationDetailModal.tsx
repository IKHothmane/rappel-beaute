"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CreditCard,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Phone,
  Play,
  Trash2,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import { PLAN_LABEL } from "@/types/platform";
import type { OrganizationDetail, OrganizationListItem } from "@/types/platform";
import { OrganizationCover, StatusPill, type OrganizationCard } from "./OrganizationsView";

type Insights = {
  services: { name: string; category: string | null }[];
  team: { name: string; position: string | null }[];
  revenueSeries: { month: string; label: string; value: number }[];
  revenueThisMonth: number;
  revenuePreviousMonth: number;
};

type Payload = { organization: OrganizationDetail; insights: Insights };

const CHIP_COLORS = [
  "bg-indigo-100 text-indigo-800",
  "bg-sky-100 text-sky-800",
  "bg-pink-100 text-pink-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
];

const AVATAR_COLORS = ["bg-[#3B63D6]", "bg-pink-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-sky-500"];

function mad(n: number) {
  return `${Math.round(n).toLocaleString("fr-MA")} DH`;
}

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body;
}

function RevenueChart({ series }: { series: Insights["revenueSeries"] }) {
  const W = 220;
  const H = 70;
  const max = Math.max(...series.map((p) => p.value), 1);
  const points = series.map((p, i) => {
    const x = 8 + (i * (W - 16)) / Math.max(series.length - 1, 1);
    const y = H - 8 - (p.value / max) * (H - 20);
    return { x, y, ...p };
  });
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${H - 4} L${points[0].x},${H - 4} Z`;
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[72px] w-full"
        role="img"
        aria-label={`Revenus mensuels : ${series.map((p) => `${p.label} ${mad(p.value)}`).join(", ")}`}
      >
        <defs>
          <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7C5CE6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7C5CE6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#rev-fill)" />
        <path d={line} fill="none" stroke="#7C5CE6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.month} cx={p.x} cy={p.y} r="2.5" fill="#7C5CE6">
            <title>{`${p.label} : ${mad(p.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] uppercase text-slate-400">
        {series.map((p) => (
          <span key={p.month}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-3 border-t border-slate-200 py-3.5">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-medium text-slate-500">{title}</h3>
        <div className="mt-1">{children}</div>
      </div>
    </section>
  );
}

type FormState = { name: string; phone: string; email: string; address: string; city: string };

export function OrganizationDetailModal({
  organizationId,
  fallback,
  onClose,
  onChanged,
  onDeleted,
}: {
  organizationId: string;
  fallback: OrganizationCard | OrganizationListItem | null;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", phone: "", email: "", address: "", city: "" });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await api<Payload>(`/api/admin/organizations/${organizationId}/`));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Échap, blocage du scroll, focus initial
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const org = data?.organization ?? null;
  const insights = data?.insights ?? null;
  const name = org?.name ?? fallback?.name ?? "Institut";
  const status = org?.status ?? fallback?.status ?? "ACTIVE";
  const cover =
    (org?.cardBackgroundUrl ?? (fallback && "coverUrl" in fallback ? fallback.coverUrl : null)) ??
    org?.logoUrl ??
    fallback?.logoUrl ??
    null;

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      after?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    if (!org) return;
    setForm({
      name: org.name,
      phone: org.phone ?? "",
      email: org.email ?? "",
      address: org.address ?? "",
      city: org.city ?? "",
    });
    setActionError(null);
    setMode("edit");
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    void run(
      () =>
        api(`/api/admin/organizations/${org.id}/`, {
          method: "PATCH",
          body: JSON.stringify(form),
        }),
      async () => {
        setMode("view");
        await load();
        onChanged();
      },
    );
  }

  function toggleStatus() {
    if (!org) return;
    const next = org.status === "ACTIVE" ? "suspend" : "reactivate";
    void run(
      () => api(`/api/admin/organizations/${org.id}/${next}/`, { method: "POST" }),
      async () => {
        await load();
        onChanged();
      },
    );
  }

  function remove() {
    if (!org) return;
    void run(
      () => api(`/api/admin/organizations/${org.id}/delete/`, { method: "POST" }),
      onDeleted,
    );
  }

  const growth =
    insights && insights.revenuePreviousMonth > 0
      ? ((insights.revenueThisMonth - insights.revenuePreviousMonth) / insights.revenuePreviousMonth) * 100
      : null;
  const monthlyAvg = insights
    ? insights.revenueSeries.reduce((sum, p) => sum + p.value, 0) / insights.revenueSeries.length
    : 0;
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

  return (
    <div
      className="rb-fullscreen-overlay fixed z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative my-auto w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-bold text-[#0F172A]">
            Détails du salon
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="aspect-[16/7] overflow-hidden rounded-xl bg-slate-100 shadow-md">
          <OrganizationCover src={cover} name={name} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <h3 className="min-w-0 truncate text-xl font-bold text-[#0F172A]">{name}</h3>
          {org?.subscriptionStatus === "ACTIVE" ? (
            <BadgeCheck className="h-5 w-5 shrink-0 fill-[#3B63D6] text-white" aria-label="Abonnement actif" />
          ) : null}
        </div>
        <div className="mt-2">
          <StatusPill status={status} />
        </div>

        {loadError ? (
          <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {loadError}{" "}
            <button type="button" onClick={() => void load()} className="font-semibold underline">
              Réessayer
            </button>
          </div>
        ) : !org || !insights ? (
          <div className="mt-8 flex items-center justify-center gap-2 py-10 text-sm text-slate-500" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement des détails…
          </div>
        ) : mode === "edit" ? (
          <form onSubmit={saveEdit} className="mt-5 space-y-3">
            {(
              [
                ["name", "Nom", "text", true],
                ["address", "Adresse", "text", false],
                ["city", "Ville", "text", false],
                ["phone", "Téléphone", "tel", false],
                ["email", "E-mail", "email", false],
              ] as const
            ).map(([key, label, type, required]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
                <input
                  type={type}
                  required={required}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#3B63D6] focus:ring-2 focus:ring-[#3B63D6]/20"
                />
              </label>
            ))}
            {actionError ? (
              <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {actionError}
              </p>
            ) : null}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setMode("view")}
                disabled={busy}
                className="h-11 flex-1 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#3B63D6] text-sm font-semibold text-white hover:bg-[#2F52B8] disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Enregistrer
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-4">
              <Section icon={MapPin} title="Adresse">
                <p className="text-sm font-bold text-slate-900">
                  {[org.address, org.city].filter(Boolean).join(", ") || "Non renseignée"}
                </p>
              </Section>

              <Section icon={UserRound} title="Propriétaire & contact">
                <p className="text-sm font-bold text-slate-900">{org.ownerName ?? "Aucun propriétaire"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  {org.ownerEmail ?? org.email ? <span>{org.ownerEmail ?? org.email}</span> : null}
                  {org.phone ?? org.ownerPhone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" aria-hidden />
                      {org.phone ?? org.ownerPhone}
                    </span>
                  ) : null}
                </p>
              </Section>

              <Section icon={CreditCard} title="Abonnement">
                {org.subscription ? (
                  <p className="text-sm text-slate-900">
                    <strong className="font-bold">{PLAN_LABEL[org.subscription.plan]}</strong> ·{" "}
                    {mad(org.subscription.price)} / mois
                    <span className="block text-xs text-slate-500">
                      {org.subscription.paid ? "Payé" : "En attente de paiement"} · renouvellement le{" "}
                      {formatLongDate(org.subscription.renewAt)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Aucun abonnement</p>
                )}
              </Section>

              <Section icon={Wrench} title="Services">
                {insights.services.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {insights.services.map((s, i) => (
                      <li
                        key={`${s.name}-${i}`}
                        className={cn("rounded-md px-2 py-1 text-xs font-semibold", CHIP_COLORS[i % CHIP_COLORS.length])}
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Aucun service actif</p>
                )}
              </Section>

              <Section icon={Users} title="Équipe">
                {insights.team.length ? (
                  <ul className="flex flex-wrap gap-x-5 gap-y-3">
                    {insights.team.map((m, i) => (
                      <li key={`${m.name}-${i}`} className="flex w-20 flex-col items-center text-center">
                        <span
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white",
                            AVATAR_COLORS[i % AVATAR_COLORS.length],
                          )}
                          aria-hidden
                        >
                          {initials(m.name)}
                        </span>
                        <span className="mt-1.5 w-full truncate text-xs font-bold text-slate-900">{m.name}</span>
                        <span className="w-full truncate text-[11px] text-slate-500">{m.position ?? "Équipe"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Aucun membre actif</p>
                )}
              </Section>

              <Section icon={BarChart3} title="Statistiques">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-100 p-3.5">
                    <p className="text-[11px] text-slate-500">Chiffre d’affaires ({monthLabel})</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">
                      {mad(insights.revenueThisMonth)}
                    </p>
                    {growth != null ? (
                      <span
                        className={cn(
                          "mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                          growth >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
                        )}
                      >
                        {growth >= 0 ? "↑" : "↓"} {growth >= 0 ? "+" : ""}
                        {growth.toFixed(0)}% vs. mois précédent
                      </span>
                    ) : (
                      <span className="mt-1.5 inline-block text-[11px] text-slate-400">Pas de mois précédent</span>
                    )}
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                    <p className="text-[11px] font-medium text-slate-600">Revenus mensuels</p>
                    <RevenueChart series={insights.revenueSeries} />
                    <p className="text-[10px] text-slate-400">Moy. mensuelle : {mad(monthlyAvg)}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Clients", org.stats.customers],
                    ["Rendez-vous", org.stats.appointments],
                    ["Employés", org.stats.staff],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 py-2">
                      <dd className="text-base font-bold text-slate-900">{Number(value).toLocaleString("fr-FR")}</dd>
                      <dt className="text-[11px] text-slate-500">{label}</dt>
                    </div>
                  ))}
                </dl>
              </Section>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Actions</p>
              {mode === "confirm-delete" ? (
                <div role="alertdialog" className="rounded-xl bg-red-50 p-3.5">
                  <p className="text-sm font-semibold text-red-800">Supprimer définitivement « {org.name} » ?</p>
                  <p className="mt-0.5 text-xs text-red-700">Cette action est irréversible.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("view")}
                      disabled={busy}
                      className="h-10 flex-1 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                      Oui, supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={startEdit}
                    disabled={busy}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-[#3B63D6] text-sm font-semibold text-[#3B63D6] transition hover:bg-[#3B63D6]/5"
                  >
                    <Pencil className="h-4 w-4" aria-hidden /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={toggleStatus}
                    disabled={busy}
                    className={cn(
                      "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-semibold transition disabled:opacity-60",
                      org.status === "ACTIVE"
                        ? "border-amber-500 text-amber-600 hover:bg-amber-50"
                        : "border-emerald-500 text-emerald-600 hover:bg-emerald-50",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : org.status === "ACTIVE" ? (
                      <Pause className="h-4 w-4" aria-hidden />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden />
                    )}
                    {org.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setMode("confirm-delete");
                    }}
                    disabled={busy}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-red-500 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> Supprimer
                  </button>
                </div>
              )}
              {actionError ? (
                <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </p>
              ) : null}
              <Link
                href={adminHref(`/organizations/${org.id}/`)}
                className="mt-3 block text-center text-sm font-semibold text-[#3B63D6] hover:underline"
              >
                Ouvrir la fiche complète →
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              Créé le {formatLongDate(org.createdAt)} · ID : {org.slug}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
