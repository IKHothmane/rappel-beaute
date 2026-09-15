import type { Metadata } from "next";
import { ReviewsPageView } from "@/components/reviews/reviews-page";

export const metadata: Metadata = { title: "Avis & réputation" };

export default function ReviewsPage() {
  return <ReviewsPageView />;
}
