import { notFound } from "next/navigation";
import { PublicSiteProviders } from "@/components/public-site/PublicSiteProviders";
import { resolveOrganizationBySlug } from "@/lib/db/public-booking";
import { scopedPage } from "@/lib/http/route-scope";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default scopedPage("public", async function PublicBookLayout({ children, params }: Props) {
  const { slug } = await params;
  const org = await resolveOrganizationBySlug(slug);
  if (!org) notFound();

  return <PublicSiteProviders org={org}>{children}</PublicSiteProviders>;
});
