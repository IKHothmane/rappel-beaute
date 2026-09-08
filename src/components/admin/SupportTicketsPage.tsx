"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import {
  fetchSupportTickets,
  type AdminSupportTicketItem,
} from "@/modules/admin/support-tickets";
import {
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_STATUS_LABEL,
} from "@/modules/support/service";

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return `Il y a ${Math.floor(hours / 24)} j`;
}

function statusBadge(status: string) {
  const label =
    SUPPORT_STATUS_LABEL[status as keyof typeof SUPPORT_STATUS_LABEL] ?? status;
  return (
    <span className="rounded-md bg-[#FBF4F6] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-accent)]">
      {label}
    </span>
  );
}

export function SupportTicketsPageView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [kpis, setKpis] = useState({
    open: 0,
    inProgress: 0,
    waitingCustomer: 0,
    resolved: 0,
  });
  const [items, setItems] = useState<AdminSupportTicketItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchSupportTickets(
        status ? { status } : undefined,
      );
      setKpis(res.kpis);
      setItems(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <>
      <AdminPageHeader
        title="Support SaaS"
        description="Tickets de tous les instituts — conversationnel, audité, isolé du mode assistance."
        action={
          <Link href="/support/" className="ac-btn-ghost">
            Sessions assistance
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Nouveaux" value={loading ? "…" : String(kpis.open)} />
        <StatTile label="En cours" value={loading ? "…" : String(kpis.inProgress)} />
        <StatTile label="En attente" value={loading ? "…" : String(kpis.waitingCustomer)} />
        <StatTile label="Résolus" value={loading ? "…" : String(kpis.resolved)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { value: "", label: "Tous" },
          { value: "OPEN", label: "Nouveaux" },
          { value: "IN_PROGRESS", label: "En cours" },
          { value: "WAITING_CUSTOMER", label: "En attente" },
          { value: "RESOLVED", label: "Résolus" },
          { value: "CLOSED", label: "Clôturés" },
        ].map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              status === f.value
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-line bg-white text-ink/60 hover:bg-[#FBF4F6]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">Aucun ticket.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                href={`/support/tickets/${t.id}/`}
                className="ac-card block p-5 hover:bg-[#FBF4F6]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{t.organizationName ?? "Institut"}</p>
                  {statusBadge(t.status)}
                </div>
                <p className="mt-1 text-sm text-ink">{t.subject}</p>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  {SUPPORT_CATEGORY_LABEL[t.category]}
                  {t.lastMessagePreview ? ` · ${t.lastMessagePreview}` : ""}
                </p>
                <p className="mt-1 font-mono text-[10px] text-[var(--admin-muted)]">
                  {relativeTime(t.lastMessageAt ?? t.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
