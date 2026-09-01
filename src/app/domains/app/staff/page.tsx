import type { Metadata } from "next";
import { StaffPageView } from "@/components/staff/staff-page";

export const metadata: Metadata = { title: "Employées" };

export default function StaffPage() {
  return <StaffPageView />;
}
