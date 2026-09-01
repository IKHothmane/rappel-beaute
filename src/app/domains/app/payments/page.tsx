import type { Metadata } from "next";
import { PaymentsPageView } from "@/components/finance/payments-page";

export const metadata: Metadata = { title: "Paiements" };

export default function PaymentsPage() {
  return <PaymentsPageView />;
}
