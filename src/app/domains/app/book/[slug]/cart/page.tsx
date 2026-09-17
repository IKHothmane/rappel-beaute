import { PublicCartPage } from "@/components/public-site/PublicCartPage";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PublicCartPage slug={slug} />;
}
