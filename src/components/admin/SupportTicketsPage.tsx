"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AdminActionsMenu,
  adminMenuItemClass,
} from "@/components/admin/AdminActionsMenu";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import {
  createSupportTicketAdmin,
  fetchOrgUsersForTicket,
  fetchSupportAnalytics,
  fetchSupportTickets,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABEL,
  updateSupportTicketAdmin,
  type AdminSupportAttention,
  type AdminSupportKpis,
  type AdminSupportTicketItem,
} from "@/modules/admin/support-tickets";

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  return `Il y a ${days} j`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-red-50 text-red-700 border-red-100",
    IN_PROGRESS: "bg-amber-50 text-amber-800 border-amber-100",
    WAITING_CUSTOMER: "bg-violet-50 text-violet-800 border-violet-100",
    RESOLVED: "bg-emerald-50 text-emerald-800 border-emerald-100",
    CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${colors[status] ?? "bg-[#FBF4F6] text-ink/70"}`}
    >
      {SUPPORT_STATUS_LABEL[status as keyof typeof SUPPORT_STATUS_LABEL] ?? status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    URGENT: "text-red-700",
    HIGH: "text-orange-600",
    NORMAL: "text-amber-700",
    LOW: "text-slate-500",
  };
  return (
    <span className={`font-mono text-[11px] font-semibold ${colors[priority] ?? ""}`}>
      {SUPPORT_PRIORITY_LABEL[priority as keyof typeof SUPPORT_PRIORITY_LABEL] ?? priority}
    </span>
  );
}

const PRI_COLORS = {
  URGENT: "#C44536",
  HIGH: "#EA580C",
  NORMAL: "#D97706",
  LOW: "#94A3B8",
};

export function SupportTicketsPageView() {
  const router = useRouter();
  const [tab, setTab] = useState<"tickets" | "analytics">("tickets");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [attention, setAttention] = useState("");
  const [kpis, setKpis] = useState<AdminSupportKpis | null>(null);
  const [attn, setAttn] = useState<AdminSupportAttention | null>(null);
  const [items, setItems] = useState<AdminSupportTicketItem[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [assignees, setAssignees] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [analytics, setAnalytics] = useState<Awaited<
    ReturnType<typeof fetchSupportAnalytics>
  > | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchSupportTickets({
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        organizationId: organizationId || undefined,
        q: q.trim() || undefined,
        attention: attention || undefined,
      });
      setKpis(res.kpis);
      setAttn(res.attention);
      setItems(res.items);
      setOrgs(res.orgs);
      setAssignees(res.assignees);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [status, priority, category, organizationId, q, attention]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (tab !== "analytics") return;
    fetchSupportAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [tab]);

  async function quickStatus(id: string, next: string) {
    try {
      await updateSupportTicketAdmin(id, { status: next });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible");
    }
  }

  async function quickAssign(id: string, assignedToPlatformUserId: string | null) {
    try {
      await updateSupportTicketAdmin(id, { assignedToPlatformUserId });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assignation impossible");
    }
  }

  const attentionTotal = useMemo(() => {
    if (!attn) return 0;
    return attn.urgentOpen + attn.highOpen + attn.waitingCustomer + attn.staleNoReply;
  }, [attn]);

  return (
    <>
      <AdminPageHeader
        title="Support"
        description="Gérez les demandes d'assistance des instituts."
        action={
          <button type="button" className="ac-btn" onClick={() => setCreateOpen(true)}>
            + Créer un ticket
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        {(
          [
            ["tickets", "Tickets"],
            ["analytics", "Analytics"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === k
                ? "bg-ink text-white"
                : "border border-line bg-white text-ink/60 hover:bg-[#FBF4F6]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "analytics" ? (
        <SupportAnalyticsPanel data={analytics} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total" value={loading ? "…" : String(kpis?.total ?? 0)} />
            <StatTile label="Ouverts" value={loading ? "…" : String(kpis?.open ?? 0)} />
            <StatTile label="En cours" value={loading ? "…" : String(kpis?.inProgress ?? 0)} />
            <StatTile label="Résolus" value={loading ? "…" : String(kpis?.resolved ?? 0)} />
          </div>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="ac-card px-4 py-3 text-sm">
              <p className="text-[var(--admin-muted)]">Temps moyen de réponse</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {kpis?.avgFirstResponseLabel ?? "—"}
              </p>
            </div>
            <div className="ac-card px-4 py-3 text-sm">
              <p className="text-[var(--admin-muted)]">Temps moyen de résolution</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {kpis?.avgResolutionLabel ?? "—"}
              </p>
            </div>
            <div className="ac-card px-4 py-3 text-sm">
              <p className="text-[var(--admin-muted)]">Satisfaction support</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {kpis?.avgSatisfaction != null ? `★ ${kpis.avgSatisfaction} / 5` : "—"}
              </p>
            </div>
          </div>

          {attn && attentionTotal > 0 ? (
            <section className="mb-6 rounded-xl border border-red-100 bg-red-50/60 p-4">
              <h3 className="font-display text-base font-semibold text-red-900">
                Nécessite votre attention
              </h3>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {attn.urgentOpen > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg bg-white px-3 py-1.5 font-medium text-red-700 shadow-sm"
                    onClick={() => setAttention("urgent")}
                  >
                    {attn.urgentOpen} urgents
                  </button>
                ) : null}
                {attn.highOpen > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg bg-white px-3 py-1.5 font-medium text-orange-700 shadow-sm"
                    onClick={() => setAttention("high")}
                  >
                    {attn.highOpen} haute priorité
                  </button>
                ) : null}
                {attn.waitingCustomer > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg bg-white px-3 py-1.5 font-medium text-violet-700 shadow-sm"
                    onClick={() => setAttention("waiting")}
                  >
                    {attn.waitingCustomer} en attente client
                  </button>
                ) : null}
                {attn.staleNoReply > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg bg-white px-3 py-1.5 font-medium text-ink shadow-sm"
                    onClick={() => setAttention("stale")}
                  >
                    {attn.staleNoReply} sans réponse +2h
                  </button>
                ) : null}
                {attention ? (
                  <button
                    type="button"
                    className="text-xs text-ink/50 underline"
                    onClick={() => setAttention("")}
                  >
                    Effacer le filtre
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm"
              placeholder="Rechercher un ticket…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Statut</option>
              {SUPPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SUPPORT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">Priorité</option>
              {SUPPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {SUPPORT_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Catégorie</option>
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SUPPORT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              <option value="">Organisation</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>
          ) : null}

          {!loading && items.length === 0 ? (
            <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">Aucun ticket.</p>
          ) : (
            <div className="ac-card overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-line text-[11px] uppercase tracking-wide text-[var(--admin-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ticket</th>
                    <th className="px-4 py-3 font-medium">Sujet</th>
                    <th className="px-4 py-3 font-medium">Organisation</th>
                    <th className="px-4 py-3 font-medium">Catégorie</th>
                    <th className="px-4 py-3 font-medium">Priorité</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Activité</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr
                      key={t.id}
                      className="cursor-pointer border-b border-line/70 hover:bg-[#FBF4F6]"
                      onClick={() => router.push(adminHref(`/support/tickets/${t.id}/`))}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[var(--admin-accent)]">
                        {t.ref}
                      </td>
                      <td className="px-4 py-3 font-medium">{t.subject}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={adminHref(`/organizations/${t.organizationId}/`)}
                          className="text-[var(--admin-accent)] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t.organizationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">
                        {SUPPORT_CATEGORY_LABEL[t.category]}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--admin-muted)]">
                        {relativeTime(t.lastMessageAt ?? t.updatedAt)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <AdminActionsMenu triggerLabel="⋮">
                          {(close) => (
                            <>
                              <Link
                                href={adminHref(`/support/tickets/${t.id}/`)}
                                className={adminMenuItemClass}
                                onClick={close}
                              >
                                Ouvrir
                              </Link>
                              <button
                                type="button"
                                className={adminMenuItemClass}
                                onClick={() => {
                                  close();
                                  void quickStatus(t.id, "IN_PROGRESS");
                                }}
                              >
                                Mettre en cours
                              </button>
                              <button
                                type="button"
                                className={adminMenuItemClass}
                                onClick={() => {
                                  close();
                                  void quickStatus(t.id, "WAITING_CUSTOMER");
                                }}
                              >
                                En attente
                              </button>
                              <button
                                type="button"
                                className={adminMenuItemClass}
                                onClick={() => {
                                  close();
                                  void quickStatus(t.id, "RESOLVED");
                                }}
                              >
                                Résoudre
                              </button>
                              <button
                                type="button"
                                className={adminMenuItemClass}
                                onClick={() => {
                                  close();
                                  void quickStatus(t.id, "CLOSED");
                                }}
                              >
                                Fermer
                              </button>
                              {assignees.slice(0, 4).map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  className={adminMenuItemClass}
                                  onClick={() => {
                                    close();
                                    void quickAssign(t.id, a.id);
                                  }}
                                >
                                  Assigner → {a.name}
                                </button>
                              ))}
                              <Link
                                href={adminHref(`/organizations/${t.organizationId}/`)}
                                className={adminMenuItemClass}
                                onClick={close}
                              >
                                Voir l&apos;organisation
                              </Link>
                            </>
                          )}
                        </AdminActionsMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {createOpen ? (
        <CreateTicketModal
          orgs={orgs}
          assignees={assignees}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            router.push(adminHref(`/support/tickets/${id}/`));
          }}
        />
      ) : null}
    </>
  );
}

function SupportAnalyticsPanel({
  data,
}: {
  data: Awaited<ReturnType<typeof fetchSupportAnalytics>> | null;
}) {
  if (!data) {
    return <p className="text-sm text-[var(--admin-muted)]">Chargement analytics…</p>;
  }
  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.count));

  return (
    <div className="space-y-4">
      <section className="ac-card p-5">
        <h3 className="font-display text-lg font-semibold">Tickets par jour (30 j)</h3>
        <div className="mt-3 h-56">
          {data.byDay.length ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data.byDay}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} width={28} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#E31C5F" fill="#FDEAF0" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-[var(--admin-muted)]">Pas de données.</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ac-card p-5">
          <h3 className="font-display text-lg font-semibold">Par catégorie</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {data.byCategory.slice(0, 10).map((c) => (
              <li key={c.category}>
                <div className="mb-1 flex justify-between">
                  <span>{SUPPORT_CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <span className="font-mono text-[var(--admin-muted)]">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(c.count / maxCat) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="ac-card p-5">
          <h3 className="font-display text-lg font-semibold">Par priorité</h3>
          <div className="mx-auto mt-2 h-48 max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data.byPriority.filter((p) => p.count > 0)}
                  dataKey="count"
                  nameKey="priority"
                  innerRadius={44}
                  outerRadius={70}
                >
                  {data.byPriority.map((p) => (
                    <Cell key={p.priority} fill={PRI_COLORS[p.priority]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _n, item) => {
                    const p = item?.payload as { percent?: number; priority?: string };
                    return [
                      `${v} (${p?.percent ?? 0} %)`,
                      SUPPORT_PRIORITY_LABEL[p?.priority as keyof typeof SUPPORT_PRIORITY_LABEL] ??
                        "",
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {data.byPriority.map((p) => (
              <li key={p.priority} className="flex justify-between">
                <span>{SUPPORT_PRIORITY_LABEL[p.priority]}</span>
                <span className="font-mono text-[var(--admin-muted)]">
                  {p.percent} % · {p.count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="ac-card p-5">
        <h3 className="font-display text-lg font-semibold">Temps moyen de réponse</h3>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={data.responseByWeekday.map((d) => ({
                ...d,
                avg: d.avgMinutes != null ? Math.round(d.avgMinutes) : 0,
              }))}
            >
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={36} unit="m" />
              <Tooltip formatter={(v) => [`${v} min`, "Réponse"]} />
              <Bar dataKey="avg" fill="#7C3A6A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function CreateTicketModal({
  orgs,
  assignees,
  onClose,
  onCreated,
}: {
  orgs: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [organizationId, setOrganizationId] = useState("");
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("TECHNICAL");
  const [priority, setPriority] = useState("NORMAL");
  const [message, setMessage] = useState("");
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setUsers([]);
      setCreatedByUserId("");
      return;
    }
    fetchOrgUsersForTicket(organizationId)
      .then((r) => {
        setUsers(r.users);
        setCreatedByUserId(r.users[0]?.id ?? "");
      })
      .catch(() => setUsers([]));
  }, [organizationId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await createSupportTicketAdmin({
        organizationId,
        createdByUserId,
        subject,
        category,
        priority,
        message,
        assignedToPlatformUserId: assignee || null,
      });
      onCreated(res.ticket.id);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="font-display text-xl font-semibold">Créer un ticket</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-[var(--admin-muted)]">Organisation</span>
            <select
              className="w-full rounded-lg border border-line px-3 py-2"
              required
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              <option value="">Choisir…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[var(--admin-muted)]">Utilisateur</span>
            <select
              className="w-full rounded-lg border border-line px-3 py-2"
              required
              value={createdByUserId}
              onChange={(e) => setCreatedByUserId(e.target.value)}
              disabled={!users.length}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[var(--admin-muted)]">Sujet</span>
            <input
              className="w-full rounded-lg border border-line px-3 py-2"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[var(--admin-muted)]">Catégorie</span>
              <select
                className="w-full rounded-lg border border-line px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SUPPORT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[var(--admin-muted)]">Priorité</span>
              <select
                className="w-full rounded-lg border border-line px-3 py-2"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {SUPPORT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {SUPPORT_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[var(--admin-muted)]">Assigné à</span>
            <select
              className="w-full rounded-lg border border-line px-3 py-2"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Moi (par défaut)</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[var(--admin-muted)]">Description</span>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-line px-3 py-2"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
        </div>
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="ac-btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="ac-btn" disabled={saving}>
            {saving ? "…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
