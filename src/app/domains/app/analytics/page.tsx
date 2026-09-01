import type { Metadata } from "next";
import { AnalyticsPageView } from "@/components/analytics/analytics-page";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return <AnalyticsPageView />;
}
