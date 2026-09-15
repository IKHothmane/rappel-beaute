import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketingPageView } from "@/components/marketing/marketing-page";

export const metadata: Metadata = { title: "Marketing & campagnes" };

export default function MarketingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Chargement…</div>}>
      <MarketingPageView />
    </Suspense>
  );
}
