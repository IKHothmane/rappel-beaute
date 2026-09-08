import type { Metadata } from "next";
import { PlanningPageView } from "@/components/planning/planning-page";

export const metadata: Metadata = { title: "Planning avancé" };

export default function PlanningPage() {
  return <PlanningPageView />;
}
