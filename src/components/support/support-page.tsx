"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { SupportDesktop } from "@/components/support/support-desktop";
import { CreateTicketModal } from "@/components/support/create-ticket-modal";
import {
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
