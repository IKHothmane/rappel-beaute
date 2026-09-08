"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { canWriteFeatureLimited } from "@/lib/rbac";
import { useToast } from "@/components/ui/toast";
import {
  getSupportTicket,
  replySupportTicket,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_STATUS_LABEL,
  type SupportMessageItem,
  type SupportTicketListItem,
} from "@/modules/support/service";

type Props = { ticketId: string };

export function SupportTicketDetailView({ ticketId }: Props) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "support");
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<(SupportTicketListItem & { createdByName?: string }) | null>(
    null,
  );
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await getSupportTicket(ticketId);
      setTicket(res.ticket);
      setMessages(res.messages);
    } catch {
      toast("Ticket introuvable.", "error");
      setTicket(null);
    }
  }, [ticketId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replySupportTicket(ticketId, reply.trim());
      setReply("");
      toast("Message envoyé.", "success");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Envoi impossible.", "error");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/45">Chargement…</p>;
  }

  if (!ticket) {
    return (
      <div>
        <p className="text-sm text-ink/55">Demande introuvable.</p>
        <Link href="/support/" className="btn-ghost mt-4 inline-flex">
          Retour
        </Link>
      </div>
    );
  }

  const closed = ticket.status === "CLOSED";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title={ticket.subject}
        description={`${SUPPORT_CATEGORY_LABEL[ticket.category]} · ${SUPPORT_STATUS_LABEL[ticket.status]}`}
        action={
          <Link href="/support/" className="btn-ghost">
            Toutes les demandes
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
          {messages.map((m) => {
            const mine = m.senderType === "INSTITUT";
            return (
              <div
                key={m.id}
                className={`rounded-xl px-4 py-3 ${
                  mine ? "bg-[#FBF4F6]" : "bg-primary-light/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink/70">
                    {mine ? m.senderName || "Institut" : "Support Rappel Beauty"}
                  </p>
                  <p className="font-mono text-[10px] text-ink/35">
                    {new Date(m.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink/85">{m.message}</p>
              </div>
            );
          })}
        </div>

        {canWrite && !closed ? (
          <form onSubmit={onReply} className="flex gap-2 rounded-2xl border border-line bg-white p-4">
            <textarea
              className="input min-h-[72px] flex-1"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Écrire une réponse…"
              maxLength={5000}
              required
            />
            <button type="submit" className="btn-primary self-end" disabled={sending}>
              {sending ? "…" : "Envoyer"}
            </button>
          </form>
        ) : closed ? (
          <p className="text-center text-sm text-ink/45">Cette demande est clôturée.</p>
        ) : null}
      </div>
    </motion.div>
  );
}
