"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import {
  fetchSupportTicket,
  replySupportTicketAdmin,
  updateSupportTicketAdmin,
  type AdminSupportTicketItem,
} from "@/modules/admin/support-tickets";
import {
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_STATUS_LABEL,
  type SupportMessageItem,
} from "@/modules/support/service";
import type { SupportTicketStatus } from "@/lib/db/support-tickets";

const STATUSES: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export function SupportTicketAdminDetail() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<AdminSupportTicketItem | null>(null);
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetchSupportTicket(id);
      setTicket(res.ticket);
      setMessages(res.messages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setTicket(null);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replySupportTicketAdmin(id, reply.trim());
      setReply("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function onStatusChange(status: SupportTicketStatus) {
    setUpdating(true);
    try {
      await updateSupportTicketAdmin(id, { status });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;
  }

  if (!ticket) {
    return (
      <>
        <p className="text-sm text-red-600">{error ?? "Ticket introuvable."}</p>
        <Link href="/support/tickets/" className="ac-btn-ghost mt-4 inline-flex">
          Retour
        </Link>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={ticket.organizationName ?? "Institut"}
        description={ticket.subject}
        action={
          <Link href="/support/tickets/" className="ac-btn-ghost">
            ← Liste
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 rounded-xl border border-line bg-white p-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[var(--admin-muted)]">Institut</p>
          <p className="font-medium">{ticket.organizationName}</p>
        </div>
        <div>
          <p className="text-[var(--admin-muted)]">Plan</p>
          <p className="font-medium">{ticket.planCode ?? "—"}</p>
        </div>
        <div>
          <p className="text-[var(--admin-muted)]">OWNER / auteur</p>
          <p className="font-medium">{ticket.createdByName ?? "—"}</p>
        </div>
        <div>
          <p className="text-[var(--admin-muted)]">Catégorie</p>
          <p className="font-medium">{SUPPORT_CATEGORY_LABEL[ticket.category]}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1 text-[var(--admin-muted)]">Statut</p>
          <select
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            value={ticket.status}
            disabled={updating}
            onChange={(e) => onStatusChange(e.target.value as SupportTicketStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {SUPPORT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <div className="mb-4 space-y-3 rounded-xl border border-line bg-white p-5">
        {messages.map((m) => {
          const platform = m.senderType === "PLATFORM";
          return (
            <div
              key={m.id}
              className={`rounded-lg px-4 py-3 ${
                platform ? "bg-primary-light/50" : "bg-[#FBF4F6]"
              }`}
            >
              <div className="mb-1 flex justify-between gap-2">
                <p className="text-xs font-semibold">
                  {platform ? "Super Admin" : m.senderName || "Institut"}
                </p>
                <p className="font-mono text-[10px] text-[var(--admin-muted)]">
                  {new Date(m.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.message}</p>
            </div>
          );
        })}
      </div>

      {ticket.status !== "CLOSED" ? (
        <form
          onSubmit={onReply}
          className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4 sm:flex-row"
        >
          <textarea
            className="min-h-[80px] flex-1 rounded-lg border border-line px-3 py-2 text-sm"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Écrire une réponse…"
            required
          />
          <button type="submit" className="ac-btn self-end" disabled={sending}>
            {sending ? "…" : "Envoyer"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-[var(--admin-muted)]">Ticket clôturé.</p>
      )}
    </>
  );
}
