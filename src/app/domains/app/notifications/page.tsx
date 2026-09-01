import type { Metadata } from "next";
import { NotificationsPageView } from "@/components/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationsPageView />;
}
