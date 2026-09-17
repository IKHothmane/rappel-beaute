import { PublicCheckoutPage } from "@/components/public-site/PublicCheckoutPage";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PublicCheckoutPage slug={slug} />;
}
