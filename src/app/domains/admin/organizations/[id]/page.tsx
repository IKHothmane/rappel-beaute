"use client";

import { Suspense } from "react";
import { OrgAdminDetail } from "@/components/admin/OrgAdminDetail";

export default function OrganizationDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--admin-muted)]">Chargement…</p>}>
      <OrgAdminDetail />
    </Suspense>
  );
}
