"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CreditCard,
  CalendarDays,
  History,
  KeyRound,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Phone,
  Play,
  ShieldUser,
  Trash2,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_LABEL } from "@/types/platform";
import type { OrganizationDetail, OrganizationListItem, OrganizationPaymentHistoryEntry } from "@/types/platform";
import { StatusPill, type OrganizationCard } from "./OrganizationsView";

type Insights = {
  services: { name: string; category: string | null }[];
  team: { name: string; position: string | null }[];
  revenueSeries: { month: string; label: string; value: number }[];
  revenueThisMonth: number;
  revenuePreviousMonth: number;
};

type Payload = {
  organization: OrganizationDetail;
  insights: Insights;
  paymentHistory?: OrganizationPaymentHistoryEntry[];
  /** false quand l'historique n'a pas pu être chargé côté serveur. */
  paymentHistoryAvailable?: boolean;
};

/** Sections ciblables depuis les anciens liens `?tab=...` de la fiche détaillée. */
export type OrganizationDetailTab = "users" | "subscription" | "stats";

type OrgUser = { id: string; firstName: string; lastName: string; email: string; role: string; status: string };

const USER_ROLE_LABEL: Record<string, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Responsable",
  STAFF: "Employé",
  EMPLOYEE: "Employé",
};

const SUB_STATUS_LABEL: Record<string, string> = {
  TRIAL: "Essai",
  ACTIVE: "Actif",
  PAST_DUE: "Impayé",
  PAUSED: "En pause",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
};

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

