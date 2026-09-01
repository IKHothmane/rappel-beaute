import type { Metadata } from "next";
import { InventoryPageView } from "@/components/inventory/inventory-page";

export const metadata: Metadata = { title: "Stock" };

/** Alias /stock — même moteur que /inventory */
export default function StockPage() {
  return <InventoryPageView />;
}
