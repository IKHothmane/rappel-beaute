import type { Metadata } from "next";
import { AdminProspectsView } from "@/components/admin/prospects/prospects-view";

export const metadata: Metadata = { title: "Prospects" };

export default function AdminProspectsPage() {
  return <AdminProspectsView />;
}
