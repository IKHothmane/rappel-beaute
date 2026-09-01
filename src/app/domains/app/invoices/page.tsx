import type { Metadata } from "next";
import { InvoicesPageView } from "@/components/invoices/invoices-page";

export const metadata: Metadata = { title: "Factures" };

export default function InvoicesPage() {
  return <InvoicesPageView />;
}
