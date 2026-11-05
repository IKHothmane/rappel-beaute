import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamWorkspace } from "@/components/staff/team-workspace";

export const metadata: Metadata = {
  title: "Équipe & Planning",
};

export default function StaffPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-ink/50">Chargement…</div>}>
      <TeamWorkspace />
    </Suspense>
  );
}
