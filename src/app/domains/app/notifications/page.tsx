import type { Metadata } from "next";
import { NotificationsPageView } from "@/components/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications & Alertes Métier" };

export default function NotificationsPage() {
  return <NotificationsPageView />;
}
