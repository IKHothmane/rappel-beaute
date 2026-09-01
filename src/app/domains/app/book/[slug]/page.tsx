import { BookingPageView } from "@/components/booking/booking-page";

export default function PublicBookPage({ params }: { params: { slug: string } }) {
  return <BookingPageView slug={params.slug} />;
}
