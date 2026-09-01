import type { Metadata } from "next";
import { ServicesPageView } from "@/components/services/services-page";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return <ServicesPageView />;
}
