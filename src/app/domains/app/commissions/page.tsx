import type { Metadata } from "next";
import { CommissionsPageView } from "@/components/commissions/commissions-page";

export const metadata: Metadata = { title: "Commissions" };

export default function CommissionsPage() {
  return <CommissionsPageView />;
}
