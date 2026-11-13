import { redirect } from "next/navigation";
import { absoluteUrl } from "@/lib/seo";

export default function AdminBlogGuidePage({ params }: { params: { slug: string } }) {
  redirect(absoluteUrl(`/blog/${encodeURIComponent(params.slug)}/`));
}
