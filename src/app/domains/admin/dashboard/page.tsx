import type { Metadata } from "next";
import { AdminDashboardView } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
