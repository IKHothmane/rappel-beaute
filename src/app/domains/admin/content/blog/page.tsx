import { redirect } from "next/navigation";
import { absoluteUrl } from "@/lib/seo";
export default function AdminBlogPage() {
  redirect(absoluteUrl("/blog/"));
}
