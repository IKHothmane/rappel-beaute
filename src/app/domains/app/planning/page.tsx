import type { Metadata } from "next";
import { PlanningPageView } from "@/components/planning/planning-page";

export const metadata: Metadata = { title: "Planning & horaires" };

export default function PlanningPage() {
  return <PlanningPageView />;
}
