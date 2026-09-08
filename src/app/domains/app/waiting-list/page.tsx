import type { Metadata } from "next";
import { WaitingListPageView } from "@/components/waiting-list/waiting-list-page";

export const metadata: Metadata = { title: "Liste d'attente" };

export default function WaitingListPage() {
  return <WaitingListPageView />;
}
