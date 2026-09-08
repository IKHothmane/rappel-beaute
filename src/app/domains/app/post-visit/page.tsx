import type { Metadata } from "next";
import { PostVisitPageView } from "@/components/post-visit/post-visit-page";

export const metadata: Metadata = { title: "Relances post-prestation" };

export default function PostVisitPage() {
  return <PostVisitPageView />;
}
