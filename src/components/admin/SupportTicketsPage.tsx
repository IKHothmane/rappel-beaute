"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Hourglass,
  LifeBuoy,
  Lock,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Star,
  Ticket,
  Timer,
  X,
} from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import {
  createSupportTicketAdmin,
  fetchOrgUsersForTicket,
  fetchSupportAnalytics,
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicketAdmin,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABEL,
  updateSupportTicketAdmin,
  type AdminSupportAttention,
  type AdminSupportKpis,
  type AdminSupportMessageItem,
  type AdminSupportTicketItem,
} from "@/modules/admin/support-tickets";

type QuickFilter = "" | "unassigned" | "urgent" | "stale" | "mine";

const PAGE_SIZE = 20;

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function slaHint(t: AdminSupportTicketItem) {
  if (t.status === "RESOLVED" || t.status === "CLOSED") return "Clôturé";
  if (!t.firstResponseAt) {
    const mins = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  return "SLA OK";
}

function PriorityPill({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold",
        priority === "URGENT" && "bg-red-100 text-red-800",
        priority === "HIGH" && "bg-[#FFDEA4] text-[#5D4200]",
        priority === "NORMAL" && "bg-[#F0DDE9] text-ink/70",
        priority === "LOW" && "bg-[#FFEFF8] text-ink/50",
      )}
    >
      {SUPPORT_PRIORITY_LABEL[priority as keyof typeof SUPPORT_PRIORITY_LABEL] ?? priority}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
        status === "OPEN" && "bg-[#FFD9DE] text-[#400014]",
        status === "IN_PROGRESS" && "bg-[#F0DDE9] text-ink",
        status === "WAITING_CUSTOMER" && "bg-[#FFDEA4]/60 text-[#5D4200]",
        status === "RESOLVED" && "bg-emerald-50 text-emerald-700",
        status === "CLOSED" && "bg-[#F0DDE9] text-ink/50",
      )}
    >
      {SUPPORT_STATUS_LABEL[status as keyof typeof SUPPORT_STATUS_LABEL] ?? status}
    </span>
  );
}

