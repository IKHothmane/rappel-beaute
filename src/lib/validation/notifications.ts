import type { NotificationFilterCategory } from "@/lib/notifications/permissions";

const CATEGORIES = new Set<NotificationFilterCategory>([
  "all",
  "unread",
  "agenda",
  "finance",
  "stock",
]);

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function positiveInt(v: unknown, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseNotificationListParams(sp: URLSearchParams): {
  page: number;
  limit: number;
  category: NotificationFilterCategory;
} {
  sp.delete("organizationId");
  const categoryRaw = str(sp.get("category")) ?? str(sp.get("filter")) ?? "all";
  const category = CATEGORIES.has(categoryRaw as NotificationFilterCategory)
    ? (categoryRaw as NotificationFilterCategory)
    : "all";
  return {
    page: positiveInt(sp.get("page"), 1),
    limit: Math.min(100, positiveInt(sp.get("limit"), 20)),
    category,
  };
}
