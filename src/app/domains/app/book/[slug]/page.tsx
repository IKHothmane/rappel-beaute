import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; staff?: string; source?: string }>;
};

/** L’accueil public n’est plus un site par institut : tout renvoie vers la réservation. */
export default async function PublicBookHomePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.service) q.set("service", sp.service);
  if (sp.staff) q.set("staff", sp.staff);
  if (sp.source) q.set("source", sp.source);
  const qs = q.toString();
  permanentRedirect(`/book/${encodeURIComponent(slug)}/booking/${qs ? `?${qs}` : ""}`);
}
