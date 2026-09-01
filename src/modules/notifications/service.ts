import type { NotificationFilterCategory } from "@/lib/notifications/permissions";
import type { NotificationItem, NotificationListResponse } from "@/types/notifications";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export async function listNotifications(params?: {
  page?: number;
  limit?: number;
  category?: NotificationFilterCategory;
}): Promise<NotificationListResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.category) q.set("category", params.category);
  const res = await fetch(`/api/notifications/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications/unread-count/", fetchOpts);
  const data = await parseJson<{ count: number }>(res);
  return data.count;
}

export async function markNotificationRead(id: string): Promise<NotificationItem | null> {
  const res = await fetch(`/api/notifications/${id}/read/`, {
    ...fetchOpts,
    method: "POST",
  });
  const data = await parseJson<{ notification: NotificationItem | null }>(res);
  return data.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await fetch("/api/notifications/read-all/", {
    ...fetchOpts,
    method: "POST",
  });
  const data = await parseJson<{ count: number }>(res);
  return data.count;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export { notificationIcon } from "@/lib/notifications/permissions";
