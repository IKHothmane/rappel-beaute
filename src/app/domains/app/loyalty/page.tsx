import { Suspense } from "react";
import { LoyaltyPageView } from "@/components/loyalty/loyalty-page";
import { LoyaltyScanPage } from "@/components/loyalty/loyalty-scan-page";

export default function LoyaltyPage() {
  return (
    <>
      <LoyaltyScanPage />
      <Suspense>
        <LoyaltyPageView />
      </Suspense>
    </>
  );
}
