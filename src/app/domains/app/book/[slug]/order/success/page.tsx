import { PublicOrderSuccessPage } from "@/components/public-site/PublicOrderSuccessPage";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PublicOrderSuccessPage slug={slug} />;
}
