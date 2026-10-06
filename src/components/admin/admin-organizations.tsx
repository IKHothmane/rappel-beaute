"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  Hourglass,
  Lock,
  Search,
  Shield,
  Store,
  Verified,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  archiveOrganizationApi,
  adminSubscriptionAction,
  deleteOrganizationApi,
  fetchAdminDashboard,
  fetchOrganization,
  fetchOrganizations,
  reactivateOrganizationApi,
  suspendOrganizationApi,
  updateOrganizationApi,
} from "@/modules/admin/client";
import { PLAN_LABEL } from "@/types/platform";
import { limitPhoneDigits } from "@/lib/validation/customer";
import type {
  OrganizationDetail,
  OrganizationListItem,
  OrganizationStatus,
  SubscriptionPlan,
} from "@/types/platform";

type StatusTab =
  | "all"
  | "active"
  | "trial"
  | "payment_due"
  | "suspended"
  | "archived";

type Dash = Awaited<ReturnType<typeof fetchAdminDashboard>>;

const PAGE_SIZE = 20;

function mad(n: number) {
  return `${Math.round(n).toLocaleString("fr-MA")} DH`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function OrgAvatar({
  name,
  logoUrl,
  className,
  fallbackClassName,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  if (logoUrl) {
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" className="h-full w-full object-contain p-0.5" src={logoUrl} />
      </div>
    );
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center", className, fallbackClassName)}>
      {initials(name)}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ownerInitials(name: string | null) {
  if (!name) return "?";
  return initials(name);
}

function matchesTab(org: OrganizationListItem, tab: StatusTab) {
  if (tab === "all") return true;
  if (tab === "suspended") return org.status === "SUSPENDED";
  if (tab === "archived") return org.status === "ARCHIVED";
  if (tab === "trial") return org.subscriptionStatus === "TRIAL";
  if (tab === "payment_due")
    return org.subscriptionStatus === "PAST_DUE" || org.subscriptionStatus === "PAUSED";
  if (tab === "active") {
    return (
      org.status === "ACTIVE" &&
      org.subscriptionStatus !== "TRIAL" &&
      org.subscriptionStatus !== "PAST_DUE" &&
      org.subscriptionStatus !== "CANCELLED" &&
      org.subscriptionStatus !== "EXPIRED"
    );
  }
  return true;
}

function statusLabel(org: OrganizationListItem) {
  if (org.status === "SUSPENDED") return { label: "Suspendu", tone: "suspended" as const };
  if (org.status === "ARCHIVED") return { label: "Archivé", tone: "archived" as const };
  if (org.subscriptionStatus === "TRIAL") {
    return { label: "Essai", tone: "trial" as const };
  }
  if (org.subscriptionStatus === "PAST_DUE") {
    return { label: "Impayé", tone: "due" as const };
  }
  return { label: "Actif", tone: "active" as const };
}

function StatusPill({ org }: { org: OrganizationListItem }) {
  const s = statusLabel(org);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
        s.tone === "active" && "bg-[#FFDEA4]/70 text-[#5D4200]",
        s.tone === "trial" && "bg-[#FFD9DD] text-[#900036]",
        s.tone === "due" && "bg-red-100 text-red-800",
        s.tone === "suspended" && "bg-ink text-white",
        s.tone === "archived" && "bg-stone-200 text-stone-600",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          s.tone === "active" && "bg-[#7B5900]",
          s.tone === "trial" && "bg-primary",
          s.tone === "due" && "bg-red-600",
          s.tone === "suspended" && "bg-[#FFB2BD]",
          s.tone === "archived" && "bg-stone-400",
        )}
      />
      {s.label}
    </span>
  );
}