export function SupportTicketsPageView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("");
  const [page, setPage] = useState(1);
  const [kpis, setKpis] = useState<AdminSupportKpis | null>(null);
  const [attn, setAttn] = useState<AdminSupportAttention | null>(null);
  const [items, setItems] = useState<AdminSupportTicketItem[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [assignees, setAssignees] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminSupportTicketItem | null>(null);
  const [messages, setMessages] = useState<AdminSupportMessageItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyMode, setReplyMode] = useState<"reply" | "internal">("reply");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [analytics, setAnalytics] = useState<Awaited<
    ReturnType<typeof fetchSupportAnalytics>
  > | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const attentionParam =
    quick === "urgent" ? "urgent" : quick === "stale" ? "stale" : undefined;

  const refresh = useCallback(async () => {
    try {
      const res = await fetchSupportTickets({
        status: status || undefined,
        priority: priority || (quick === "urgent" ? "URGENT" : undefined),
        category: category || undefined,
        organizationId: organizationId || undefined,
        q: q || undefined,
        attention: attentionParam,
      });
      setKpis(res.kpis);
      setAttn(res.attention);
      setItems(res.items);
      setOrgs(res.orgs);
      setAssignees(res.assignees);
      setError(null);
      setSelectedId((prev) => prev ?? res.items[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [status, priority, category, organizationId, q, attentionParam, quick]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    setPage(1);
  }, [status, priority, category, organizationId, q, quick, assigneeFilter]);

  useEffect(() => {
    fetchSupportAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetchSupportTicket(selectedId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res.ticket);
        setMessages(res.messages);
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (quick === "unassigned" && t.assignedToPlatformUserId) return false;
      if (assigneeFilter === "none" && t.assignedToPlatformUserId) return false;
      if (
        assigneeFilter &&
        assigneeFilter !== "none" &&
        t.assignedToPlatformUserId !== assigneeFilter
      ) {
        return false;
      }
      return true;
    });
  }, [items, quick, assigneeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const unassignedCount = useMemo(
    () => items.filter((t) => !t.assignedToPlatformUserId && t.status !== "CLOSED" && t.status !== "RESOLVED").length,
    [items],
  );

  const resolvedPct =
    kpis && kpis.total > 0
      ? Math.round((kpis.resolved / kpis.total) * 1000) / 10
      : 0;

  const slaRespect =
    attn && kpis
      ? Math.max(
          0,
          Math.round(
            (1 - (attn.staleNoReply + attn.urgentOpen * 0.1) / Math.max(1, kpis.open + kpis.inProgress)) *
              1000,
          ) / 10,
        )
      : 96.8;

  async function patchTicket(
    id: string,
    body: Parameters<typeof updateSupportTicketAdmin>[1],
  ) {
    try {
      await updateSupportTicketAdmin(id, body);
      await refresh();
      if (selectedId === id) {
        const res = await fetchSupportTicket(id);
        setDetail(res.ticket);
        setMessages(res.messages);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible");
    }
  }

  async function sendReply() {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    try {
      await replySupportTicketAdmin(selectedId, {
        message: replyText.trim(),
        isInternal: replyMode === "internal",
        setStatus:
          replyMode === "reply" ? "WAITING_CUSTOMER" : undefined,
      });
      setReplyText("");
      const res = await fetchSupportTicket(selectedId);
      setDetail(res.ticket);
      setMessages(res.messages);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  function exportCsv() {
    const headers = [
      "ref",
      "sujet",
      "institut",
      "categorie",
      "priorite",
      "statut",
      "assigne",
      "cree_le",
    ];
    const rows = filtered.map((t) =>
      [
        t.ref,
        t.subject,
        t.organizationName ?? "",
        t.category,
        t.priority,
        t.status,
        t.assignedToName ?? "",
        t.createdAt,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setStatus("");
    setPriority("");
    setCategory("");
    setOrganizationId("");
    setAssigneeFilter("");
    setQuick("");
    setQInput("");
    setQ("");
  }

  const catBars = useMemo(() => {
    if (!analytics?.byCategory?.length) return [];
    const total = analytics.byCategory.reduce((a, c) => a + c.count, 0) || 1;
    return analytics.byCategory.slice(0, 5).map((c) => ({
      ...c,
      pct: Math.round((c.count / total) * 1000) / 10,
      label: SUPPORT_CATEGORY_LABEL[c.category] ?? c.category,
    }));
  }, [analytics]);

  const macros = [
    { label: "Accusé réception", text: "Bonjour, nous avons bien reçu votre demande et revenons vers vous rapidement." },
    { label: "Demande infos", text: "Pour avancer, pourriez-vous nous envoyer une capture d'écran et le détail des étapes reproduites ?" },
    { label: "Résolu", text: "Le problème a été traité de notre côté. N'hésitez pas à nous écrire si le souci persiste." },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-8 lg:gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink/45">
            <span>Super Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Opérations</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-bold text-primary">Support &amp; Tickets</span>
          </nav>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-black tracking-tight text-ink lg:text-[32px]">
              Support &amp; Tickets
            </h1>
            <span className="rounded-full bg-[#F0DDE9] px-2.5 py-1 text-[11px] font-semibold text-ink/60">
              Multi-instituts
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4]/70 px-2.5 py-1 text-[11px] font-bold text-[#5D4200]">
              SLA {slaRespect}%
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-[15px] text-ink/55">
            Supervision, attribution et résolution des requêtes techniques et
            commerciales des instituts abonnés.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFEFF8] px-4 text-sm font-bold text-ink hover:bg-[#F0DDE9]"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            Créer un ticket
          </button>
        </div>
      </header>

      {/* Search + quick filters */}
      <section className="flex flex-col items-stretch gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Rechercher N° ticket, institut, gérante, mot-clé…"
            className="h-11 w-full rounded-xl bg-[#FFEFF8] pl-10 pr-4 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setQuick("")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
              quick === ""
                ? "bg-primary text-white"
                : "bg-[#FFEFF8] text-ink/55 hover:bg-[#F0DDE9]",
            )}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setQuick("unassigned")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
              quick === "unassigned"
                ? "bg-primary text-white"
                : "bg-[#FFEFF8] text-ink/55",
            )}
          >
            Non assignés
            <span className="ml-1 rounded-full bg-[#FFDEA4] px-1.5 text-[10px] font-bold text-[#5D4200]">
              {unassignedCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setQuick(quick === "urgent" ? "" : "urgent")}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold",
              quick === "urgent"
                ? "bg-red-600 text-white"
                : "bg-red-100 text-red-800",
            )}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            Urgents ({attn?.urgentOpen ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setQuick(quick === "stale" ? "" : "stale")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
              quick === "stale"
                ? "bg-primary text-white"
                : "bg-[#FFEFF8] text-ink/55",
            )}
          >
            SLA à risque ({attn?.staleNoReply ?? 0})
          </button>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-ink/45">
            <span className="text-[10px] font-bold uppercase">Total</span>
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis?.total ?? 0}</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-ink/45">
            <span className="text-[10px] font-bold uppercase">Nouveaux / ouverts</span>
            <LifeBuoy className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary">{kpis?.open ?? 0}</span>
            <span className="text-[11px] text-ink/50">Arbitrage</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-ink/45">
            <span className="text-[10px] font-bold uppercase">En cours</span>
            <Hourglass className="h-4 w-4 text-[#7B5900]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink">{kpis?.inProgress ?? 0}</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-ink/45">
            <span className="text-[10px] font-bold uppercase">En attente</span>
            <Clock className="h-4 w-4 text-ink/40" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-ink">
              {kpis?.waitingCustomer ?? 0}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-red-100 p-3.5 text-red-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase">Urgents</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">{attn?.urgentOpen ?? 0}</span>
            <span className="text-[11px] font-semibold">Bloquants</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-ink/45">
            <span className="text-[10px] font-bold uppercase">Résolus</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis?.resolved ?? 0}</span>
            <span className="text-[11px] font-bold text-primary">{resolvedPct}%</span>
          </div>
        </div>
      </section>

      {/* SLA strip */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl bg-[#FFEFF8] px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary">
            <Timer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-ink/45">1ère réponse</p>
            <p className="truncate text-lg font-black text-ink">
              {kpis?.avgFirstResponseLabel ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#FFEFF8] px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#7B5900]">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-ink/45">Résolution moy.</p>
            <p className="truncate text-lg font-black text-ink">
              {kpis?.avgResolutionLabel ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#FFEFF8] px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#7B5900]">
            <Star className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-ink/45">CSAT</p>
            <p className="truncate text-lg font-black text-ink">
              {kpis?.avgSatisfaction != null ? `${kpis.avgSatisfaction} / 5` : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#FFEFF8] px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-ink/45">Respect SLA</p>
            <p className="truncate text-lg font-black text-ink">
              {slaRespect}%
              {attn && attn.staleNoReply > 0 ? (
                <span className="ml-1 text-[11px] font-semibold text-red-600">
                  {attn.staleNoReply} hors SLA
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-ink/45">Statut</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
            >
              <option value="">Tous</option>
              {SUPPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SUPPORT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-ink/45">Priorité</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
            >
              <option value="">Toutes</option>
              {SUPPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {SUPPORT_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-ink/45">Catégorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
            >
              <option value="">Toutes</option>
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SUPPORT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-ink/45">Institut</span>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
            >
              <option value="">Tous</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-ink/45">Agent</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink focus:outline-none"
            >
              <option value="">Tous</option>
              <option value="none">Non assigné</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-lg text-[12px] font-bold text-primary hover:underline"
            >
              Réinitialiser
            </button>
          </div>
        </div>
        <p className="text-[11px] text-ink/45">
          Affichage de{" "}
          <strong className="text-ink">{filtered.length} tickets</strong>
          {kpis ? ` sur ${kpis.total} enregistrés` : ""}.
        </p>
      </section>

      {error ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-ink/45">Chargement…</p> : null}

      {/* Master-detail */}
      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        {/* List */}
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm xl:col-span-7">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-ink">File active</h2>
            </div>
            <span className="rounded-full bg-[#FFD9DE] px-2.5 py-0.5 text-[11px] font-bold text-[#400014]">
              Temps réel
            </span>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 xl:hidden">
            {pageItems.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full rounded-xl bg-[#FFF7F9] p-3.5 text-left shadow-sm",
                    selectedId === t.id && "ring-1 ring-primary/30",
                    t.priority === "URGENT" && "bg-red-50/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-primary">
                        {t.ref}
                      </span>
                      <PriorityPill priority={t.priority} />
                      <StatusPill status={t.status} />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-bold",
                        t.priority === "URGENT" ? "text-red-600" : "text-ink/45",
                      )}
                    >
                      {slaHint(t)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm font-bold text-ink">
                    {t.subject}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink/50">
                    {t.organizationName ?? "—"} · {t.createdByName ?? ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink/45">
                    <span>{SUPPORT_CATEGORY_LABEL[t.category]}</span>
                    <span>{relativeTime(t.lastMessageAt ?? t.updatedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                  <th className="rounded-l-lg px-3 py-3">ID &amp; objet</th>
                  <th className="px-3 py-3">Institut</th>
                  <th className="px-3 py-3">Catégorie</th>
                  <th className="px-3 py-3">Priorité</th>
                  <th className="px-3 py-3">SLA</th>
                  <th className="rounded-r-lg px-3 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "cursor-pointer border-t border-[#FFEFF8] transition-colors hover:bg-[#FFF7F9]",
                      selectedId === t.id && "bg-[#FCE9F4]/50",
                      (t.status === "RESOLVED" || t.status === "CLOSED") &&
                        "opacity-70",
                    )}
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-primary">
                            {t.ref}
                          </span>
                          {t.priority === "URGENT" ? (
                            <span className="h-2 w-2 animate-ping rounded-full bg-red-500" />
                          ) : null}
                          {!t.assignedToPlatformUserId ? (
                            <span className="rounded-full bg-[#FFDEA4] px-1.5 text-[10px] font-bold text-[#5D4200]">
                              Non assigné
                            </span>
                          ) : null}
                        </div>
                        <span className="line-clamp-1 font-bold text-ink">
                          {t.subject}
                        </span>
                        <span className="text-[11px] text-ink/45">
                          {t.createdByName} · {relativeTime(t.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="font-semibold text-ink">
                        {t.organizationName ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-[12px] text-ink/60">
                      {SUPPORT_CATEGORY_LABEL[t.category]}
                    </td>
                    <td className="px-3 py-3.5">
                      <PriorityPill priority={t.priority} />
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3.5 text-[11px] font-bold",
                        t.priority === "URGENT" ? "text-red-600" : "text-ink/50",
                      )}
                    >
                      {slaHint(t)}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && pageItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/40">Aucun ticket.</p>
          ) : null}

          <div className="flex items-center justify-between pt-2 text-[11px] text-ink/45">
            <span>
              Page {pageSafe} / {totalPages} · {filtered.length} tickets
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8] text-ink disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                {pageSafe}
              </span>
              <button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFEFF8] text-ink disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Detail drawer */}
        <aside className="sticky top-20 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-md xl:col-span-5">
          {detailLoading && !detail ? (
            <p className="py-12 text-center text-sm text-ink/40">Chargement…</p>
          ) : !detail ? (
            <p className="py-12 text-center text-sm text-ink/40">
              Sélectionnez un ticket pour inspecter le fil.
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-extrabold text-primary">
                      {detail.ref}
                    </span>
                    <PriorityPill priority={detail.priority} />
                    <StatusPill status={detail.status} />
                  </div>
                  <h3 className="mt-1 text-lg font-bold leading-snug text-ink">
                    {detail.subject}
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-ink/35 hover:text-ink xl:hidden"
                  onClick={() => setSelectedId(null)}
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <select
                  value={detail.assignedToPlatformUserId ?? ""}
                  onChange={(e) =>
                    void patchTicket(detail.id, {
                      assignedToPlatformUserId: e.target.value || null,
                    })
                  }
                  className="h-8 rounded-lg bg-[#FFEFF8] px-2 text-[11px] font-semibold text-ink"
                >
                  <option value="">Non assigné</option>
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <select
                  value={detail.status}
                  onChange={(e) =>
                    void patchTicket(detail.id, { status: e.target.value })
                  }
                  className="h-8 rounded-lg bg-[#FFEFF8] px-2 text-[11px] font-semibold text-ink"
                >
                  {SUPPORT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {SUPPORT_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void patchTicket(detail.id, { status: "RESOLVED" })}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#FFEFF8] px-2.5 text-[11px] font-bold text-primary"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Résoudre
                </button>
                <Link
                  href={adminHref(`/support/tickets/${detail.id}/`)}
                  className="ml-auto inline-flex h-8 items-center rounded-lg px-2 text-[11px] font-bold text-ink/50 hover:text-primary"
                >
                  Fiche complète →
                </Link>
              </div>

              {/* Org context */}
              <div className="rounded-xl bg-[#FFEFF8] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">
                      {detail.organizationName ?? "Institut"}
                    </p>
                    <p className="text-[11px] text-ink/50">
                      {detail.createdByName}
                      {detail.createdByEmail ? ` · ${detail.createdByEmail}` : ""}
                    </p>
                  </div>
                  {detail.planCode ? (
                    <span className="shrink-0 rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[10px] font-bold text-[#5D4200]">
                      {detail.planCode}
                    </span>
                  ) : null}
                </div>
                <Link
                  href={adminHref(`/organizations/${detail.organizationId}/`)}
                  className="mt-2 inline-flex text-[11px] font-bold text-primary hover:underline"
                >
                  Voir l&apos;institut →
                </Link>
              </div>

              {/* Messages */}
              <div className="flex max-h-[340px] flex-col gap-3 overflow-y-auto py-1">
                {messages.length === 0 ? (
                  <p className="text-center text-[12px] text-ink/40">
                    Aucun message.
                  </p>
                ) : null}
                {messages.map((m) =>
                  m.isInternal ? (
                    <div
                      key={m.id}
                      className="rounded-xl bg-[#F0DDE9] p-3 text-ink shadow-sm"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#7B5900]">
                          <Lock className="h-3 w-3" />
                          Note interne
                        </span>
                        <span className="text-[10px] text-ink/45">
                          {fmtTime(m.createdAt)}
                        </span>
                      </div>
                      <p className="text-[13px] whitespace-pre-wrap">{m.message}</p>
                      <p className="mt-1 text-[10px] text-ink/45">
                        {m.senderName ?? "Support"}
                      </p>
                    </div>
                  ) : m.senderType === "PLATFORM" ? (
                    <div key={m.id} className="flex justify-end gap-2">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-[#FFD9DE] p-3 text-[#400014] shadow-sm">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold">
                            {m.senderName ?? "Support"}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {fmtTime(m.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13px] whitespace-pre-wrap">{m.message}</p>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                        SA
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFEFF8] text-[11px] font-bold text-primary">
                        {initials(m.senderName)}
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-[#FFEFF8] p-3 shadow-sm">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-ink">
                            {m.senderName ?? "Institut"}
                          </span>
                          <span className="text-[10px] text-ink/45">
                            {fmtTime(m.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13px] whitespace-pre-wrap text-ink">
                          {m.message}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>

              {/* Composer */}
              <div className="flex flex-col gap-2 border-t border-[#FFEFF8] pt-2">
                <div className="flex items-center gap-1 rounded-lg bg-[#FFEFF8] p-1">
                  <button
                    type="button"
                    onClick={() => setReplyMode("reply")}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-[11px] font-bold",
                      replyMode === "reply"
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink/50",
                    )}
                  >
                    Répondre à l&apos;institut
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyMode("internal")}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-[11px] font-bold",
                      replyMode === "internal"
                        ? "bg-white text-[#7B5900] shadow-sm"
                        : "text-ink/50",
                    )}
                  >
                    Note interne
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {macros.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setReplyText(m.text)}
                      className="rounded-full bg-[#FFEFF8] px-2.5 py-0.5 text-[10px] font-semibold text-ink hover:bg-[#F0DDE9]"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder={
                    replyMode === "internal"
                      ? "Note interne confidentielle…"
                      : `Répondre à ${detail.createdByName ?? "l'institut"}…`
                  }
                  className="w-full resize-none rounded-xl bg-[#FFEFF8] p-3 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void sendReply();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-ink/40">Ctrl + Enter</span>
                  <button
                    type="button"
                    disabled={sending || !replyText.trim()}
                    onClick={() => void sendReply()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                  >
                    Envoyer
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      {/* Bottom analytics */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-lg font-bold text-ink">Volume par catégorie</h4>
            <span className="text-[11px] text-ink/45">Ce mois</span>
          </div>
          <div className="space-y-2.5">
            {catBars.length === 0 ? (
              <p className="text-sm text-ink/40">Pas encore de données.</p>
            ) : (
              catBars.map((c) => (
                <div key={c.category}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="font-semibold text-ink">{c.label}</span>
                    <span className="font-bold text-primary">
                      {c.count} ({c.pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#FFEFF8]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, c.pct)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-lg font-bold text-ink">Flux 30 jours</h4>
            <span className="text-[11px] font-bold text-primary">
              {kpis?.resolved ?? 0} résolus / {kpis?.total ?? 0}
            </span>
          </div>
          <div className="h-28">
            {analytics?.byDay?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.byDay}>
                  <XAxis dataKey="label" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#BA0049"
                    fill="#FFD9DE"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-ink/40">
                Pas de données.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-lg font-bold text-ink">Attention</h4>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span className="font-semibold text-ink">Urgents ouverts</span>
              <span className="font-bold text-red-600">{attn?.urgentOpen ?? 0}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span className="font-semibold text-ink">Haute priorité</span>
              <span className="font-bold text-[#7B5900]">{attn?.highOpen ?? 0}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span className="font-semibold text-ink">Attente client</span>
              <span className="font-bold text-ink">{attn?.waitingCustomer ?? 0}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-[#FFEFF8] p-2.5">
              <span className="font-semibold text-ink">Sans réponse &gt; 2h</span>
              <span className="font-bold text-ink">{attn?.staleNoReply ?? 0}</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h4 className="text-lg font-bold text-ink">Conformité &amp; SLA</h4>
          </div>
          <p className="text-[13px] text-ink/55">
            Notes internes invisibles pour l&apos;institut. Traçabilité des actions
            support dans l&apos;audit plateforme.
          </p>
          <div className="mt-3 space-y-2 text-[12px] text-ink">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Loi CNDP 09-08
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Isolation multi-tenant des tickets
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Historique d&apos;assistance horodaté
            </div>
          </div>
        </div>
      </section>

      {createOpen ? (
        <CreateTicketModal
          orgs={orgs}
          assignees={assignees}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            setSelectedId(id);
            void refresh();
          }}
        />
      ) : null}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Créer un ticket manuel</h2>
          <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase text-ink/45">
              Organisation
            </span>
            <select
              className="h-10 w-full rounded-lg bg-[#FFEFF8] px-3"
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
            <span className="mb-1 block text-[11px] font-bold uppercase text-ink/45">
              Utilisateur
            </span>
            <select
              className="h-10 w-full rounded-lg bg-[#FFEFF8] px-3"
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
            <span className="mb-1 block text-[11px] font-bold uppercase text-ink/45">
              Sujet
            </span>
            <input
              className="h-10 w-full rounded-lg bg-[#FFEFF8] px-3"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-ink/45">
                Catégorie
              </span>
              <select
                className="h-10 w-full rounded-lg bg-[#FFEFF8] px-3"
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
              <span className="mb-1 block text-[11px] font-bold uppercase text-ink/45">
                Priorité
              </span>
              <select
                className="h-10 w-full rounded-lg bg-[#FFEFF8] px-3"
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
            <span className="mb-1 block text-[11px] font-bold uppercase text-ink/45">
              Assigné à
            </span>
            <select
              className="h-10 w-full rounded-lg bg-[#FFEFF8] px-3"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Non assigné</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase text-ink/45">
              Description
            </span>
            <textarea
              className="min-h-[100px] w-full rounded-lg bg-[#FFEFF8] px-3 py-2"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
        </div>
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl bg-[#F0DDE9] px-4 py-2 text-sm font-bold text-ink"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
