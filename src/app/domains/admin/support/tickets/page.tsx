import type { Metadata } from "next";
import { SupportTicketsPageView } from "@/components/admin/SupportTicketsPage";

export const metadata: Metadata = { title: "Support SaaS" };

export default function AdminSupportTicketsPage() {
  return <SupportTicketsPageView />;
}
