import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostVisitPageView } from "@/components/post-visit/post-visit-page";
import { isPostVisitUiEnabled } from "@/lib/post-visit/access";

export const metadata: Metadata = { title: "Relances post-prestation" };

export default function PostVisitPage() {
  if (!isPostVisitUiEnabled()) {
    redirect("/dashboard/");
  }
  return <PostVisitPageView />;
}
