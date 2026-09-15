import { Suspense } from "react";
import type { Metadata } from "next";
import { LoyaltyPageView } from "@/components/loyalty/loyalty-page";

export const metadata: Metadata = { title: "Programme fidélité" };

export default function LoyaltyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Chargement…</div>}>
      <LoyaltyPageView />
    </Suspense>
  );
}
