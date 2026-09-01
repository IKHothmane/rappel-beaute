import type { Metadata } from "next";
import { AgendaPage } from "@/components/agenda/agenda-page";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return <AgendaPage />;
}
