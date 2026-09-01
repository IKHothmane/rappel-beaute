import type { Metadata } from "next";
import { ProductsPageView } from "@/components/inventory/products-page";

export const metadata: Metadata = { title: "Produits" };

export default function ProductsPage() {
  return <ProductsPageView />;
}
