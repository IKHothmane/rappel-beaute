import type { Metadata } from "next";
import { ResourcesPageView } from "@/components/resources/resources-page";

export const metadata: Metadata = { title: "Ressources" };

export default function ResourcesPage() {
  return <ResourcesPageView />;
}