function TenantDrawer({
  orgId,
  onClose,
  onChanged,
  onDeleted,
}: {
  orgId: string;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: (id: string) => void;
}) {
  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCity, setEditCity] = useState("");
  const [periodMonths, setPeriodMonths] = useState(1);
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodMode, setPeriodMode] = useState<"date" | "extend">("date");
  const [priceInput, setPriceInput] = useState("");

  async function reload() {
    const r = await fetchOrganization(orgId);
    setDetail(r.organization);
    setEditName(r.organization.name);
    setEditPhone(limitPhoneDigits(r.organization.phone ?? ""));
    setEditEmail(r.organization.email ?? "");
    setEditCity(r.organization.city ?? "");
    setPeriodEnd(
      (r.organization.subscription?.renewAt ?? r.organization.renewAt)?.slice(0, 10) ?? "",
    );
    setPriceInput(
      r.organization.subscription ? String(r.organization.subscription.price) : "",
    );
  }

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on org change only
  }, [orgId]);

  async function run(action: () => Promise<false | void>) {
    setBusy(true);
    try {
      const result = await action();
      if (result === false) return;
      onChanged();
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!detail) return;
    await run(async () => {
      await updateOrganizationApi(detail.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        city: editCity.trim() || undefined,
      });
    });
  }

  async function removeInstitut() {
    if (!detail) return;
    const typed = window.prompt(
      `Supprimer définitivement « ${detail.name} » ?\n\nLes clientes, rendez-vous, stock, caisse et comptes de cet institut seront effacés. Cette action est irréversible.\n\nTapez le nom de l’institut pour confirmer.`,
    );
    if (typed == null) return;
    if (typed.trim() !== detail.name) {
      alert("Le nom ne correspond pas. Suppression annulée.");
      return;
    }
    setBusy(true);
    try {
      await deleteOrganizationApi(detail.id);
      onDeleted(detail.id);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function applyStatus(next: OrganizationStatus) {
    if (!detail || next === detail.status) return;
    await run(async () => {
      if (next === "ACTIVE") await reactivateOrganizationApi(detail.id);
      else if (next === "SUSPENDED") {
        if (!confirm(`Suspendre « ${detail.name} » ?`)) return false;
        await suspendOrganizationApi(detail.id);
      } else {
        if (!confirm(`Archiver définitivement « ${detail.name} » ?`)) return false;
        await archiveOrganizationApi(detail.id);
      }
    });
  }

  async function applyPeriod() {
    if (!detail?.subscriptionId) {
      alert("Aucun abonnement lié à cet institut.");
      return;
    }
    if (periodMode === "date" && !periodEnd) {
      alert("Choisissez une date d’échéance.");
      return;
    }
    await run(async () => {
      if (periodMode === "date") {
        await adminSubscriptionAction(detail.subscriptionId!, {
          action: "set-period",
          periodEnd: new Date(`${periodEnd}T23:59:59`).toISOString(),
        });
      } else {
        await adminSubscriptionAction(detail.subscriptionId!, {
          action: "extend",
          months: periodMonths,
        });
      }
    });
  }

  async function applyPrice() {
    if (!detail?.subscriptionId) {
      alert("Aucun abonnement lié à cet institut.");
      return;
    }
    const price = Number(priceInput.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      alert("Indiquez un prix en dirhams.");
      return;
    }
    await run(async () => {
      await adminSubscriptionAction(detail.subscriptionId!, {
        action: "set-price",
        price,
      });
    });
  }

  async function applyPaid(paid: boolean) {
    if (!detail?.subscriptionId) {
      alert("Aucun abonnement lié à cet institut.");
      return;
    }
    if (detail.subscription?.paid === paid) return;
    await run(async () => {
      await adminSubscriptionAction(detail.subscriptionId!, {
        action: "set-paid",
        paid,
      });
    });
  }

  async function applyDemo() {
    if (!detail?.subscriptionId) {
      alert("Aucun abonnement lié à cet institut.");
      return;
    }
    if (
      !confirm(
        `Passer « ${detail.name} » en mode démo 7 jours ?`,
      )
    ) {
      return;
    }
    await run(async () => {
      await adminSubscriptionAction(detail.subscriptionId!, {
        action: "demo-trial",
        days: 7,
      });
    });
  }

  return (
    <aside className="flex w-full flex-col rounded-2xl bg-white shadow-sm">
      <div className="flex shrink-0 items-start justify-between gap-2 px-3 pb-0 pt-3">
        {loading || !detail ? (
          <p className="text-sm text-ink/45">Chargement…</p>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <OrgAvatar
              name={detail.name}
              logoUrl={detail.logoUrl}
              className="h-10 w-10 rounded-xl text-sm font-black shadow-md"
              fallbackClassName="bg-gradient-to-br from-primary to-[#B61149] text-white"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="truncate text-base font-black text-ink">{detail.name}</h2>
                <StatusPill org={detail} />
              </div>
              <p className="text-[11px] text-ink/45">
                /{detail.slug}
                {detail.city ? ` · ${detail.city}` : ""}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          className="rounded-xl p-1.5 text-ink/40 hover:bg-[#FFEFF8]"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {detail ? (
        <div className="space-y-2 p-3">
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-xl bg-[#FFEFF8] px-2 py-2">
              <p className="text-[10px] text-ink/45">Clientes</p>
              <p className="text-base font-black text-ink">{detail.stats.customers}</p>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] px-2 py-2">
              <p className="text-[10px] text-ink/45">RDV</p>
              <p className="text-base font-black text-ink">{detail.stats.appointments}</p>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] px-2 py-2">
              <p className="text-[10px] text-ink/45">CA</p>
              <p className="text-sm font-black text-ink">{mad(detail.stats.revenue)}</p>
            </div>
            <div className="rounded-xl bg-[#FFEFF8] px-2 py-2">
              <p className="text-[10px] text-ink/45">Staff</p>
              <p className="text-sm font-black text-ink">
                {detail.stats.staff} · {detail.stats.products}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FFEFF8]/80 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                Propriétaire
              </span>
              <span className="text-[10px] font-semibold text-primary">OWNER</span>
            </div>
            <p className="mt-1 truncate text-sm font-bold text-ink">
              {detail.ownerName ?? "—"}
            </p>
            <p className="truncate text-xs text-ink/45">
              {detail.ownerEmail ?? detail.email ?? "—"}
              {detail.ownerPhone || detail.phone
                ? ` · ${detail.ownerPhone ?? detail.phone}`
                : ""}
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFEFF8]/80 px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                Abonnement
              </span>
              <Shield className="h-3.5 w-3.5 text-[#7B5900]" />
            </div>
            <div className="space-y-0.5 text-xs text-ink/55">
              <div className="flex justify-between">
                <span>Formule</span>
                <span className="font-bold text-ink">
                  {detail.subscription
                    ? `${PLAN_LABEL[detail.subscription.plan]} · ${mad(detail.subscription.price)}`
                    : detail.plan
                      ? PLAN_LABEL[detail.plan]
                      : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Statut abo.</span>
                <span className="font-bold text-ink">
                  {detail.subscription?.status ?? detail.subscriptionStatus ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Échéance</span>
                <span className="font-bold text-ink">
                  {formatDate(detail.subscription?.renewAt ?? detail.renewAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Paiement</span>
                <span
                  className={cn(
                    "font-bold",
                    detail.subscription?.paid ? "text-emerald-700" : "text-red-600",
                  )}
                >
                  {detail.subscription ? (detail.subscription.paid ? "Payé" : "Non payé") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Utilisateurs</span>
                <span className="font-bold text-ink">{detail.usersCount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-line p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Actions
            </p>

            <div className="mt-2 space-y-2">
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  Modifier
                </summary>
                <div className="mt-1.5 flex flex-col gap-2">
                  <input
                    className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary"
                    placeholder="Nom"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary"
                    placeholder="E-mail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary"
                      placeholder="Téléphone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(limitPhoneDigits(e.target.value))}
                      inputMode="numeric"
                      maxLength={10}
                    />
                    <input
                      className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary"
                      placeholder="Ville"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy || editName.trim().length < 2}
                    onClick={() => void saveEdit()}
                    className="h-10 rounded-xl bg-ink text-xs font-bold text-white disabled:opacity-60"
                  >
                    {busy ? "…" : "Enregistrer les modifications"}
                  </button>
                </div>
              </details>

                <div className="border-t border-[#F0DDE9] pt-2">
                <p className="mb-1 text-xs font-semibold text-ink">Changer le statut</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["ACTIVE", "Actif"],
                      ["SUSPENDED", "Suspendu"],
                      ["ARCHIVED", "Archivé"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={busy || detail.status === value}
                      onClick={() => void applyStatus(value)}
                      className={cn(
                        "rounded-lg py-2 text-[11px] font-bold transition",
                        detail.status === value
                          ? "bg-primary text-white"
                          : "bg-[#FFEFF8] text-ink hover:bg-primary/10",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeInstitut()}
                  className="mt-1.5 h-9 w-full rounded-xl bg-red-600 text-xs font-bold text-white disabled:opacity-60"
                >
                  Supprimer l’institut
                </button>
              </div>

              <details className="border-t border-[#F0DDE9] pt-2">
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  Changer la période
                </summary>
                <div className="mb-2 mt-1.5 grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ["date", "Date d’échéance"],
                      ["extend", "Prolonger"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPeriodMode(value)}
                      className={cn(
                        "rounded-lg py-2 text-[11px] font-bold transition",
                        periodMode === value
                          ? "bg-primary text-white"
                          : "bg-[#FFEFF8] text-ink hover:bg-primary/10",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {periodMode === "date" ? (
                    <input
                      className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  ) : (
                    <select
                      className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-primary"
                      value={periodMonths}
                      onChange={(e) => setPeriodMonths(Number(e.target.value))}
                    >
                      {[1, 2, 3, 6, 12].map((m) => (
                        <option key={m} value={m}>
                          Prolonger de {m} mois
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    disabled={busy || !detail.subscriptionId}
                    onClick={() => void applyPeriod()}
                    className="h-10 rounded-xl bg-primary text-xs font-bold text-white disabled:opacity-60"
                  >
                    {busy ? "…" : "Appliquer la période"}
                  </button>
                </div>
              </details>

              <div className="border-t border-[#F0DDE9] pt-2">
                <p className="mb-1 text-xs font-semibold text-ink">Prix de l’institut</p>
                <div className="flex gap-1.5">
                  <input
                    className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary"
                    inputMode="decimal"
                    min={0}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="599"
                    step="1"
                    type="number"
                    value={priceInput}
                  />
                  <span className="flex h-9 items-center text-xs font-bold text-ink/45">DH</span>
                  <button
                    type="button"
                    disabled={busy || !detail.subscriptionId}
                    onClick={() => void applyPrice()}
                    className="h-9 shrink-0 rounded-lg bg-ink px-3 text-[11px] font-bold text-white disabled:opacity-60"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-[#F0DDE9] pt-2">
                <div>
                  <p className="mb-1 text-xs font-semibold text-ink">Paiement</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        [true, "Payé"],
                        [false, "Impayé"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={label}
                        type="button"
                        disabled={busy || !detail.subscriptionId || detail.subscription?.paid === value}
                        onClick={() => void applyPaid(value)}
                        className={cn(
                          "rounded-lg py-1.5 text-[11px] font-bold transition disabled:opacity-60",
                          detail.subscription?.paid === value
                            ? value
                              ? "bg-emerald-600 text-white"
                              : "bg-red-600 text-white"
                            : "bg-[#FFEFF8] text-ink hover:bg-primary/10",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-ink">Démo</p>
                  <button
                    type="button"
                    disabled={busy || !detail.subscriptionId}
                    onClick={() => void applyDemo()}
                    className="flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-[#FFDEA4]/60 text-[11px] font-bold text-[#5D4200] disabled:opacity-60"
                  >
                    <Hourglass className="h-3.5 w-3.5" />
                    7 jours
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export function AdminOrganizationsView() {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [dash, setDash] = useState<Dash | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan | "ALL">("ALL");
  const [city, setCity] = useState("ALL");
  const [tab, setTab] = useState<StatusTab>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loadSeq = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("orgs-omni-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    setLoading(true);
    Promise.all([
      fetchOrganizations({
        search: q || undefined,
        plan: plan !== "ALL" ? plan : undefined,
      }),
      fetchAdminDashboard().catch(() => null),
    ])
      .then(([orgRes, d]) => {
        if (seq !== loadSeq.current) return;
        setItems(orgRes.items);
        if (d) setDash(d);
      })
      .catch(console.error)
      .finally(() => {
        if (seq === loadSeq.current) setLoading(false);
      });
  }, [q, plan]);

  useEffect(() => {
    load();
  }, [load]);

  function forgetOrganization(id: string) {
    setItems((rows) => rows.filter((row) => row.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    load();
  }

  useEffect(() => {
    setPage(1);
  }, [q, plan, city, tab]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const o of items) {
      if (o.city?.trim()) set.add(o.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (!matchesTab(o, tab)) return false;
      if (city !== "ALL" && (o.city ?? "") !== city) return false;
      return true;
    });
  }, [items, tab, city]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, filtered.length);

  const counts = useMemo(() => {
    const c = {
      all: items.length,
      active: 0,
      trial: 0,
      payment_due: 0,
      suspended: 0,
      archived: 0,
    };
    for (const o of items) {
      if (matchesTab(o, "active")) c.active += 1;
      if (matchesTab(o, "trial")) c.trial += 1;
      if (matchesTab(o, "payment_due")) c.payment_due += 1;
      if (matchesTab(o, "suspended")) c.suspended += 1;
      if (matchesTab(o, "archived")) c.archived += 1;
    }
    return c;
  }, [items]);

  const s = dash?.stats;
  const activePct =
    s && s.orgs > 0
      ? Math.round(((dash?.subscriptions.active ?? 0) / s.orgs) * 1000) / 10
      : 0;

  const tabs: { id: StatusTab; label: string; count: number; dot?: string }[] = [
    { id: "all", label: "Tous", count: counts.all },
    { id: "active", label: "Actifs", count: counts.active, dot: "bg-[#7B5900]" },
    { id: "trial", label: "En essai", count: counts.trial, dot: "bg-primary" },
    { id: "payment_due", label: "Impayés", count: counts.payment_due, dot: "bg-red-500" },
    { id: "suspended", label: "Suspendus", count: counts.suspended, dot: "bg-ink" },
    { id: "archived", label: "Archivés", count: counts.archived },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
              Instituts & Tenants
            </h1>
            <p className="mt-1 max-w-2xl text-[15px] text-ink/55">
              Supervision et cycle de vie des {s?.orgs ?? items.length} établissements
              inscrits sur Rappel Beauté.
            </p>
          </div>
        </div>

        <div className="relative flex h-12 items-center rounded-2xl bg-white px-4 shadow-sm sm:h-14">
          <Search className="mr-3 h-5 w-5 shrink-0 text-ink/35" />
          <input
            id="orgs-omni-search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Rechercher par nom, gérante, e-mail, ville, slug…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink/30 focus:outline-none"
          />
          <kbd className="hidden rounded-md bg-[#FFEFF8] px-1.5 py-0.5 text-[10px] font-bold text-ink/45 sm:inline">
            ⌘K
          </kbd>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Total
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8]">
              <Store className="h-4 w-4 text-ink" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {s?.orgs ?? items.length}
            </span>
            <p className="mt-0.5 text-[11px] font-bold text-[#7B5900]">
              +{s?.orgsDelta ?? 0} ce mois
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Actifs
            </span>
            <Verified className="h-4 w-4 text-[#7B5900]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink sm:text-3xl">
              {dash?.subscriptions.active ?? counts.active}
            </span>
            <p className="mt-0.5 text-[11px] text-ink/50">
              <span className="font-bold text-ink">{activePct}%</span>
              {s ? ` · ${mad(s.mrr)} MRR` : ""}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#FFEFF8]">
            <div
              className="h-full rounded-full bg-[#7B5900]"
              style={{ width: `${Math.min(100, activePct)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              En essai
            </span>
            <Hourglass className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink sm:text-3xl">
              {dash?.subscriptions.pending ?? counts.trial}
            </span>
            <p className="mt-0.5 text-[11px] font-bold text-primary">
              {dash?.subscriptions.expiringSoon ?? 0} expirent bientôt
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Expirent &lt; 7j
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFDEA4]/60 text-[#5D4200]">
              <Hourglass className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#7B5900] sm:text-3xl">
              {dash?.subscriptions.expiringSoon ?? 0}
            </span>
            <p className="mt-0.5 text-[11px] font-semibold text-ink/55">Action requise</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Impayés
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-600 sm:text-3xl">
              {(() => {
                const n =
                  (dash?.payments.pastDue ?? 0) + (dash?.payments.failed ?? 0);
                return n > 0 ? n : counts.payment_due;
              })()}
            </span>
            <p className="mt-0.5 text-[11px] font-bold text-red-600">À recouvrer</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
              Suspendus
            </span>
            <Lock className="h-4 w-4 text-ink/50" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink/60 sm:text-3xl">
              {dash?.stats && "suspendedOrgs" in dash.stats
                ? dash.stats.suspendedOrgs
                : dash?.orgStatus.suspended ?? counts.suspended}
            </span>
            <p className="mt-0.5 text-[11px] text-ink/45">Licences gelées</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === t.id
                  ? "bg-primary font-bold text-white shadow-sm"
                  : "bg-white text-ink/55 hover:bg-[#FFEFF8]",
              )}
            >
              {t.dot ? <span className={cn("h-2 w-2 rounded-full", t.dot)} /> : null}
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl bg-[#FFEFF8] px-3 py-1.5 text-xs text-ink">
              <Filter className="h-3.5 w-3.5 text-ink/40" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-transparent font-semibold focus:outline-none"
              >
                <option value="ALL">Toutes les villes</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-[#FFEFF8] px-3 py-1.5 text-xs text-ink">
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as SubscriptionPlan | "ALL")}
                className="bg-transparent font-semibold focus:outline-none"
              >
                <option value="ALL">Toutes les formules</option>
                <option value="STARTER">Starter</option>
                <option value="INSTITUT">Institut</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-ink/45">
            Affichage de <span className="font-bold text-ink">{from}</span> à{" "}
            <span className="font-bold text-ink">{to}</span> sur{" "}
            <span className="font-bold text-ink">{filtered.length}</span>
          </p>
        </div>
      </section>

      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
          Aucun institut trouvé.
        </p>
      ) : null}

      {/* Layout table + drawer */}
      <div className="relative flex flex-col items-start gap-5 md:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Mobile cards */}
          <ul className="space-y-3 xl:hidden">
            {pageItems.map((org) => {
              const featured = selectedId === org.id;
              return (
                <li
                  key={org.id}
                  className={cn(
                    "rounded-2xl border bg-white p-3.5 shadow-sm transition-all",
                    featured ? "border-primary/30" : "border-transparent",
                    org.status === "SUSPENDED" && "opacity-80",
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedId(org.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <OrgAvatar
                          name={org.name}
                          logoUrl={org.logoUrl}
                          className="h-11 w-11 rounded-xl text-sm font-extrabold"
                          fallbackClassName={cn(
                            statusLabel(org).tone === "due"
                              ? "bg-red-100 text-red-800"
                              : statusLabel(org).tone === "active"
                                ? "bg-gradient-to-br from-primary to-[#B61149] text-white"
                                : "bg-[#FFEFF8] text-ink",
                          )}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h2 className="truncate text-sm font-bold text-ink">{org.name}</h2>
                            {org.plan === "PREMIUM" ? (
                              <span className="rounded bg-amber-50 px-1 text-[10px] font-bold text-amber-700">
                                Prestige
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-ink/45">
                            <span className="font-mono font-semibold text-primary">
                              /{org.slug}
                            </span>
                            {org.city ? ` · ${org.city}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusPill org={org} />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-[#F0DDE9]/80 pt-2.5 text-xs">
                      <div>
                        <span className="font-semibold text-ink">
                          {org.ownerName ?? "—"}
                        </span>
                        {org.ownerEmail ? (
                          <span className="mt-0.5 block truncate text-[10px] text-ink/40">
                            {org.ownerEmail}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase text-ink/40">
                          Abonnement
                        </span>
                        <span className="font-bold text-ink">
                          {org.plan ? PLAN_LABEL[org.plan] : "—"}
                          {org.mrr > 0 ? ` · ${mad(org.mrr)}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-ink/45">
                      <span>{org.usersCount} utilisateur{org.usersCount > 1 ? "s" : ""}</span>
                      <span>Créé {formatDate(org.createdAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-3xl bg-white shadow-sm xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="bg-[#FFEFF8]/60 text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    <th className="px-4 py-3.5 font-medium">Institut</th>
                    <th className="px-3 py-3.5 font-medium">Gérante</th>
                    <th className="px-3 py-3.5 font-medium">Ville</th>
                    <th className="px-3 py-3.5 font-medium">Formule</th>
                    <th className="px-3 py-3.5 font-medium">Usage</th>
                    <th className="px-3 py-3.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0DDE9]/80">
                  {pageItems.map((org) => (
                    <tr
                      key={org.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-[#FFEFF8]/50",
                        selectedId === org.id && "bg-[#FFEFF8]/70",
                        org.status === "SUSPENDED" && "opacity-75",
                      )}
                      onClick={() => setSelectedId(org.id)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <OrgAvatar
                            name={org.name}
                            logoUrl={org.logoUrl}
                            className="h-11 w-11 rounded-2xl text-sm font-black"
                            fallbackClassName={cn(
                              statusLabel(org).tone === "due"
                                ? "bg-red-100 text-red-800"
                                : selectedId === org.id
                                  ? "bg-gradient-to-br from-primary to-[#B61149] text-white"
                                  : "bg-[#FFEFF8] text-ink",
                            )}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-bold text-ink">{org.name}</span>
                              {org.plan === "PREMIUM" ? (
                                <Verified className="h-3.5 w-3.5 shrink-0 text-[#7B5900]" />
                              ) : null}
                            </div>
                            <p className="font-mono text-[11px] text-primary">/{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFEFF8] text-[10px] font-bold">
                            {ownerInitials(org.ownerName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-ink">
                              {org.ownerName ?? "—"}
                            </p>
                            <p className="truncate text-[11px] text-ink/40">
                              {org.ownerEmail ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-xs font-bold text-ink">{org.city ?? "—"}</p>
                        {org.phone ? (
                          <p className="font-mono text-[11px] text-ink/40">{org.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-xs font-bold text-primary">
                          {org.plan ? PLAN_LABEL[org.plan] : "—"}
                          {org.mrr > 0 ? ` · ${mad(org.mrr)}` : ""}
                        </p>
                        <p className="text-[11px] text-ink/40">
                          {org.subscriptionStatus === "TRIAL"
                            ? `Essai · fin ${formatDate(org.renewAt)}`
                            : org.renewAt
                              ? `Échéance ${formatDate(org.renewAt)}`
                              : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-md bg-[#FFEFF8] px-2 py-0.5 text-[11px] font-medium text-ink">
                          {org.usersCount} user{org.usersCount > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill org={org} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#F0DDE9]/60 bg-[#FFEFF8]/30 p-4 sm:flex-row">
              <p className="text-xs text-ink/45">
                Page <span className="font-bold text-ink">{pageSafe}</span> sur{" "}
                <span className="font-bold text-ink">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#FFEFF8] px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm disabled:opacity-40"
                >
                  Suivant
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile pagination */}
          <div className="flex items-center justify-between pt-1 text-xs text-ink/45 xl:hidden">
            <span>
              Page {pageSafe} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md bg-stone-200 px-2.5 py-1 font-medium disabled:opacity-40"
              >
                Préc.
              </button>
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md bg-primary px-2.5 py-1 font-bold text-white disabled:opacity-40"
              >
                Suiv.
              </button>
            </div>
          </div>
        </div>

        {selectedId ? (
          <div className="order-first w-full shrink-0 self-start md:sticky md:top-20 md:order-none md:w-[340px] lg:top-4 xl:w-[400px]">
            <TenantDrawer
              orgId={selectedId}
              onClose={() => setSelectedId(null)}
              onChanged={load}
              onDeleted={forgetOrganization}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
