import type { Metadata } from "next";
import { OrganizationsView } from "@/components/admin/OrganizationsView";

export const metadata: Metadata = { title: "Instituts" };

const DETAIL_TABS = ["users", "subscription", "stats"] as const;

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    institute?: string | string[];
    edit?: string | string[];
    tab?: string | string[];
    q?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const pick = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const institute = pick(query.institute);
  const tab = pick(query.tab);
  return (
    <OrganizationsView
      initialOrganizationId={institute}
      initialEdit={pick(query.edit) === "1"}
      initialTab={DETAIL_TABS.find((t) => t === tab)}
      initialQuery={pick(query.q)?.slice(0, 120)}
    />
  );
}