function formatPaymentAmount(amount: number, currency?: string | null) {
  const code = currency?.trim().toUpperCase();
  if (!code || code === "MAD" || code === "DH") return mad(amount);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString("fr-FR")} ${code}`;
  }
}

function formatPeriodDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { timeZone: "Africa/Casablanca", day: "numeric", month: "short", year: "numeric" });
}

function formatPaymentPeriod(start?: string | null, end?: string | null) {
  const from = start ? formatPeriodDate(start) : null;
  const to = end ? formatPeriodDate(end) : null;
  if (from && to) return `${from} – ${to}`;
  return from ? `Dès le ${from}` : to ? `Jusqu’au ${to}` : null;
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
        className="h-[100px] w-full"
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
  action,
  id,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  action?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={id ? -1 : undefined}
      className="mb-3 flex break-inside-avoid gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3B63D6]/40"
    >
      <Icon className="mt-0.5 h-6 w-6 shrink-0 text-slate-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          {action}
        </div>
        <div className="mt-1">{children}</div>
      </div>
    </section>
  );
}

type FormState = { name: string; phone: string; email: string; address: string; city: string };
type OwnerForm = { firstName: string; lastName: string; email: string; phone: string };
type SubForm = { price: string; periodEnd: string; quick: string; payment: "" | "paid" | "unpaid" };

/** Raccourcis de période : prolongation (mois) ou période d’essai (jours, repart d’aujourd’hui). */
const QUICK_PERIODS: { value: string; label: string; kind: "extend" | "trial"; amount: number }[] = [
  { value: "m1", label: "1 mois", kind: "extend", amount: 1 },
  { value: "y1", label: "1 an", kind: "extend", amount: 12 },
  { value: "t15", label: "Période d’essai — 15 jours", kind: "trial", amount: 15 },
];

function quickPreview(quick: string, currentEnd: string): Date | null {
  const q = QUICK_PERIODS.find((p) => p.value === quick);
  if (!q) return null;
  if (q.kind === "trial") return new Date(Date.now() + q.amount * 86_400_000);
  const end = new Date(currentEnd);
  const base = end.getTime() < Date.now() ? new Date() : end;
  const d = new Date(base);
  d.setMonth(d.getMonth() + q.amount);
  return d;
}
type ResetResult = { temporaryPassword: string; messageTemplate: string };

function ListPages({ page, count, size, onChange }: { page: number; count: number; size: number; onChange: (page: number) => void }) {
  const pages = Math.ceil(count / size);
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination de la liste" className="mt-3 flex items-center justify-between gap-2 text-xs">
      <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} className="h-9 rounded-lg border px-3 font-semibold disabled:opacity-40">Précédent</button>
      <span aria-live="polite">{page + 1} / {pages}</span>
      <button type="button" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} className="h-9 rounded-lg border px-3 font-semibold disabled:opacity-40">Suivant</button>
    </nav>
  );
}

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#3B63D6] focus:ring-2 focus:ring-[#3B63D6]/20";

function EditLink({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#3B63D6] transition hover:bg-[#3B63D6]/10 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function OrganizationDetailModal({
  organizationId,
  fallback,
  initialEdit = false,
  initialTab,
  onClose,
  onChanged,
  onDeleted,
}: {
  organizationId: string;
  fallback: OrganizationCard | OrganizationListItem | null;
  /** Ouvre directement le formulaire de modification (ancien `?edit=1`). */
  initialEdit?: boolean;
  /** Fait défiler et place le focus sur la section voulue (ancien `?tab=...`). */
  initialTab?: OrganizationDetailTab;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [historyPage, setHistoryPage] = useState(0);
  const [servicesPage, setServicesPage] = useState(0);
  const [teamPage, setTeamPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", phone: "", email: "", address: "", city: "" });
  const [ownerEdit, setOwnerEdit] = useState(false);
  const [ownerForm, setOwnerForm] = useState<OwnerForm>({ firstName: "", lastName: "", email: "", phone: "" });
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [subEdit, setSubEdit] = useState(false);
  /** Ce qui est parti par e-mail après le dernier enregistrement de période (ou pourquoi rien n'est parti). */
  const [periodMailNotice, setPeriodMailNotice] = useState<string | null>(null);
  const [subForm, setSubForm] = useState<SubForm>({ price: "", periodEnd: "", quick: "", payment: "" });
  const [sectionError, setSectionError] = useState<{ section: "owner" | "sub"; message: string } | null>(null);
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(0);
  const deepLinkApplied = useRef(false);

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

  const loadUsers = useCallback(async () => {
    setUsersError(null);
    try {
      const result = await api<{ users?: OrgUser[] }>(`/api/admin/organizations/${organizationId}/users/`);
      setUsers(result.users ?? []);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Utilisateurs indisponibles.");
    }
  }, [organizationId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Échap, blocage du scroll, focus initial. onClose passe par une ref : un nouveau
  // callback du parent ne doit ni réinstaller l'effet ni redonner le focus à « Fermer ».
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const org = data?.organization ?? null;
  const insights = data?.insights ?? null;
  const name = org?.name ?? fallback?.name ?? "Institut";
  const status = org?.status ?? fallback?.status ?? "ACTIVE";
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

  async function runSection(section: "owner" | "sub", fn: () => Promise<unknown>, after?: () => void | Promise<void>) {
    setBusy(true);
    setSectionError(null);
    try {
      await fn();
      await after?.();
    } catch (e) {
      setSectionError({ section, message: e instanceof Error ? e.message : "Action impossible." });
    } finally {
      setBusy(false);
    }
  }

  function startOwnerEdit() {
    if (!org) return;
    setOwnerForm({
      firstName: org.ownerFirstName ?? "",
      lastName: org.ownerLastName ?? "",
      email: org.ownerEmail ?? "",
      phone: org.ownerPhone ?? "",
    });
    setSectionError(null);
    setConfirmReset(false);
    setOwnerEdit(true);
  }

  function saveOwner(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.ownerId) return;
    const ownerId = org.ownerId;
    void runSection(
      "owner",
      () =>
        api(`/api/admin/users/${ownerId}/`, {
          method: "PATCH",
          body: JSON.stringify({
            firstName: ownerForm.firstName.trim(),
            lastName: ownerForm.lastName.trim(),
            email: ownerForm.email.trim(),
            phone: ownerForm.phone.trim() || null,
          }),
        }),
      async () => {
        setOwnerEdit(false);
        await load();
        onChanged();
      },
    );
  }

  function resetPassword() {
    if (!org?.ownerId) return;
    const ownerId = org.ownerId;
    void runSection("owner", async () => {
      const result = await api<ResetResult>(`/api/admin/users/${ownerId}/reset-password/`, { method: "POST" });
      setResetResult({ temporaryPassword: result.temporaryPassword, messageTemplate: result.messageTemplate });
      setConfirmReset(false);
      setCopied(false);
    });
  }

  async function copyResetMessage() {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.messageTemplate);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function startSubEdit() {
    if (!org?.subscription) return;
    setSubForm({
      price: String(org.subscription.price),
      periodEnd: org.subscription.renewAt.slice(0, 10),
      quick: "",
      // Préremplit avec l'état actuel : l'admin ne change que ce qui a changé.
      payment: org.subscription.paid ? "paid" : "unpaid",
    });
    setSectionError(null);
    setSubEdit(true);
  }

  function saveSubscription(e: React.FormEvent) {
    e.preventDefault();
    const sub = org?.subscription;
    if (!sub) return;
    const price = Number(subForm.price.replace(",", "."));
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
      setSectionError({ section: "sub", message: "Indiquez un prix en dirhams, entre 0 et 1 000 000." });
      return;
    }
    if (!subForm.periodEnd) {
      setSectionError({ section: "sub", message: "Indiquez une date de fin de période." });
      return;
    }
    if (!subForm.payment) {
      setSectionError({ section: "sub", message: "Sélectionnez si la période est payée ou non payée." });
      return;
    }
    const post = (body: Record<string, unknown>) =>
      api<{ emailNotice?: string }>(`/api/admin/subscriptions/${sub.id}/`, { method: "POST", body: JSON.stringify(body) });
    void runSection(
      "sub",
      async () => {
        const saved = await post({
          action: "save-period",
          quick: subForm.quick,
          paid: subForm.payment === "paid",
          price,
          periodEnd: subForm.periodEnd === sub.renewAt.slice(0, 10)
            ? sub.renewAt
            : new Date(`${subForm.periodEnd}T23:59:59`).toISOString(),
        });
        setPeriodMailNotice(saved.emailNotice ?? null);
      },
      async () => {
        setSubEdit(false);
        await load();
        onChanged();
      },
    );
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

  // Liens profonds (?edit=1, ?tab=...) : appliqués une seule fois, quand les détails sont chargés.
  const detailsReady = Boolean(org && insights);
  useEffect(() => {
    if (!detailsReady || deepLinkApplied.current) return;
    deepLinkApplied.current = true;
    if (initialEdit) {
      startEdit();
      return;
    }
    if (!initialTab) return;
    const target = document.getElementById(`${titleId}-${initialTab}`);
    if (!target) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsReady]);

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
        className="relative my-auto w-full max-w-[1600px] rounded-3xl bg-white p-4 shadow-2xl sm:p-6"
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-bold text-[#0F172A] sm:text-2xl">
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

        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-2xl font-bold text-[#0F172A] sm:text-3xl">{name}</h3>
          {org?.subscriptionStatus === "ACTIVE" ? (
            <BadgeCheck className="h-6 w-6 shrink-0 fill-[#3B63D6] text-white" aria-label="Abonnement actif" />
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
            <div className="mt-4 columns-1 gap-3 md:columns-2 xl:columns-4">
              <Section icon={MapPin} title="Adresse">
                <p className="text-base font-bold text-slate-900">
                  {[org.address, org.city].filter(Boolean).join(", ") || "Non renseignée"}
                </p>
              </Section>

              <Section
                icon={UserRound}
                title="Propriétaire & contact"
                action={
                  org.ownerId && !ownerEdit ? (
                    <EditLink onClick={startOwnerEdit} disabled={busy}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
                    </EditLink>
                  ) : null
                }
              >
                {ownerEdit ? (
                  <form onSubmit={saveOwner} className="mt-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Prénom</span>
                        <input
                          required
                          value={ownerForm.firstName}
                          onChange={(e) => setOwnerForm((f) => ({ ...f, firstName: e.target.value }))}
                          className={INPUT_CLASS}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Nom</span>
                        <input
                          required
                          value={ownerForm.lastName}
                          onChange={(e) => setOwnerForm((f) => ({ ...f, lastName: e.target.value }))}
                          className={INPUT_CLASS}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">E-mail</span>
                        <input
                          type="email"
                          required
                          value={ownerForm.email}
                          onChange={(e) => setOwnerForm((f) => ({ ...f, email: e.target.value }))}
                          className={INPUT_CLASS}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Téléphone</span>
                        <input
                          type="tel"
                          value={ownerForm.phone}
                          onChange={(e) => setOwnerForm((f) => ({ ...f, phone: e.target.value }))}
                          className={INPUT_CLASS}
                        />
                      </label>
                    </div>
                    {sectionError?.section === "owner" ? (
                      <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                        {sectionError.message}
                      </p>
                    ) : null}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setOwnerEdit(false)}
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
                    <p className="text-base font-bold text-slate-900">{org.ownerName ?? "Aucun propriétaire"}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                      {org.ownerEmail ?? org.email ? <span>{org.ownerEmail ?? org.email}</span> : null}
                      {org.ownerPhone ?? org.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" aria-hidden />
                          {org.ownerPhone ?? org.phone}
                        </span>
                      ) : null}
                    </p>

                    {org.ownerId ? (
                      <div className="mt-3">
                        {resetResult ? (
                          <div role="status" className="rounded-xl bg-emerald-50 p-3.5">
                            <p className="text-sm font-semibold text-emerald-800">Mot de passe réinitialisé</p>
                            <p className="mt-1 text-xs text-emerald-700">
                              Mot de passe temporaire :{" "}
                              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm font-bold text-slate-900">
                                {resetResult.temporaryPassword}
                              </code>
                            </p>
                            <p className="mt-1 text-xs text-emerald-700">
                              Le propriétaire devra en choisir un nouveau à sa première connexion.
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void copyResetMessage()}
                                className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                {copied ? "Message copié ✓" : "Copier le message"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setResetResult(null)}
                                className="h-9 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-800"
                              >
                                Fermer
                              </button>
                            </div>
                          </div>
                        ) : confirmReset ? (
                          <div role="alertdialog" className="rounded-xl bg-amber-50 p-3.5">
                            <p className="text-sm font-semibold text-amber-900">
                              Réinitialiser le mot de passe de {org.ownerName ?? "ce propriétaire"} ?
                            </p>
                            <p className="mt-0.5 text-xs text-amber-800">
                              Un mot de passe temporaire sera généré et l’ancien ne fonctionnera plus.
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmReset(false)}
                                disabled={busy}
                                className="h-10 flex-1 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={resetPassword}
                                disabled={busy}
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
                                Oui, réinitialiser
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSectionError(null);
                              setConfirmReset(true);
                            }}
                            disabled={busy}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-amber-500 px-4 text-sm font-semibold text-amber-600 transition hover:bg-amber-50 disabled:opacity-60"
                          >
                            <KeyRound className="h-4 w-4" aria-hidden /> Réinitialiser le mot de passe
                          </button>
                        )}
                        {sectionError?.section === "owner" ? (
                          <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {sectionError.message}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </Section>

              <Section icon={CalendarDays} title="Date d’inscription">
                <p className="text-sm font-semibold text-slate-900">
                  <time dateTime={org.createdAt}>{formatLongDate(org.createdAt)}</time>
                </p>
              </Section>

              <Section
                icon={CreditCard}
                title="Abonnement"
                id={`${titleId}-subscription`}
                action={
                  org.subscription && !subEdit ? (
                    <EditLink onClick={startSubEdit} disabled={busy}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
                    </EditLink>
                  ) : null
                }
              >
                {periodMailNotice && !subEdit ? (
                  <p
                    role="status"
                    className={cn(
                      "mb-3 rounded-xl px-3.5 py-2.5 text-sm",
                      periodMailNotice.startsWith("E-mail envoyé")
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-800",
                    )}
                  >
                    {periodMailNotice}
                  </p>
                ) : null}
                {subEdit && org.subscription ? (
                  <form onSubmit={saveSubscription} className="mt-1 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-500">
                        Ajouter une période
                      </span>
                      <select
                        value={subForm.quick}
                        onChange={(e) => {
                          const quick = e.target.value;
                          const preview = quickPreview(quick, org.subscription!.renewAt);
                          setSubForm((f) => ({
                            ...f,
                            quick,
                            periodEnd: preview
                              ? preview.toISOString().slice(0, 10)
                              : org.subscription!.renewAt.slice(0, 10),
                          }));
                        }}
                        className={INPUT_CLASS}
                      >
                        <option value="">— Aucune (garder la date ci-dessous) —</option>
                        <optgroup label="Prolonger l’abonnement">
                          {QUICK_PERIODS.filter((p) => p.kind === "extend").map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Période d’essai (repart d’aujourd’hui)">
                          {QUICK_PERIODS.filter((p) => p.kind === "trial").map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {subForm.quick ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          Nouvelle fin de période :{" "}
                          <strong className="text-slate-700">
                            {formatLongDate(
                              (quickPreview(subForm.quick, org.subscription.renewAt) ?? new Date()).toISOString(),
                            )}
                          </strong>
                          {QUICK_PERIODS.find((p) => p.value === subForm.quick)?.kind === "trial"
                            ? " · le statut passera en « essai »"
                            : ""}
                        </span>
                      ) : null}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Prix / mois (DH)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={1000000}
                          step="0.01"
                          required
                          value={subForm.price}
                          onChange={(e) => setSubForm((f) => ({ ...f, price: e.target.value }))}
                          className={INPUT_CLASS}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          Fin de la période (renouvellement)
                        </span>
                        <input
                          type="date"
                          required
                          value={subForm.periodEnd}
                          onChange={(e) => setSubForm((f) => ({ ...f, periodEnd: e.target.value, quick: "" }))}
                          className={INPUT_CLASS}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-500">Paiement de la période</span>
                      <select
                        required
                        value={subForm.payment}
                        onChange={(e) => setSubForm((f) => ({ ...f, payment: e.target.value as SubForm["payment"] }))}
                        className={INPUT_CLASS}
                      >
                        <option value="paid">Payé</option>
                        <option value="unpaid">Non payé</option>
                      </select>
                    </label>
                    {sectionError?.section === "sub" ? (
                      <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                        {sectionError.message}
                      </p>
                    ) : null}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSubEdit(false)}
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
                ) : org.subscription ? (
                  <p className="text-base text-slate-900">
                    <strong className="font-bold">{PLAN_LABEL[org.subscription.plan]}</strong> ·{" "}
                    {mad(org.subscription.price)} / mois
                    <span className="block text-xs text-slate-500">
                      Statut : {SUB_STATUS_LABEL[org.subscription.status] ?? org.subscription.status} ·{" "}
                      {org.subscription.paid ? "Payé" : "En attente de paiement"}
                    </span>
                    <span className="block text-xs text-slate-500">
                      Début le {formatLongDate(org.subscription.startAt)} · renouvellement le{" "}
                      {formatLongDate(org.subscription.renewAt)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Aucun abonnement</p>
                )}
              </Section>

              <Section icon={History} title="Historique des paiements">
                <p className="mb-3 text-xs text-slate-500">Confirmations de paiement enregistrées dans l’admin · 50 derniers événements</p>
                {data?.paymentHistoryAvailable === false ? (
                  <p role="status" className="mb-2 text-xs text-slate-500">Historique indisponible</p>
                ) : null}
                {data?.paymentHistory?.length ? (
                  <ul className="space-y-2">
                    {data.paymentHistory.slice(historyPage * 3, historyPage * 3 + 3).map((payment) => {
                      const hasAmount = typeof payment.amount === "number" && Number.isFinite(payment.amount);
                      const period = formatPaymentPeriod(payment.periodStart, payment.periodEnd);
                      return (
                        <li key={payment.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className={cn("text-sm font-semibold", payment.paid ? "text-emerald-700" : "text-amber-700")}>
                              {payment.paid ? "Paiement confirmé" : "Marqué non payé"}
                              {hasAmount ? (
                                <span className="font-semibold text-slate-900"> · {formatPaymentAmount(payment.amount as number, payment.currency)}</span>
                              ) : null}
                            </p>
                            {period ? <p className="break-words text-xs text-slate-500">Période : {period}</p> : null}
                            {payment.recordedBy ? <p className="break-words text-xs text-slate-500">Par {payment.recordedBy}</p> : null}
                          </div>
                          <time dateTime={payment.recordedAt} className="text-xs text-slate-500">
                            {new Date(payment.recordedAt).toLocaleString("fr-FR", {
                              timeZone: "Africa/Casablanca", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </time>
                        </li>
                      );
                    })}
                  </ul>
                ) : data?.paymentHistoryAvailable === false ? null : (
                  <p className="text-sm text-slate-500">Aucun paiement enregistré dans l’historique.</p>
                )}
                <ListPages page={historyPage} count={data?.paymentHistory?.length ?? 0} size={3} onChange={setHistoryPage} />
              </Section>

              <Section icon={Wrench} title="Services">
                {insights.services.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {insights.services.slice(servicesPage * 8, servicesPage * 8 + 8).map((s, i) => (
                      <li
                        key={`${s.name}-${i}`}
                        className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", CHIP_COLORS[i % CHIP_COLORS.length])}
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Aucun service actif</p>
                )}
                <ListPages page={servicesPage} count={insights.services.length} size={8} onChange={setServicesPage} />
              </Section>

              <Section icon={Users} title="Équipe">
                {insights.team.length ? (
                  <ul className="flex flex-wrap gap-x-5 gap-y-3">
                    {insights.team.slice(teamPage * 4, teamPage * 4 + 4).map((m, i) => (
                      <li key={`${m.name}-${i}`} className="flex w-24 flex-col items-center text-center">
                        <span
                          className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white",
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
                <ListPages page={teamPage} count={insights.team.length} size={4} onChange={setTeamPage} />
              </Section>

              <Section
                icon={ShieldUser}
                title="Utilisateurs"
                id={`${titleId}-users`}
              >
                {usersError ? (
                  <p role="alert" className="text-sm text-red-700">
                    {usersError}{" "}
                    <button type="button" onClick={() => void loadUsers()} className="font-semibold underline">
                      Réessayer
                    </button>
                  </p>
                ) : users === null ? (
                  <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement…
                  </p>
                ) : users.length ? (
                  <ul className="divide-y divide-slate-200">
                    {users.slice(usersPage * 5, usersPage * 5 + 5).map((u) => (
                      <li key={u.id} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {u.email} · {USER_ROLE_LABEL[u.role] ?? u.role}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600",
                          )}
                        >
                          {u.status === "ACTIVE" ? "Actif" : u.status === "DISABLED" ? "Désactivé" : u.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Aucun utilisateur</p>
                )}
                <ListPages page={usersPage} count={users?.length ?? 0} size={5} onChange={setUsersPage} />
              </Section>

              <Section icon={BarChart3} title="Statistiques" id={`${titleId}-stats`}>
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-xs text-slate-500">Chiffre d’affaires ({monthLabel})</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-[#0F172A]">
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
                    <p className="text-xs font-medium text-slate-600">Revenus mensuels</p>
                    <RevenueChart series={insights.revenueSeries} />
                    <p className="text-[10px] text-slate-400">Moy. mensuelle : {mad(monthlyAvg)}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[
                    ["Clients", org.stats.customers],
                    ["Rendez-vous", org.stats.appointments],
                    ["Employés", org.stats.staff],
                    ["Produits", org.stats.products],
                    ["Utilisateurs", org.usersCount],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 py-2">
                      <dd className="text-2xl font-bold text-slate-900">{Number(value).toLocaleString("fr-FR")}</dd>
                      <dt className="text-xs text-slate-500">{label}</dt>
                    </div>
                  ))}
                  <div className="rounded-lg bg-slate-50 px-1 py-2">
                    <dd className="break-words text-lg font-bold leading-8 text-slate-900">{mad(org.stats.revenue)}</dd>
                    <dt className="text-xs text-slate-500">CA total</dt>
                  </div>
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
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              ID : {org.slug}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
