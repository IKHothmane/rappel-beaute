import type { Metadata } from "next";
import { AdminOrganizationsView } from "@/components/admin/admin-organizations";

export const metadata: Metadata = { title: "Instituts" };

export default function OrganizationsPage() {
  return <AdminOrganizationsView />;
}
