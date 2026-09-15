"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { SupportDesktop } from "@/components/support/support-desktop";
import {
  CREATE_CATEGORIES,
  SUPPORT_CATEGORY_LABEL,
  avgFirstResponseMinutes,
  buildSupportCounters,
  filterTickets,
  sortTickets,
  type CreateModalMode,
  type SortKey,
  type SupportViewModel,
  type TicketFilter,
} from "@/components/support/support-helpers";
import { SupportMobile } from "@/components/support/support-mobile";
import { useToast } from "@/components/ui/toast";
import type { SupportTicketCategory } from "@/lib/db/support-tickets";
import { canWriteFeatureLimited } from "@/lib/rbac";
import {
  createSupportTicket,
  getSupportTicket,
  listSupportTickets,
  replySupportTicket,
  type SupportMessageItem,
  type SupportTicketListItem,
} from "@/modules/support/service";
import { Send } from "lucide-react";

export function SupportPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "support");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SupportTicketListItem[]>([]);
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CreateModalMode>("ticket");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listSupportTickets();
      setItems(res.items);
    } catch {
      toast("Impossible de charger les demandes.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const filtered = useMemo(
    () => sortTickets(filterTickets(items, filter, search), sort),
    [items, filter, search, sort],
  );

  const counters = useMemo(() => buildSupportCounters(items), [items]);
  const avgResponseMin = useMemo(() => avgFirstResponseMinutes(items), [items]);
  const selected = useMemo(
    () => items.find((t) => t.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    getSupportTicket(selectedId)
      .then((res) => {
        if (cancelled) return;
        setMessages(res.messages);
        setItems((prev) =>
          prev.map((t) => (t.id === res.ticket.id ? { ...t, ...res.ticket } : t)),
        );
      })
      .catch(() => {
        if (!cancelled) toast("Impossible de charger la conversation.", "error");
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, toast]);

  async function onSendReply() {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await replySupportTicket(selectedId, reply.trim());
      setReply("");
      toast("Message envoyé.", "success");
      const res = await getSupportTicket(selectedId);
      setMessages(res.messages);
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Envoi impossible.", "error");
    } finally {
      setSending(false);
    }
  }

  async function onCreate(input: {
    subject: string;
    category: SupportTicketCategory;
    message: string;
    priority: string;
  }) {
    setCreating(true);
    try {
      const res = await createSupportTicket(input);
      toast("Ticket créé.", "success");
      setModalOpen(false);
      await refresh();
      setSelectedId(res.ticket.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Création impossible.", "error");
    } finally {
      setCreating(false);
    }
  }

  const vm: SupportViewModel = {
    orgName: user.orgName || "Institut",
    roleLabel: ROLE_LABEL[user.role] ?? user.role,
    userName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    canWrite,
    loading,
    items,
    filtered,
    counters,
    avgResponseMin,
    filter,
    sort,
    search,
    selectedId,
    selected,
    messages,
    messagesLoading,
    reply,
    sending,
    modalOpen,
    modalMode,
    creating,
    onFilter: setFilter,
    onSort: setSort,
    onSearch: setSearch,
    onSelect: setSelectedId,
    onReplyChange: setReply,
    onSendReply,
    onOpenModal: (mode) => {
      setModalMode(mode);
      setModalOpen(true);
    },
    onCloseModal: () => setModalOpen(false),
    onCreate,
    onRefresh: () => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    },
  };

  return (
    <>
      <SupportMobile vm={vm} />
      <SupportDesktop vm={vm} />
      {modalOpen ? (
        <CreateTicketModal
          orgName={vm.orgName}
          mode={modalMode}
          creating={creating}
          onClose={() => setModalOpen(false)}
          onCreate={onCreate}
        />
      ) : null}
    </>
  );
}

function CreateTicketModal({
  orgName,
  mode,
  creating,
  onClose,
  onCreate,
}: {
  orgName: string;
  mode: CreateModalMode;
  creating: boolean;
  onClose: () => void;
  onCreate: (input: {
    subject: string;
    category: SupportTicketCategory;
    message: string;
    priority: string;
  }) => Promise<void>;
}) {
  const [subject, setSubject] = useState(
    mode === "bug"
      ? "Anomalie technique / Bug"
      : mode === "feature"
        ? "Proposition d'évolution métier"
        : "",
  );
  const [category, setCategory] = useState<SupportTicketCategory>(
    mode === "bug" ? "BUG" : mode === "feature" ? "FEATURE_REQUEST" : "TECHNICAL",
  );
  const [priority, setPriority] = useState(
    mode === "bug" ? "HIGH" : mode === "feature" ? "LOW" : "NORMAL",
  );
  const [message, setMessage] = useState("");

  const title =
    mode === "bug"
      ? "Signaler une Anomalie Technique / Bug"
      : mode === "feature"
        ? "Proposer une Évolution Métier"
        : "Ouvrir un Nouveau Ticket d'Assistance";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between bg-surface-container px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">{title}</h3>
            <p className="text-[13px] text-on-surface-variant">{orgName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-surface-container-lowest px-3 py-1 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high"
          >
            Fermer
          </button>
        </div>
        <form
          className="flex flex-1 flex-col space-y-4 overflow-y-auto p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            await onCreate({ subject, category, message, priority });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase text-on-surface">Sujet *</span>
            <input
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-11 rounded-lg bg-surface-container-low px-3 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-on-surface">Catégorie *</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                className="h-11 cursor-pointer rounded-lg bg-surface-container-low px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CREATE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SUPPORT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-on-surface">Priorité *</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-11 cursor-pointer rounded-lg bg-surface-container-low px-3 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
                <option value="LOW">Faible</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase text-on-surface">Description *</span>
            <textarea
              required
              maxLength={5000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez la situation, les étapes et l'impact…"
              className="rounded-lg bg-surface-container-low p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <div className="flex items-center justify-end gap-2 border-t border-surface-container pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-primary-container px-6 py-2.5 text-sm font-bold text-on-primary-container shadow-sm hover:bg-primary disabled:opacity-50"
            >
              <Send className="h-[18px] w-[18px]" />
              {creating ? "Envoi…" : "Créer le ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
