import type { Metadata } from "next";
import { PurchasesPageView } from "@/components/procurement/purchases-page";

export const metadata: Metadata = { title: "Achats" };

export default function PurchasesPage() {
  return <PurchasesPageView />;
}
