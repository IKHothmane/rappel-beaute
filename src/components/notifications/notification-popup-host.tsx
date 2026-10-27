"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  iconTone,
  severityBadge,
  typeIcon,
} from "@/components/notifications/notifications-helpers";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markNotificationRead,
} from "@/modules/notifications/service";
import type { NotificationItem } from "@/types/notifications";

const POLL_MS = 20_000;
const AUTO_DISMISS_MS = 7_000;
const MAX_VISIBLE = 3;

type PopupItem = NotificationItem & { shownAt: number };

export function NotificationPopupHost() {
  const router = useRouter();
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setPopups((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const enqueue = useCallback(
    (items: NotificationItem[]) => {
      if (items.length === 0) return;
      setPopups((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const next = [...prev];
        for (const item of items) {
          if (existing.has(item.id)) continue;
          next.unshift({ ...item, shownAt: Date.now() });
        }
        return next.slice(0, MAX_VISIBLE);
      });
      for (const item of items) {
        if (timersRef.current.has(item.id)) continue;
        const timer = window.setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
        timersRef.current.set(item.id, timer);
      }
    },
    [dismiss],
  );

  const poll = useCallback(async () => {
    try {
      const res = await listNotifications({ limit: 12, category: "all" });
      const unread = res.data.filter((item) => !item.readAt);
      const known = knownIdsRef.current;

      if (!known) {
        knownIdsRef.current = new Set(unread.map((item) => item.id));
        return;
      }

      const fresh = unread.filter((item) => !known.has(item.id));
      for (const item of unread) known.add(item.id);
      if (fresh.length > 0) enqueue(fresh);
    } catch {
      /* silencieux */
    }
  }, [enqueue]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      for (const timer of timersRef.current.values()) window.clearTimeout(timer);
      timersRef.current.clear();
    };
  }, [poll]);

  async function handleOpen(item: NotificationItem) {
    dismiss(item.id);
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
      } catch {
        /* ignore */
      }
    }
    router.push(item.href || "/notifications/");
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3 sm:top-4"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {popups.map((item) => {
          const Icon = typeIcon(item.type);
          const badge = severityBadge(item.severity);
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(40,20,30,0.18)]"
            >
              <button
                type="button"
                onClick={() => void handleOpen(item)}
                className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-[#FFEFF8]/50"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    iconTone(item.severity),
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[14px] font-bold text-ink">{item.title}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[12px] text-ink/60">{item.message}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => dismiss(item.id)}
                className="absolute right-2 top-2 rounded-lg p-1 text-ink/35 transition hover:bg-[#F3F4F6] hover:text-ink"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
