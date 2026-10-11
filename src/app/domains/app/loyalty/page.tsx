import { Suspense } from "react";
import { LoyaltyPageView } from "@/components/loyalty/loyalty-page";

export default function LoyaltyPage() {
  return (
    <Suspense>
      <LoyaltyPageView />
    </Suspense>
  );
}
