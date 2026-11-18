import { Suspense } from "react";
import { LoyaltyPageView } from "@/components/loyalty/loyalty-page";
import { isLoyaltyMergeEnabled } from "@/lib/loyalty/merge";

export const dynamic = "force-dynamic";

export default function LoyaltyPage() {
  return (
    <Suspense>
      <LoyaltyPageView mergeEnabled={isLoyaltyMergeEnabled()} />
    </Suspense>
  );
}
