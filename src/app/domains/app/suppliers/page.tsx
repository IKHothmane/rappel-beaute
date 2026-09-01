import type { Metadata } from "next";
import { SuppliersPageView } from "@/components/procurement/suppliers-page";

export const metadata: Metadata = { title: "Fournisseurs" };

export default function SuppliersPage() {
  return <SuppliersPageView />;
}
