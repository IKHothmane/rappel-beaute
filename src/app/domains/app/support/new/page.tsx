import type { Metadata } from "next";
import { SupportNewView } from "@/components/support/support-new";

export const metadata: Metadata = { title: "Nouvelle demande" };

export default function SupportNewPage() {
  return <SupportNewView />;
}
