"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { NotificationsDesktop } from "@/components/notifications/notifications-desktop";
import {
  CATEGORY_CHIPS,
  STATUS_FILTERS,
  DEFAULT_CHANNEL_RULES,
  buildCopilotInsights,
  buildCounters,
  filterByStatus,
  groupByDay,
  loadChannelRules,
  saveChannelRules,
  searchNotifications,
  countByCategory,
  type ChannelKey,
  type ChannelRule,
  type NotificationsViewModel,
  type StatusFilter,
} from "@/components/notifications/notifications-helpers";
import { NotificationsMobile } from "@/components/notifications/notifications-mobile";
import { useToast } from "@/components/ui/toast";
import type { NotificationFilterCategory } from "@/lib/notifications/permissions";
import {
  formatRelativeTime,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationIcon,
} from "@/modules/notifications/service";
import type { NotificationItem } from "@/types/notifications";
import { cn } from "@/lib/utils";

function apiCategory(
  status: StatusFilter,
  category: NotificationFilterCategory | null,
): NotificationFilterCategory {
  if (category) return category;
  if (status === "unread") return "unread";
  if (status === "urgent") return "urgent";
  return "all";
}

export function NotificationsPageView() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useCurrentUser();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<NotificationFilterCategory | null>(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channelRules, setChannelRules] = useState<ChannelRule[]>(DEFAULT_CHANNEL_RULES);
  const [allForCounts, setAllForCounts] = useState<NotificationItem[]>([]);

  useEffect(() => {
    setChannelRules(loadChannelRules());
  }, []);

  const load = useCallback(async () => {
    try {
      const cat = apiCategory(status, category);
      const res = await listNotifications({ category: cat, limit: 100 });
      setItems(res.data);
      setUnreadCount(res.unreadCount);
      if (cat === "all") {
        setAllForCounts(res.data);
      } else {
        const all = await listNotifications({ category: "all", limit: 100 });
        setAllForCounts(all.data);
      }
    } catch {
      toast("Impossible de charger les notifications.", "error");
    }
  }, [status, category, toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const basePool = useMemo(() => {
    // When filtering by API category, items are already scoped; for today/week apply client filter
    if (!category && (status === "today" || status === "week")) {
      return filterByStatus(items, status);
    }
    if (!category && status === "all") return items;
    if (!category && (status === "unread" || status === "urgent")) return items;
    return items;
  }, [items, status, category]);

  const filtered = useMemo(() => searchNotifications(basePool, search), [basePool, search]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const counters = useMemo(
    () => buildCounters(allForCounts.length ? allForCounts : items, unreadCount),
    [allForCounts, items, unreadCount],
  );
  const insights = useMemo(
    () => buildCopilotInsights(allForCounts.length ? allForCounts : items),
    [allForCounts, items],
  );
  const urgentItems = useMemo(
    () =>
      (allForCounts.length ? allForCounts : items)
        .filter((n) => n.severity === "CRITICAL" && !n.readAt)
        .slice(0, 8),
    [allForCounts, items],
  );

  const categoryCounts = useMemo(() => {
    const pool = allForCounts.length ? allForCounts : items;
    const map: Record<string, number> = {};
    for (const chip of CATEGORY_CHIPS) {
      map[chip.value] = countByCategory(pool, chip.value);
    }
    return map;
  }, [allForCounts, items]);

  const statusCounts = useMemo(() => {
    const pool = allForCounts.length ? allForCounts : items;
    const map = {} as Record<StatusFilter, number>;
    for (const f of STATUS_FILTERS) {
      map[f.value] = filterByStatus(pool, f.value).length;
    }
    return map;
  }, [allForCounts, items]);

  async function openItem(item: NotificationItem) {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        const stamp = new Date().toISOString();
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: stamp } : n)));
        setAllForCounts((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: stamp } : n)),
        );
      } catch {
        toast("Impossible de marquer comme lue.", "error");
      }
    }
    if (item.href) router.push(item.href);
  }

  async function markReadOnly(item: NotificationItem) {
    if (item.readAt) return;
    try {
      await markNotificationRead(item.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      const stamp = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: stamp } : n)));
      setAllForCounts((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, readAt: stamp } : n)),
      );
    } catch {
      toast("Impossible de marquer comme lue.", "error");
    }
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
      await load();
      toast("Toutes les notifications sont marquées comme lues.", "success");
    } catch {
      toast("Erreur.", "error");
    }
  }

  function toggleChannel(ruleId: string, key: ChannelKey) {
    setChannelRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, channels: { ...r.channels, [key]: !r.channels[key] } }
          : r,
      ),
    );
  }

  function persistChannels(rules: ChannelRule[]) {
    saveChannelRules(rules);
    toast("Préférences enregistrées sur cet appareil.", "success");
  }

  const vm: NotificationsViewModel = {
    orgName: user.orgName || "Institut",
    userName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    roleLabel: ROLE_LABEL[user.role] ?? user.role,
    loading,
    items,
    filtered,
    groups,
    urgentItems,
    counters,
    insights,
    status,
    category,
    search,
    channelRules,
    categoryCounts,
    statusCounts,
    onStatus: setStatus,
    onCategory: (c) => {
      setCategory(c);
      if (c) setStatus("all");
    },
    onSearch: setSearch,
    onOpen: openItem,
    onMarkRead: markReadOnly,
    onReadAll: readAll,
    onRefresh: () => {
      setLoading(true);
      load().finally(() => setLoading(false));
    },
    onSaveChannels: persistChannels,
    onToggleChannel: toggleChannel,
  };

  return (
    <>
      <NotificationsMobile vm={vm} />
      <NotificationsDesktop vm={vm} />
    </>
  );
}

function severityClass(severity: NotificationItem["severity"]): string {
  if (severity === "CRITICAL") return "text-primary";
  if (severity === "WARNING") return "text-secondary";
  if (severity === "SUCCESS") return "text-secondary";
  return "text-on-surface-variant";
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "flex w-full items-start gap-3 px-5 py-4 text-left text-sm transition hover:bg-surface-container-low",
        item.readAt ? "opacity-70" : "bg-primary/[0.03]",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", severityClass(item.severity))}>
        {notificationIcon(item.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-on-surface">{item.title}</span>
        <span className="mt-0.5 block text-on-surface-variant">{item.message}</span>
        <span className="mt-1 block text-xs text-on-surface-variant/70">
          {formatRelativeTime(item.createdAt)}
        </span>
      </span>
      {!item.readAt ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
    </button>
  );
}

export function NotificationPreviewList({
  items,
  unreadCount,
  onOpen,
  onViewAll,
}: {
  items: NotificationItem[];
  unreadCount: number;
  onOpen: (item: NotificationItem) => void;
  onViewAll: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-outline-variant/40 px-4 py-3">
        <span className="text-sm font-semibold text-on-surface">
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </span>
        <button type="button" className="text-xs font-semibold text-primary" onClick={onViewAll}>
          Voir +
        </button>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-on-surface-variant">Aucune notification.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-outline-variant/30 overflow-y-auto">
          {items.slice(0, 6).map((item) => (
            <li key={item.id}>
              <NotificationRow item={item} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-outline-variant/40 p-3">
        <Link
          href="/notifications/"
          className="block w-full rounded-lg bg-surface-container py-2 text-center text-xs font-bold text-on-surface"
        >
          Centre de notifications
        </Link>
      </div>
    </div>
  );
}
