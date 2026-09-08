import { BookingPageView } from "@/components/booking/booking-page";
import { parseBookingQrQuery } from "@/lib/booking-qr";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; staff?: string; source?: string }>;
};

export default async function PublicBookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const qr = parseBookingQrQuery(sp);

  return (
    <BookingPageView
      slug={slug}
      initialServiceRef={qr.service}
      initialStaffRef={qr.staff}
      attributionSource={qr.source}
    />
  );
}
