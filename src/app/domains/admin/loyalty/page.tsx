import type { Metadata } from "next";
import { AdminLoyaltyView } from "@/components/admin/admin-loyalty";

export const metadata: Metadata = { title: "Fidélité" };

export default function AdminLoyaltyPage() {
  return <AdminLoyaltyView />;
}
