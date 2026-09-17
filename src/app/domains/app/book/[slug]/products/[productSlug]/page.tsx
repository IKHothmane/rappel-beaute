import { PublicProductDetailPage } from "@/components/public-site/PublicProductDetailPage";

type Props = { params: Promise<{ slug: string; productSlug: string }> };

export default async function Page({ params }: Props) {
  const { slug, productSlug } = await params;
  return <PublicProductDetailPage slug={slug} productSlug={productSlug} />;
}
