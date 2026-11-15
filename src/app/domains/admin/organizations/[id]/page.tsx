import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin/href";

type SearchParams = Record<string, string | string[] | undefined>;

const DETAIL_TABS = new Set(["users", "subscription", "stats"]);

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * L'ancienne fiche détaillée est remplacée par la modale de /organizations/.
 * On conserve ?edit=1 et ?tab=... (liens des actions et du tableau de bord).
 */
export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const target = new URLSearchParams({ institute: id });
  if (first(query.edit) === "1") target.set("edit", "1");
  const tab = first(query.tab);
  if (tab && DETAIL_TABS.has(tab)) target.set("tab", tab);
  redirect(adminHref(`/organizations/?${target.toString()}`));
}
