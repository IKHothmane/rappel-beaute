import type { Metadata } from "next";
import { Suspense } from "react";
import { PromotionsPageView } from "@/components/promo/promotions-page";

export const metadata: Metadata = { title: "Promotions & offres" };

export default function PromotionsPage() {
  return (
    <Suspense fallback={null}>
      <PromotionsPageView />
    </Suspense>
  );
}
