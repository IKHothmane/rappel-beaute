import type { Metadata } from "next";
import { AdminAdsAgentView } from "@/components/admin/admin-ads-agent";

export const metadata: Metadata = { title: "Agent Ads IA" };

export default function AdminAdsPage() {
  return <AdminAdsAgentView />;
}
