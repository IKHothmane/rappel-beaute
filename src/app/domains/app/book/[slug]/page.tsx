import { redirect } from "next/navigation";
import { PublicHomePage } from "@/components/public-site/PublicHomePage";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    service?: string;
    staff?: string;
    source?: string;
  }>;
};

export default async function PublicBookHomePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  // Liens QR / deep-links → parcours réservation
  if (sp.service || sp.staff || sp.source === "qr") {
    const q = new URLSearchParams();
    if (sp.service) q.set("service", sp.service);
    if (sp.staff) q.set("staff", sp.staff);
    if (sp.source) q.set("source", sp.source);
    const qs = q.toString();
    redirect(`/book/${encodeURIComponent(slug)}/booking/${qs ? `?${qs}` : ""}`);
  }

  return <PublicHomePage slug={slug} />;
}
