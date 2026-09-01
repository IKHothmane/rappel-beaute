"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { NotificationPreviewList } from "@/components/notifications/notifications-page";
import {
  getUnreadCount,
  listNotifications,
  markNotificationRead,
} from "@/modules/notifications/service";
import type { NotificationItem } from "@/types/notifications";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preview, setPreview] = useState<NotificationItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [count, list] = await Promise.all([
        getUnreadCount(),
        listNotifications({ limit: 6, category: "all" }),
      ]);
      setUnreadCount(count);
      setPreview(list.data);
    } catch {
      /* silencieux dans le header */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function handleOpen(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationRead(item.id);
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    setMobileOpen(false);
    if (item.href) router.push(item.href);
    else router.push("/notifications/");
  }

  function openPanel() {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileOpen(true);
    } else {
      setOpen((v) => !v);
    }
    refresh();
  }

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          className="relative rounded-xl p-2.5 text-ink/50 transition hover:bg-[#FBF4F6] hover:text-ink"
          aria-label="Notifications"
          onClick={openPanel}
        >
          <Bell size={20} />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-50 mt-2 hidden w-80 overflow-hidden rounded-xl border border-line bg-white shadow-soft md:block">
            <NotificationPreviewList
              items={preview}
              unreadCount={unreadCount}
              onOpen={handleOpen}
              onViewAll={() => {
                setOpen(false);
                router.push("/notifications/");
              }}
            />
          </div>
        ) : null}
      </div>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Notifications"
        side="bottom"
        className="md:hidden"
      >
        <NotificationPreviewList
          items={preview}
          unreadCount={unreadCount}
          onOpen={handleOpen}
          onViewAll={() => {
            setMobileOpen(false);
            router.push("/notifications/");
          }}
        />
      </Drawer>
    </>
  );
}
