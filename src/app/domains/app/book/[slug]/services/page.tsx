import { permanentRedirect } from "next/navigation";

export default async function RemovedPublicServicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/book/${encodeURIComponent(slug)}/booking/`);
}
