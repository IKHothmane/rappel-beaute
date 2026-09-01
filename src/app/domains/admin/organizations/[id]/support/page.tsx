import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupportPanel } from "@/components/admin/SupportPanel";
import { ORGANIZATIONS, getOrganization } from "@/lib/admin-mock";

type Props = { params: { id: string } };

export function generateStaticParams() {
  return ORGANIZATIONS.map((o) => ({ id: o.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const org = getOrganization(params.id);
  return { title: org ? `Assistance · ${org.name}` : "Assistance" };
}

export default function SupportPage({ params }: Props) {
  const org = getOrganization(params.id);
  if (!org) notFound();
  return <SupportPanel org={org} />;
}
