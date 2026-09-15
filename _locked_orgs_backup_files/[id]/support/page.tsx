"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { SupportPanel } from "@/components/admin/SupportPanel";
import { fetchOrganization } from "@/modules/admin/client";
import type { OrganizationDetail } from "@/types/platform";

export default function OrgSupportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchOrganization(id)
      .then((res) => setOrg(res.organization))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [id]);

  if (error && !org) {
    if (error.includes("404") || error.toLowerCase().includes("introuvable")) notFound();
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!org) {
    return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;
  }

  return <SupportPanel org={org} />;
}
