"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Tabs } from "@/components/app/AppUi";
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

const FILTERS: { label: string; value: NotificationFilterCategory }[] = [
  { label: "Toutes", value: "all" },
  { label: "Non lues", value: "unread" },
  { label: "Agenda", value: "agenda" },
  { label: "Finance", value: "finance" },
  { label: "Stock", value: "stock" },
];

function severityClass(severity: NotificationItem["severity"]): string {
  if (severity === "CRITICAL") return "text-red-600";
  if (severity === "WARNING") return "text-amber-600";
  if (severity === "SUCCESS") return "text-emerald-600";
  return "text-ink/45";
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
      className={`flex w-full items-start gap-3 px-5 py-4 text-left text-sm transition hover:bg-[#FBF4F6] ${
        item.readAt ? "opacity-70" : "bg-primary/[0.03]"
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${severityClass(item.severity)}`}>
        {notificationIcon(item.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{item.title}</span>
        <span className="mt-0.5 block text-ink/60">{item.message}</span>
        <span className="mt-1 block text-xs text-ink/40">
          {formatRelativeTime(item.createdAt)}
        </span>
      </span>
      {!item.readAt ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
    </button>
  );
}

export function NotificationsPageView() {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<NotificationFilterCategory>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await listNotifications({ category: filter, limit: 50 });
      setItems(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      toast("Impossible de charger les notifications.", "error");
    }
  }, [filter, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function openItem(item: NotificationItem) {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
      } catch {
        toast("Impossible de marquer comme lue.", "error");
      }
    }
    if (item.href) router.push(item.href);
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch {
      toast("Erreur.", "error");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Notifications"
        description="Alertes métier en temps réel — scopées par utilisateur."
        action={
          unreadCount > 0 ? (
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={readAll}>
              Tout marquer lu
            </button>
          ) : undefined
        }
      />

      <Tabs
        tabs={FILTERS.map((f) => f.label)}
        value={FILTERS.find((f) => f.value === filter)?.label ?? "Toutes"}
        onChange={(label) => {
          const next = FILTERS.find((f) => f.label === label)?.value ?? "all";
          setFilter(next);
        }}
      />

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">
          Aucune notification pour ce filtre.
        </div>
      ) : (
        <ul className="surface divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationRow item={item} onOpen={openItem} />
            </li>
          ))}
        </ul>
      )}
    </motion.div>
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
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-semibold">
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </span>
        <button type="button" className="text-xs text-primary" onClick={onViewAll}>
          Voir +
        </button>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink/45">Aucune notification.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {items.slice(0, 6).map((item) => (
            <li key={item.id}>
              <NotificationRow item={item} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line p-3">
        <Link href="/notifications/" className="btn-ghost block w-full py-2 text-center text-xs">
          Centre de notifications
        </Link>
      </div>
    </div>
  );
}
