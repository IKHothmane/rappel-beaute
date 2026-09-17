import { notFound } from "next/navigation";
import { PublicSiteProviders } from "@/components/public-site/PublicSiteProviders";
import { resolveOrganizationBySlug } from "@/lib/db/public-booking";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function PublicBookLayout({ children, params }: Props) {
  const { slug } = await params;
  const org = await resolveOrganizationBySlug(slug);
  if (!org) notFound();

  return <PublicSiteProviders org={org}>{children}</PublicSiteProviders>;
}
