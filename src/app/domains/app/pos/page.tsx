import type { Metadata } from "next";
import { PosPageView } from "@/components/pos/pos-page";

export const metadata: Metadata = { title: "POS Produits" };

export default function PosPage() {
  return <PosPageView />;
}
