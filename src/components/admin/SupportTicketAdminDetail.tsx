"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import {
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
  type AdminSupportMessageItem,
  type AdminSupportTicketItem,
} from "@/modules/admin/support-tickets";

export function SupportTicketAdminDetail() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<AdminSupportTicketItem | null>(null);
  const [messages, setMessages] = useState<AdminSupportMessageItem[]>([]);
  const [history, setHistory] = useState<
    {
      id: string;
      platformUserName: string | null;
      action: string;
      before: unknown;
      after: unknown;
      createdAt: string;
    }[]
  >([]);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [res, list] = await Promise.all([
        fetchSupportTicket(id),
        fetchSupportTickets(),
      ]);
      setTicket(res.ticket);
      setMessages(res.messages);
      setHistory(res.history ?? []);
      setAssignees(list.assignees);
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

  async function patch(body: Parameters<typeof updateSupportTicketAdmin>[1]) {
    setUpdating(true);
    try {
      await updateSupportTicketAdmin(id, body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setUpdating(false);
    }
  }

  async function onReply(e: React.FormEvent, opts?: { resolve?: boolean }) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replySupportTicketAdmin(id, {
        message: reply.trim(),
        setStatus: opts?.resolve ? "RESOLVED" : "WAITING_CUSTOMER",
      });
      setReply("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function onInternalNote(e: React.FormEvent) {
    e.preventDefault();
    if (!internalNote.trim()) return;
    setSending(true);
    try {
      await replySupportTicketAdmin(id, {
        message: internalNote.trim(),
        isInternal: true,
      });
      setInternalNote("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Note impossible");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;
  }

  if (!ticket) {
    return (
      <>
        <p className="text-sm text-red-600">{error ?? "Ticket introuvable."}</p>
        <Link href={adminHref("/support/tickets/")} className="ac-btn-ghost mt-4 inline-flex">
          Retour
        </Link>
      </>
    );
  }

  const publicMessages = messages.filter((m) => !m.isInternal);
  const notes = messages.filter((m) => m.isInternal);

  return (
    <>
      <AdminPageHeader
        title={ticket.ref}
        description={ticket.subject}
        action={
          <Link href={adminHref("/support/tickets/")} className="ac-btn-ghost">
            ← Support
          </Link>
        }
      />

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
          {SUPPORT_PRIORITY_LABEL[ticket.priority]}
        </span>
        <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
          {SUPPORT_STATUS_LABEL[ticket.status]}
        </span>
        <span className="rounded-md bg-[#FBF4F6] px-2 py-1 text-ink/70">
          {SUPPORT_CATEGORY_LABEL[ticket.category]}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white p-5 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[var(--admin-muted)]">Institut</p>
                <Link
                  href={adminHref(`/organizations/${ticket.organizationId}/`)}
                  className="font-medium text-[var(--admin-accent)] hover:underline"
                >
                  {ticket.organizationName}
                </Link>
                <p className="text-xs text-[var(--admin-muted)]">Plan {ticket.planCode ?? "—"}</p>
              </div>
              <div>
                <p className="text-[var(--admin-muted)]">Contact</p>
                <p className="font-medium">{ticket.createdByName ?? "—"}</p>
                <p className="text-xs text-[var(--admin-muted)]">{ticket.createdByEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-[var(--admin-muted)]">Créé</p>
                <p className="font-medium">
                  {new Date(ticket.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-[var(--admin-muted)]">Assigné</p>
                <p className="font-medium">{ticket.assignedToName ?? "Non assigné"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={adminHref(`/organizations/${ticket.organizationId}/`)}
                className="ac-btn-ghost text-xs"
              >
                Organisation
              </Link>
              <Link href={adminHref("/subscriptions/")} className="ac-btn-ghost text-xs">
                Abonnements
              </Link>
              <Link
                href={adminHref(`/users/?q=${encodeURIComponent(ticket.createdByEmail ?? "")}`)}
                className="ac-btn-ghost text-xs"
              >
                Utilisateur
              </Link>
              <button
                type="button"
                className="ac-btn-ghost text-xs"
                onClick={() => setShowHistory((v) => !v)}
              >
                {showHistory ? "Masquer historique" : "Voir historique"}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-white p-5">
            <h3 className="text-sm font-semibold">Conversation</h3>
            {publicMessages.map((m) => {
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
                      {platform ? m.senderName || "Support" : m.senderName || "Institut"}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--admin-muted)]">
                      {new Date(m.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                </div>
              );
            })}
            {publicMessages.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">Aucun message.</p>
            ) : null}
          </div>

          {ticket.status !== "CLOSED" ? (
            <form
              onSubmit={(e) => onReply(e)}
              className="rounded-xl border border-line bg-white p-4"
            >
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-line px-3 py-2 text-sm"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Écrire une réponse…"
                required
              />
              <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                Pièces jointes : bientôt (images, PDF — taille limitée).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="submit" className="ac-btn" disabled={sending}>
                  {sending ? "…" : "Répondre"}
                </button>
                <button
                  type="button"
                  className="ac-btn-ghost"
                  disabled={sending || !reply.trim()}
                  onClick={(e) => onReply(e as unknown as React.FormEvent, { resolve: true })}
                >
                  Répondre & résoudre
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-[var(--admin-muted)]">Ticket fermé.</p>
          )}

          <section className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
            <h3 className="text-sm font-semibold text-amber-950">Notes internes</h3>
            <p className="mt-1 text-xs text-amber-900/70">
              Jamais visibles par l&apos;institut.
            </p>
            <ul className="mt-3 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-white/80 px-3 py-2 text-sm">
                  <div className="mb-1 flex justify-between text-[10px] text-[var(--admin-muted)]">
                    <span>{n.senderName || "Support"}</span>
                    <span>{new Date(n.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{n.message}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={onInternalNote} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <textarea
                className="min-h-[60px] flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Ajouter une note interne…"
              />
              <button type="submit" className="ac-btn-ghost self-end" disabled={sending}>
                Ajouter
              </button>
            </form>
          </section>

          {showHistory ? (
            <section className="rounded-xl border border-line bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold">Historique</h3>
              {history.length === 0 ? (
                <p className="text-sm text-[var(--admin-muted)]">Aucune entrée d&apos;audit.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((h) => (
                    <li key={h.id} className="border-b border-line/60 pb-2">
                      <p className="font-medium">
                        {h.action} · {h.platformUserName ?? "Système"}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--admin-muted)]">
                        {new Date(h.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-line bg-white p-4 text-sm">
            <label className="mb-3 block">
              <span className="mb-1 block text-[var(--admin-muted)]">Statut</span>
              <select
                className="w-full rounded-lg border border-line px-3 py-2"
                value={ticket.status}
                disabled={updating}
                onChange={(e) => void patch({ status: e.target.value })}
              >
                {SUPPORT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SUPPORT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-[var(--admin-muted)]">Priorité</span>
              <select
                className="w-full rounded-lg border border-line px-3 py-2"
                value={ticket.priority}
                disabled={updating}
                onChange={(e) => void patch({ priority: e.target.value })}
              >
                {SUPPORT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {SUPPORT_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-[var(--admin-muted)]">Catégorie</span>
              <select
                className="w-full rounded-lg border border-line px-3 py-2"
                value={ticket.category}
                disabled={updating}
                onChange={(e) => void patch({ category: e.target.value })}
              >
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SUPPORT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[var(--admin-muted)]">Assigné à</span>
              <select
                className="w-full rounded-lg border border-line px-3 py-2"
                value={ticket.assignedToPlatformUserId ?? ""}
                disabled={updating}
                onChange={(e) =>
                  void patch({
                    assignedToPlatformUserId: e.target.value || null,
                  })
                }
              >
                <option value="">Non assigné</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {ticket.satisfactionRating != null ? (
            <div className="rounded-xl border border-line bg-white p-4 text-sm">
              <p className="text-[var(--admin-muted)]">Satisfaction</p>
              <p className="mt-1 text-lg font-semibold">★ {ticket.satisfactionRating} / 5</p>
              {ticket.satisfactionComment ? (
                <p className="mt-2 text-[var(--admin-muted)]">{ticket.satisfactionComment}</p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
