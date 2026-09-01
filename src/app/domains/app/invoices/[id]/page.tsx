"use client";

import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";

type Props = { params: { id: string } };

export default function InvoiceDetailPage({ params }: Props) {
  return <InvoiceDetailView invoiceId={params.id} />;
}
