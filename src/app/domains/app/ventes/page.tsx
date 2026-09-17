import type { Metadata } from "next";
import { SalesPageView } from "@/components/pos/sales-page";

export const metadata: Metadata = { title: "Ventes produits" };

export default function VentesPage() {
  return <SalesPageView />;
}
