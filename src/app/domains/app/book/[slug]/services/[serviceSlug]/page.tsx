import { PublicServiceDetailPage } from "@/components/public-site/PublicServiceDetailPage";

type Props = { params: Promise<{ slug: string; serviceSlug: string }> };

export default async function Page({ params }: Props) {
  const { slug, serviceSlug } = await params;
  return <PublicServiceDetailPage slug={slug} serviceSlug={serviceSlug} />;
}
