import type { Metadata } from "next";
import { SupportTicketDetailView } from "@/components/support/support-ticket-detail";

export const metadata: Metadata = { title: "Demande support" };

type Props = { params: Promise<{ id: string }> };

export default async function SupportTicketPage({ params }: Props) {
  const { id } = await params;
  return <SupportTicketDetailView ticketId={id} />;
}
