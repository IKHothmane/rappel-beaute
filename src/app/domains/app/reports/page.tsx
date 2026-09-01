import type { Metadata } from "next";
import { ReportsPageView } from "@/components/reports/reports-page";

export const metadata: Metadata = { title: "Rapports" };

export default function ReportsPage() {
  return <ReportsPageView />;
}
