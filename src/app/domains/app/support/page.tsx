import type { Metadata } from "next";
import { SupportPageView } from "@/components/support/support-page";

export const metadata: Metadata = { title: "Aide & Support" };

export default function SupportPage() {
  return <SupportPageView />;
}
