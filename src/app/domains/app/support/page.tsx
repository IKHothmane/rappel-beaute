import type { Metadata } from "next";
import { SupportPageView } from "@/components/support/support-page";

export const metadata: Metadata = { title: "Support & Conciergerie Métier" };

export default function SupportPage() {
  return <SupportPageView />;
}
