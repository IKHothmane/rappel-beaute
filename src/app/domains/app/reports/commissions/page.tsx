import type { Metadata } from "next";
import { CommissionsReportView } from "@/components/commissions/commissions-report";

export const metadata: Metadata = { title: "Rapport commissions" };

export default function CommissionsReportPage() {
  return <CommissionsReportView />;
}
