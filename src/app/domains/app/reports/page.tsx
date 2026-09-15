import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportsPageView } from "@/components/reports/reports-page";

export const metadata: Metadata = { title: "Rapports & audit" };

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Chargement…</div>}>
      <ReportsPageView />
    </Suspense>
  );
}
