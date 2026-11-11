import type { Metadata } from "next";
import { OrganizationsView } from "@/components/admin/OrganizationsView";

export const metadata: Metadata = { title: "Instituts" };

export default function OrganizationsPage() {
  return <OrganizationsView />;
}
