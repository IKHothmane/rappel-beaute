import { PublicProductsPage } from "@/components/public-site/PublicProductsPage";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PublicProductsPage slug={slug} />;
}
