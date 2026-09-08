import type { Metadata } from "next";
import { SupportTicketAdminDetail } from "@/components/admin/SupportTicketAdminDetail";

export const metadata: Metadata = { title: "Ticket support" };

export default function AdminSupportTicketPage() {
  return <SupportTicketAdminDetail />;
}
