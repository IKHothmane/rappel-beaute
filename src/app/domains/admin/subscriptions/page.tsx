import type { Metadata } from "next";
import { AdminSubscriptionsView } from "@/components/admin/admin-subscriptions";

export const metadata: Metadata = { title: "Abonnements" };

export default function AdminSubscriptionsPage() {
  return <AdminSubscriptionsView />;
}
