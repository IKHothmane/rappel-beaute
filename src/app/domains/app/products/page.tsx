import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsStockPage } from "@/components/inventory/products-stock-page";

export const metadata: Metadata = {
  title: "Produits & Stock",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Chargement…</div>}>
      <ProductsStockPage />
    </Suspense>
  );
}
